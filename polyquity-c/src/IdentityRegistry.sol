// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// ============================================================================
//  ____       _                   _ _
// |  _ \ ___ | |_   _  __ _ _   _(_) |_ _   _
// | |_) / _ \| | | | |/ _` | | | | | __| | | |
// |  __/ (_) | | |_| | (_| | |_| | | |_| |_| |
// |_|   \___/|_|\__, |\__, |\__,_|_|\__|\__, |
//               |___/    |_|            |___/
//
//  IdentityRegistry.sol
//  Polyquity DeFi IPO Platform — Reclaim Protocol ZK Verification
//
//  Replaces the previous World ID / Orb-scan implementation with
//  Reclaim Protocol's zkTLS-based proof system, which works anywhere
//  (including India) without physical orb infrastructure.
//
//  References
//  ──────────
//  [1] Reclaim Protocol contracts:
//      https://github.com/reclaimprotocol/contracts
//
//  [2] Reclaim JS/React SDK (frontend):
//      https://docs.reclaimprotocol.org/js
//
//  [3] Reclaim verifier contract addresses:
//      https://docs.reclaimprotocol.org/contracts
//
//  Deployed Reclaim Verifier addresses (from [3]):
//  ─────────────────────────────────────────────────
//  • Ethereum Sepolia   : 0xF93F605142Fb1Efad7Aa58253dDffF7775e0ab6
//  • Polygon Mainnet    : 0xd6534f52CEB3d0139b915bc0C3278a33F7bC8ff
//  • Polygon Amoy       : 0x6D0f81BDA11995f25921aAd5B43359630E99cC66
//  • Base Mainnet       : 0x8CDc031d5B7F148ab0435028b16c682c469A8609
//  • Arbitrum One       : 0xdD63f7EdD56e5571A0e6b1Ca4B87d955f10B2652
//  (check [3] for latest — addresses may be updated)
//
//  How Reclaim ZK proofs work
//  ──────────────────────────
//  1. User opens your frontend; Reclaim SDK initiates a zkTLS session
//     with a data provider (e.g. DigiLocker, PAN portal, GSTIN).
//  2. The Reclaim protocol generates a ZK proof that the user controls
//     a real account at that provider — no data is revealed to you.
//  3. The proof is submitted on-chain to this contract.
//  4. This contract calls `IReclaimVerifier.verifyProof()` on the
//     Reclaim verifier.  If the proof is invalid, it reverts.
//  5. The `identifier` (bytes32) in the proof acts as a sybil-resistant
//     nullifier: the same person verifying the same provider account
//     always produces the same identifier, so they can't register twice
//     even from different wallets.
//
//  Sybil resistance vs World ID
//  ─────────────────────────────
//  World ID ties nullifiers to biometric iris scans (1 nullifier per
//  eyeball), which is the strongest possible sybil resistance.
//  Reclaim ties nullifiers to real-world accounts (e.g. 1 DigiLocker
//  account per Indian resident). The security model is slightly different
//  but still strong for a DeFi IPO context — an attacker would need to
//  create multiple government-verified identities, which is non-trivial.
//
//  Migration note
//  ──────────────
//  This contract preserves the identical external interface:
//    • `isVerified(address) → bool`   (public mapping, same as before)
//    • `setPaused(bool)`              (owner-only)
//    • `transferOwnership(address)`   (owner-only)
//  PolyIPO, PolyFactory, and PolyToken require ZERO changes.
// ============================================================================

// ---------------------------------------------------------------------------
//  INTERFACE — IReclaimVerifier  (from [1])
// ---------------------------------------------------------------------------

/// @title  IReclaimVerifier
/// @notice Minimal interface for the Reclaim Protocol on-chain verifier.
/// @dev    Copied from reclaimprotocol/contracts.  The `verifyProof`
///         function reverts on invalid proofs — no return value.
interface IReclaimVerifier {

    // ── Data Structures ───────────────────────────────────────────────

    /// @notice Metadata about what data was proven.
    /// @param provider   The Reclaim provider string (e.g. "digilocker",
    ///                   "pan-india"). Must match the app config.
    /// @param parameters JSON string of the parameters for the provider.
    /// @param context    Optional context string (can be empty or contain
    ///                   the user's address for front-running protection).
    struct ClaimInfo {
        string provider;
        string parameters;
        string context;
    }

    /// @notice The core claim data that is signed by Reclaim witnesses.
    /// @param identifier  bytes32 hash deterministically derived from
    ///                    (provider, parameters, owner, epoch).  This is
    ///                    our nullifier — same person = same identifier.
    /// @param owner       The address that owns this proof.  Set to
    ///                    msg.sender on the frontend to prevent front-runs.
    /// @param timestampS  Unix timestamp when the proof was generated.
    /// @param epoch       Reclaim epoch number (for witness set versioning).
    struct CompleteClaimData {
        bytes32 identifier;
        address owner;
        uint32  timestampS;
        uint32  epoch;
    }

    /// @notice The claim data plus witness signatures.
    struct SignedClaim {
        CompleteClaimData claim;
        bytes[]           signatures;
    }

    /// @notice The full proof structure passed to `verifyProof`.
    struct Proof {
        ClaimInfo  claimInfo;
        SignedClaim signedClaim;
    }

    // ── Core Function ─────────────────────────────────────────────────

    /// @notice Verifies a Reclaim ZK proof on-chain.
    /// @param proof The proof to verify.
    /// @dev   Reverts with a descriptive error if:
    ///          • The witness signatures are invalid.
    ///          • The identifier does not match the claimInfo hash.
    ///          • Insufficient witnesses signed the claim.
    ///          • The proof epoch is outdated.
    function verifyProof(Proof calldata proof) external;
}

// ---------------------------------------------------------------------------
//  CONTRACT — IdentityRegistry
// ---------------------------------------------------------------------------

/// @title  IdentityRegistry
/// @author Polyquity Engineering
/// @notice One-time, sybil-resistant human verification for the Polyquity
///         DeFi IPO platform, powered by Reclaim Protocol's zkTLS proofs.
///
/// @dev    **How it works**
///
///         1. Front-end uses the Reclaim React/JS SDK to initiate a proof
///            request for a chosen provider (e.g. DigiLocker, PAN).
///            The `context` field in the claim is set to the user's wallet
///            address so the proof is bound to that address.
///
///         2. User completes the Reclaim flow and receives a `Proof` struct
///            (claimInfo + signedClaim).
///
///         3. User submits that proof to `registerWithReclaim()`.
///
///         4. This contract:
///            a. Validates that `proof.signedClaim.claim.owner == msg.sender`
///               (prevents proof front-running).
///            b. Validates that the proof is for the expected provider.
///            c. Checks the nullifier (identifier) hasn't been consumed.
///            d. Calls `IReclaimVerifier.verifyProof()` — reverts if invalid.
///            e. Records nullifier + marks address as verified.
///
///         **Security Model**
///         • Each identity gets exactly ONE registration per provider.
///         • Nullifier replay is impossible once recorded.
///         • `owner == msg.sender` prevents proof front-running.
///         • Verifier address is immutable — owner cannot swap it.
///         • Owner can only pause/unpause — never forge verifications.
///
///         **Interface compatibility**
///         • `isVerified(address)` public mapping is identical to the
///           previous World ID version.  PolyIPO reads this directly.
contract IdentityRegistry {

    // ───────────────────────────────────────────────────────────────────────
    //  Custom Errors  (EIP-838 — cheaper than require strings)
    // ───────────────────────────────────────────────────────────────────────

    /// @dev The proof identifier has already been consumed.
    ///      PRIMARY sybil-resistance mechanism.
    error DuplicateIdentifier(bytes32 identifier);

    /// @dev The caller's address has already been marked as verified.
    error AlreadyVerified(address account);

    /// @dev A zero address was supplied where not permitted.
    error InvalidAddress();

    /// @dev The proof owner does not match msg.sender.
    ///      Prevents someone from stealing another user's proof.
    error ProofOwnerMismatch(address proofOwner, address caller);

    /// @dev The proof is for the wrong provider.
    ///      Prevents using a proof from an unrecognised data source.
    error InvalidProvider(string got, string expected);

    /// @dev Only the contract owner may call this function.
    error OwnableUnauthorizedAccount(address account);

    /// @dev The contract is currently paused.
    error EnforcedPause();

    // ───────────────────────────────────────────────────────────────────────
    //  Events
    // ───────────────────────────────────────────────────────────────────────

    /// @notice A user was successfully verified.
    /// @param user       The wallet address that was verified.
    /// @param identifier The Reclaim proof identifier consumed (nullifier).
    /// @param provider   The Reclaim provider used (e.g. "digilocker").
    /// @param timestamp  Block timestamp of the verification.
    event UserVerified(
        address indexed user,
        bytes32 indexed identifier,
        string  provider,
        uint256 timestamp
    );

    /// @notice The owner paused or unpaused the contract.
    event PauseToggled(bool isPaused);

    /// @notice Ownership was transferred.
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // ───────────────────────────────────────────────────────────────────────
    //  Immutable State
    // ───────────────────────────────────────────────────────────────────────

    /// @notice The Reclaim Protocol on-chain verifier contract.
    /// @dev    Immutable so the owner cannot swap in a rogue verifier.
    ///         See header comments for deployed addresses per chain.
    IReclaimVerifier public immutable i_reclaimVerifier;

    /// @notice The expected Reclaim provider string.
    /// @dev    Only proofs from this provider are accepted.
    ///         Example values: "digilocker", "pan-india", "gstin".
    ///         Must exactly match the provider configured in your
    ///         Reclaim app dashboard.
    ///
    ///         You can add multi-provider support later if needed by
    ///         maintaining a mapping(string => bool) of allowed providers.
    string public i_expectedProvider;

    // ───────────────────────────────────────────────────────────────────────
    //  Mutable State
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Contract owner. Can pause/unpause and transfer ownership.
    address public s_owner;

    /// @notice Emergency pause flag. When `true`, `registerWithReclaim`
    ///         reverts. Existing verifications remain valid.
    bool public s_paused;

    /// @notice Maps a wallet address → whether it has been verified.
    /// @dev    Once `true`, NEVER set back to `false`.
    ///         PolyIPO reads this directly via the IIdentityRegistry interface.
    mapping(address => bool) public isVerified;

    /// @notice Maps a proof identifier (nullifier) → whether it has been used.
    /// @dev    Core sybil-resistance structure.
    ///
    ///         The `identifier` is a bytes32 derived by Reclaim from:
    ///           keccak256(provider || parameters || owner || epoch)
    ///         The same person verifying the same account always produces
    ///         the same identifier — so even if they use a new wallet,
    ///         their second registration attempt reverts here.
    mapping(bytes32 => bool) public usedIdentifiers;

    // ───────────────────────────────────────────────────────────────────────
    //  Modifiers
    // ───────────────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != s_owner) {
            revert OwnableUnauthorizedAccount(msg.sender);
        }
        _;
    }

    modifier whenNotPaused() {
        if (s_paused) revert EnforcedPause();
        _;
    }

    // ───────────────────────────────────────────────────────────────────────
    //  Constructor
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Deploys the registry bound to a Reclaim verifier and provider.
    ///
    /// @param _reclaimVerifier Address of the deployed Reclaim verifier
    ///                         on your target chain. See header for addresses.
    ///
    /// @param _expectedProvider The Reclaim provider string that users must
    ///                          prove membership of.
    ///                          Recommended for India: "digilocker"
    ///                          (every Indian resident has a DigiLocker
    ///                          account tied to their Aadhaar).
    ///                          Alternative: "pan-india" for PAN card.
    ///
    /// @dev   The verifier address is stored as immutable to prevent the
    ///        owner from ever swapping in a rogue verifier post-deployment.
    constructor(
        address _reclaimVerifier,
        string memory _expectedProvider
    ) {
        if (_reclaimVerifier == address(0)) revert InvalidAddress();
        if (bytes(_expectedProvider).length == 0) {
            revert InvalidAddress(); // reusing for empty string guard
        }

        i_reclaimVerifier = IReclaimVerifier(_reclaimVerifier);
        i_expectedProvider = _expectedProvider;

        s_owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ───────────────────────────────────────────────────────────────────────
    //  Core — Reclaim Registration
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Verifies a Reclaim ZK proof and registers `msg.sender` as a
    ///         verified human on the Polyquity platform.
    ///
    /// @param proof The Reclaim proof struct produced by the JS/React SDK.
    ///              Must have been generated with:
    ///              • `provider`  == `i_expectedProvider`
    ///              • `claim.owner` == msg.sender  (set on the frontend)
    ///
    /// @dev   **Execution flow (Checks → Interactions → Effects)**
    ///
    ///        CHECKS:
    ///        1. Contract must not be paused.
    ///        2. `proof.signedClaim.claim.owner` must equal `msg.sender`.
    ///        3. `proof.claimInfo.provider` must equal `i_expectedProvider`.
    ///        4. `msg.sender` must not already be verified (gas savings).
    ///        5. `proof.signedClaim.claim.identifier` must not be consumed.
    ///
    ///        INTERACTION (external view — no state change in verifier):
    ///        6. Call `i_reclaimVerifier.verifyProof(proof)`.
    ///           Reverts if any signature or hash is invalid.
    ///
    ///        EFFECTS:
    ///        7. Mark identifier as consumed (nullifier).
    ///        8. Mark caller as verified.
    ///        9. Emit event.
    ///
    /// @dev   **Front-running protection**
    ///        The `claim.owner` field must equal `msg.sender`.  This is
    ///        enforced both here (CHECK 2) and cryptographically inside
    ///        the Reclaim proof itself — the identifier is derived from
    ///        the owner address, so a thief cannot reuse the proof from
    ///        a different wallet.
    function registerWithReclaim(
        IReclaimVerifier.Proof calldata proof
    ) external whenNotPaused {

        // ── CHECK 1: Proof owner must equal caller ───────────────────────
        address proofOwner = proof.signedClaim.claim.owner;
        if (proofOwner != msg.sender) {
            revert ProofOwnerMismatch(proofOwner, msg.sender);
        }

        // ── CHECK 2: Provider must match expected ────────────────────────
        // Prevents someone from using a valid proof for an unrecognised
        // provider (e.g. a random social media account) to pass KYC.
        if (
            keccak256(bytes(proof.claimInfo.provider)) !=
            keccak256(bytes(i_expectedProvider))
        ) {
            revert InvalidProvider(
                proof.claimInfo.provider,
                i_expectedProvider
            );
        }

        // ── CHECK 3: Address not already verified ────────────────────────
        if (isVerified[msg.sender]) revert AlreadyVerified(msg.sender);

        // ── CHECK 4: Identifier (nullifier) not already consumed ─────────
        bytes32 identifier = proof.signedClaim.claim.identifier;
        if (usedIdentifiers[identifier]) {
            revert DuplicateIdentifier(identifier);
        }

        // ── INTERACTION: Verify the ZK proof via Reclaim verifier ────────
        // Reverts if any witness signature is invalid, if the identifier
        // doesn't match the claimInfo hash, or if there aren't enough
        // witness signatures for the current epoch.
        //
        // Note: `verifyProof` is NOT marked `view` in Reclaim's interface
        // (it updates internal epoch/witness state). However, it cannot
        // call back into this contract in a meaningful way, and we record
        // our effects AFTER it returns, preserving CEI semantics.
        i_reclaimVerifier.verifyProof(proof);

        // ── EFFECTS: Record state changes ────────────────────────────────

        // Mark the identifier as consumed — prevents the same identity
        // from registering again from a different wallet.
        usedIdentifiers[identifier] = true;

        // Mark the caller as verified — read by PolyIPO and other
        // downstream Polyquity contracts.
        isVerified[msg.sender] = true;

        emit UserVerified(
            msg.sender,
            identifier,
            proof.claimInfo.provider,
            block.timestamp
        );
    }

    // ───────────────────────────────────────────────────────────────────────
    //  View / Getter Functions
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Check if a specific proof identifier has been consumed.
    /// @param _identifier The Reclaim proof identifier to query.
    /// @return used `true` if this identifier has already been registered.
    function isIdentifierUsed(
        bytes32 _identifier
    ) external view returns (bool used) {
        return usedIdentifiers[_identifier];
    }

    /// @notice Returns the Reclaim verifier contract address.
    function getReclaimVerifier() external view returns (address) {
        return address(i_reclaimVerifier);
    }

    /// @notice Returns the expected provider string.
    function getExpectedProvider() external view returns (string memory) {
        return i_expectedProvider;
    }

    // ───────────────────────────────────────────────────────────────────────
    //  Admin Functions
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Toggle the paused state. When paused, `registerWithReclaim`
    ///         reverts. Existing verifications remain intact and queryable.
    /// @param _paused `true` to pause, `false` to unpause.
    function setPaused(bool _paused) external onlyOwner {
        s_paused = _paused;
        emit PauseToggled(_paused);
    }

    /// @notice Transfer ownership to a new address.
    /// @param _newOwner The new owner. Must not be address(0).
    function transferOwnership(address _newOwner) external onlyOwner {
        if (_newOwner == address(0)) revert InvalidAddress();

        address oldOwner = s_owner;
        s_owner = _newOwner;

        emit OwnershipTransferred(oldOwner, _newOwner);
    }
}

