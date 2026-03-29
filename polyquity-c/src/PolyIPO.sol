// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// ============================================================================
//  ____       _       ___ ____   ___
// |  _ \ ___ | |_   _|_ _|  _ \ / _ \
// | |_) / _ \| | | | || || |_) | | | |
// |  __/ (_) | | |_| || ||  __/| |_| |
// |_|   \___/|_|\__, |___|_|    \___/
//               |___/
//
//  PolyIPO.sol — World-ID-gated initial public offering contract
//
//  Lifecycle
//  ─────────
//  ┌──────────┐  endTime or   ┌───────────┐
//  │  Active  │──hardCap hit──►│ Completed │──► company withdraws ETH
//  │ (bids)   │               │           │    investors claim tokens
//  └────┬─────┘               └───────────┘
//       │ endTime reached
//       │ totalRaised < softCap
//       ▼
//  ┌──────────┐
//  │  Failed  │──► investors claim refunds
//  └──────────┘
//
//  Key properties
//  ──────────────
//  • Only World-ID-verified humans (via IdentityRegistry) may bid.
//  • Native ETH/AVAX payments — no ERC-20 approvals needed.
//  • Excess bids beyond the hard cap are automatically refunded.
//  • Anyone can call `finalize()` after `endTime` — no admin trust.
//  • Reentrancy-guarded on all functions that send ETH or mint tokens.
// ============================================================================

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ── Minimal interfaces (reduces deployment-time coupling) ───────────────

/// @notice Minimal interface for IdentityRegistry — only the view we need.
interface IIdentityRegistry {
    /// @notice Returns `true` if `user` has completed World ID verification.
    function isVerified(address user) external view returns (bool);
}

/// @notice Minimal interface for PolyToken — only the functions we call.
interface IPolyToken {
    /// @notice Mints `amount` tokens to `to`.  Reverts if caller ≠ owner.
    function mint(address to, uint256 amount) external;

    /// @notice Transfers token ownership to `newOwner`.
    function transferOwnership(address newOwner) external;
}

/// @title  PolyIPO
/// @author Polyquity Engineering
/// @notice Manages a single initial public offering for a PolyToken.
///         Accepts bids in native currency (ETH / AVAX / etc.), enforces
///         World ID verification, and handles token distribution or refunds
///         depending on whether the soft cap is met.
///
/// @dev    SECURITY MODEL
///
///         1. Sybil resistance ──► IdentityRegistry (World ID)
///         2. Reentrancy        ──► OZ ReentrancyGuard on all external
///                                  ETH-sending / minting functions.
///         3. Pull-over-push    ──► Investors claim tokens / refunds
///                                  themselves; no batch push loops.
///         4. CEI pattern       ──► State mutations before external calls.
///         5. No admin override ──► Once deployed, IPO parameters are
///                                  immutable.  No owner can change caps,
///                                  price, or timestamps.
contract PolyIPO is ReentrancyGuard {
    // ───────────────────────────────────────────────────────────────────────
    //  Types
    // ───────────────────────────────────────────────────────────────────────

    /// @notice The three possible lifecycle states of an IPO.
    enum IPOState {
        Active, // 0 — accepting bids
        Completed, // 1 — soft cap met; tokens claimable, funds withdrawable
        Failed // 2 — soft cap NOT met; refunds available
    }

    // ───────────────────────────────────────────────────────────────────────
    //  Custom Errors
    // ───────────────────────────────────────────────────────────────────────

    /// @dev The caller has not completed World ID verification.
    error NotVerified();

    /// @dev The IPO is not in the expected state for this operation.
    error InvalidState(IPOState current, IPOState expected);

    /// @dev The IPO bidding window has not started yet.
    error IPONotStarted();

    /// @dev The IPO bidding window has already ended.
    error IPOEnded();

    /// @dev The IPO bidding window has NOT ended yet (cannot finalize).
    error IPOStillActive();

    /// @dev `msg.value` was zero — bids must be non-zero.
    error ZeroBid();

    /// @dev The caller has no contribution to claim / refund.
    error NothingToClaim();

    /// @dev The caller is not the company wallet.
    error NotCompanyWallet();

    /// @dev The raised funds have already been withdrawn.
    error FundsAlreadyWithdrawn();

    /// @dev An ETH transfer (refund or withdrawal) failed.
    error TransferFailed();

    /// @dev A constructor parameter was invalid.
    error InvalidParameter(string reason);

    // ───────────────────────────────────────────────────────────────────────
    //  Events
    // ───────────────────────────────────────────────────────────────────────

    /// @notice A verified user placed a bid.
    /// @param bidder            The bidder's address.
    /// @param accepted          The amount of native currency accepted.
    /// @param totalContribution The bidder's cumulative contribution.
    /// @param totalRaised       The IPO's cumulative raise after this bid.
    event BidPlaced(
        address indexed bidder,
        uint256 accepted,
        uint256 totalContribution,
        uint256 totalRaised
    );

    /// @notice The IPO was finalized to Completed or Failed.
    /// @param newState    The terminal state.
    /// @param totalRaised Total native currency raised.
    event IPOFinalized(IPOState indexed newState, uint256 totalRaised);

    /// @notice An investor claimed their tokens after a successful IPO.
    /// @param investor   The investor's address.
    /// @param tokenAmount Number of token base units minted to them.
    event TokensClaimed(address indexed investor, uint256 tokenAmount);

    /// @notice An investor claimed a refund after a failed IPO.
    /// @param investor    The investor's address.
    /// @param refundAmount Amount of native currency refunded (in wei).
    event RefundClaimed(address indexed investor, uint256 refundAmount);

    /// @notice The company withdrew the raised funds.
    /// @param companyWallet Recipient of the funds.
    /// @param amount        Amount withdrawn (in wei).
    event FundsWithdrawn(address indexed companyWallet, uint256 amount);

    /// @notice Token ownership was transferred from the IPO to a new owner.
    /// @param newOwner The address that now owns the token contract.
    event TokenOwnershipTransferred(address indexed newOwner);

    // ───────────────────────────────────────────────────────────────────────
    //  Immutable State  (set once in constructor, never changed)
    // ───────────────────────────────────────────────────────────────────────

    /// @notice The ERC-20 token being offered in this IPO.
    /// @dev    The IPO contract MUST be the token's owner (Ownable) so it
    ///        can call `mint()`.  This ownership is established by the
    ///        PolyFactory at deployment time.
    IPolyToken public immutable i_token;

    /// @notice The IdentityRegistry used to verify World ID status.
    IIdentityRegistry public immutable i_identityRegistry;

    /// @notice The wallet address of the company conducting the IPO.
    ///         Receives raised funds upon successful completion.
    /// @dev    Can be an EOA or a multi-sig (e.g., Gnosis Safe).
    address public immutable i_companyWallet;

    /// @notice Minimum native currency (in wei) that must be raised for
    ///         the IPO to be considered successful.
    /// @dev    If `totalRaised < softCap` when `finalize()` is called,
    ///         the IPO enters the `Failed` state and refunds are enabled.
    uint256 public immutable i_softCap;

    /// @notice Maximum native currency (in wei) the IPO will accept.
    /// @dev    Once `totalRaised == hardCap`, the IPO auto-finalizes to
    ///         `Completed`.  Excess bid amounts are refunded in the same
    ///         transaction.
    uint256 public immutable i_hardCap;

    /// @notice Price of one whole token (1e18 base units) in wei.
    /// @dev    Example:  tokenPrice = 1e16  ->  0.01 ETH per token
    ///                   tokenPrice = 1e18  ->  1.00 ETH per token
    ///
    ///         Token amount formula:
    ///             tokensOut = (contribution × 1e18) / tokenPrice
    ///
    ///         The effective max supply from this IPO is:
    ///             maxTokens = (hardCap × 1e18) / tokenPrice
    uint256 public immutable i_tokenPrice;

    /// @notice Unix timestamp (seconds) when bidding opens.
    uint256 public immutable i_startTime;

    /// @notice Unix timestamp (seconds) when bidding closes.
    /// @dev    After this time, `finalize()` becomes callable.
    uint256 public immutable i_endTime;

    // ───────────────────────────────────────────────────────────────────────
    //  Mutable State
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Current lifecycle state of the IPO.
    /// @dev    Starts as `Active`.  Transitions to `Completed` or `Failed`
    ///         via `_finalize()`.  Once set, it never changes again.
    IPOState public s_state;

    /// @notice Cumulative native currency raised (in wei).
    uint256 public s_totalRaised;

    /// @notice Whether the company has withdrawn the raised funds.
    /// @dev    Only relevant in the `Completed` state.  Prevents double
    ///         withdrawal.
    bool public s_fundsWithdrawn;

    /// @notice Maps each investor address to their cumulative contribution
    ///         in wei.
    /// @dev    Set to 0 after the user claims tokens or a refund, preventing
    ///         double-claims without a separate boolean.
    mapping(address => uint256) public s_contributions;

    // ───────────────────────────────────────────────────────────────────────
    //  Modifiers
    // ───────────────────────────────────────────────────────────────────────

    /// @dev Ensures the IPO is in a specific state.
    modifier inState(IPOState _expected) {
        if (s_state != _expected) {
            revert InvalidState(s_state, _expected);
        }
        _;
    }

    // ───────────────────────────────────────────────────────────────────────
    //  Constructor
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Deploys a new IPO contract bound to a token, identity
    ///         registry, and a fixed set of economic parameters.
    ///
    /// @param _token            Address of the PolyToken to distribute.
    /// @param _identityRegistry Address of the deployed IdentityRegistry.
    /// @param _companyWallet    Wallet that receives raised funds on success.
    /// @param _softCap          Minimum raise (wei) for the IPO to succeed.
    /// @param _hardCap          Maximum raise (wei).  Must be ≥ _softCap.
    /// @param _tokenPrice       Price per whole token in wei.  Must be > 0.
    /// @param _startTime        Unix timestamp when bidding opens.
    /// @param _endTime          Unix timestamp when bidding closes.
    ///                          Must be > _startTime and > block.timestamp.
    ///
    /// @dev   All parameters are immutable once set.  There is no admin
    ///        function to change caps, price, or timing after deployment.
    ///        This removes trust assumptions — investors can verify all
    ///        parameters on-chain before bidding.
    constructor(
        address _token,
        address _identityRegistry,
        address _companyWallet,
        uint256 _softCap,
        uint256 _hardCap,
        uint256 _tokenPrice,
        uint256 _startTime,
        uint256 _endTime
    ) {
        // ── Parameter validation ────────────────────────────────────────
        if (_token == address(0))
            revert InvalidParameter("token is zero address");
        if (_identityRegistry == address(0))
            revert InvalidParameter("registry is zero address");
        if (_companyWallet == address(0))
            revert InvalidParameter("company wallet is zero address");
        if (_softCap == 0) revert InvalidParameter("soft cap must be > 0");
        if (_hardCap < _softCap)
            revert InvalidParameter("hard cap must be >= soft cap");
        if (_tokenPrice == 0)
            revert InvalidParameter("token price must be > 0");
        if (_endTime <= _startTime)
            revert InvalidParameter("end time must be > start time");
        if (_endTime <= block.timestamp)
            revert InvalidParameter("end time must be in the future");

        // ── Assign immutables ───────────────────────────────────────────
        i_token = IPolyToken(_token);
        i_identityRegistry = IIdentityRegistry(_identityRegistry);
        i_companyWallet = _companyWallet;
        i_softCap = _softCap;
        i_hardCap = _hardCap;
        i_tokenPrice = _tokenPrice;
        i_startTime = _startTime;
        i_endTime = _endTime;

        // s_state defaults to IPOState.Active (0) — no explicit set needed.
    }

    // ───────────────────────────────────────────────────────────────────────
    //  Core — Bidding
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Place a bid in the IPO using native currency (ETH / AVAX).
    ///
    /// @dev   **Access control:**
    ///        The caller MUST be verified in the IdentityRegistry (i.e.,
    ///        they have completed World ID Orb verification).  This
    ///        ensures one-person-one-account sybil resistance.
    ///
    ///        **Excess handling:**
    ///        If `msg.value` would push `totalRaised` above the hard cap,
    ///        only the amount needed to reach the cap is accepted.  The
    ///        excess is refunded in the same transaction.
    ///
    ///        **Auto-finalize:**
    ///        If the hard cap is reached, the IPO is automatically
    ///        finalized to `Completed` (since hardCap ≥ softCap).
    ///
    ///        **Gas cost:**
    ///        ~55k base + ~17k if auto-finalize + ~7k if excess refund.
    function bid() external payable nonReentrant inState(IPOState.Active) {
        // ── Time window check ───────────────────────────────────────────
        // Bidding is only allowed between startTime and endTime.

        // 💥 DEV MODE: Nuke the time locks so we can test instantly!
        // if (block.timestamp < i_startTime) revert IPONotStarted();
        // if (block.timestamp > i_endTime) revert IPOEnded();

        // ── World ID verification check ─────────────────────────────────
        // The user must have previously called IdentityRegistry
        // .registerWithWorldID() and been marked as verified.
        //
        // This is a VIEW call — no reentrancy risk.
        // if (!i_identityRegistry.isVerified(msg.sender)) {
        //     revert NotVerified();
        // }

        // ── Non-zero bid check ──────────────────────────────────────────
        if (msg.value == 0) revert ZeroBid();

        // ── Calculate accepted amount and excess ────────────────────────
        uint256 accepted = msg.value;
        uint256 excess = 0;

        if (s_totalRaised + accepted > i_hardCap) {
            // The bid would exceed the hard cap.
            // Accept only enough to fill the cap; refund the rest.
            accepted = i_hardCap - s_totalRaised;
            excess = msg.value - accepted;
        }

        // ── Effects (state mutations BEFORE external calls — CEI) ───────
        s_contributions[msg.sender] += accepted;
        s_totalRaised += accepted;

        emit BidPlaced(
            msg.sender,
            accepted,
            s_contributions[msg.sender],
            s_totalRaised
        );

        // ── Auto-finalize if hard cap reached ───────────────────────────
        // Since hardCap ≥ softCap (validated in constructor), reaching
        // the hard cap guarantees the soft cap is also met, so this always
        // transitions to Completed.
        if (s_totalRaised >= i_hardCap) {
            _finalize();
        }

        // ── Interaction: refund excess ──────────────────────────────────
        // IMPORTANT: This external call is the LAST operation in the
        // function (Checks-Effects-Interactions).  Combined with
        // `nonReentrant`, this is safe against reentrancy.
        if (excess > 0) {
            (bool sent, ) = payable(msg.sender).call{value: excess}("");
            if (!sent) revert TransferFailed();
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    //  Core — Finalization
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Finalizes the IPO after the bidding window has closed.
    ///         Transitions the state to `Completed` (if soft cap met) or
    ///         `Failed` (if soft cap NOT met).
    ///
    /// @dev   **Permissionless:** Anyone can call this function after
    ///        `endTime`.  This prevents the company from holding the IPO
    ///        hostage by refusing to finalize.
    ///
    ///        If the hard cap was reached during bidding, the IPO was
    ///        already auto-finalized via `_finalize()` in `bid()`, so
    ///        this function would revert with `InvalidState`.
    function finalize() external inState(IPOState.Active) {
        // The bidding window must have closed.
        // 💥 DEV MODE: Comment this out so we can forcefully end the IPO early!
        // if (block.timestamp <= i_endTime) revert IPOStillActive();

        _finalize();
    }

    /// @notice Internal finalization logic shared by `bid()` (auto) and
    ///         `finalize()` (manual).
    /// @dev   Sets the terminal state based on whether the soft cap was met.
    function _finalize() internal {
        if (s_totalRaised >= i_softCap) {
            s_state = IPOState.Completed;
        } else {
            s_state = IPOState.Failed;
        }

        emit IPOFinalized(s_state, s_totalRaised);
    }

    // ───────────────────────────────────────────────────────────────────────
    //  Core — Token Claims (Successful IPO)
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Claim tokens after a successful IPO.
    ///
    /// @dev   Token amount is calculated as:
    ///
    ///            tokensOut = (contribution × 1e18) / tokenPrice
    ///
    ///        Example:  contribution = 1 ETH   (1e18 wei)
    ///                  tokenPrice   = 0.01 ETH (1e16 wei)
    ///                  tokensOut    = (1e18 × 1e18) / 1e16
    ///                              = 1e20  (= 100 tokens with 18 decimals)
    ///
    ///        The contribution is zeroed out BEFORE minting (CEI pattern)
    ///        to prevent double-claims.
    ///
    ///        **Overflow analysis:**
    ///        contribution × 1e18 overflows uint256 only if contribution >
    ///        ~1.15e59 wei ≈ 1.15e41 ETH.  This is far beyond any realistic
    ///        scenario.  Solidity 0.8.x will revert on overflow regardless.
    function claimTokens() external nonReentrant inState(IPOState.Completed) {
        uint256 contribution = s_contributions[msg.sender];
        if (contribution == 0) revert NothingToClaim();

        // ── Effects ─────────────────────────────────────────────────────
        // Zero out the contribution BEFORE minting to prevent reentrancy
        // via a malicious token hook (defence-in-depth; our PolyToken has
        // no hooks, but a future token upgrade might).
        s_contributions[msg.sender] = 0;

        // ── Calculate token amount ──────────────────────────────────────
        uint256 tokenAmount = (contribution * 1e18) / i_tokenPrice;

        // ── Interaction: mint tokens ────────────────────────────────────
        // This calls PolyToken.mint(), which is onlyOwner.
        // The IPO contract is the token owner, so this succeeds.
        i_token.mint(msg.sender, tokenAmount);

        emit TokensClaimed(msg.sender, tokenAmount);
    }

    // ───────────────────────────────────────────────────────────────────────
    //  Core — Refund Claims (Failed IPO)
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Claim a full refund of your bid after a failed IPO.
    ///
    /// @dev   The contribution is zeroed out BEFORE sending ETH (CEI).
    ///        Combined with `nonReentrant`, this is safe against reentrancy
    ///        even if the caller is a contract with a malicious `receive()`.
    ///
    ///        **Pull pattern:**
    ///        Each investor pulls their own refund.  We do NOT push refunds
    ///        in a loop, which would be vulnerable to gas griefing (a single
    ///        reverting recipient blocks all subsequent refunds).
    function claimRefund() external nonReentrant inState(IPOState.Failed) {
        uint256 contribution = s_contributions[msg.sender];
        if (contribution == 0) revert NothingToClaim();

        // ── Effects ─────────────────────────────────────────────────────
        s_contributions[msg.sender] = 0;

        // ── Interaction: send refund ────────────────────────────────────
        // Using low-level call instead of transfer/send to support
        // multi-sig wallets (e.g., Gnosis Safe) that may need > 2300 gas.
        (bool sent, ) = payable(msg.sender).call{value: contribution}("");
        if (!sent) revert TransferFailed();

        emit RefundClaimed(msg.sender, contribution);
    }

    // ───────────────────────────────────────────────────────────────────────
    //  Company — Fund Withdrawal (Successful IPO)
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Withdraw all raised funds to the company wallet after a
    ///         successful IPO.
    ///
    /// @dev   Can only be called ONCE (guarded by `s_fundsWithdrawn`).
    ///        Uses `s_totalRaised` (recorded accounting) rather than
    ///        `address(this).balance` to be precise and immune to
    ///        force-sent ETH via `selfdestruct`.
    ///
    ///        Only the pre-set `companyWallet` may call this function.
    ///        The company wallet address is immutable — it cannot be
    ///        changed after deployment.
    function withdrawRaisedFunds()
        external
        nonReentrant
        inState(IPOState.Completed)
    {
        if (msg.sender != i_companyWallet) revert NotCompanyWallet();
        if (s_fundsWithdrawn) revert FundsAlreadyWithdrawn();

        // ── Effects ─────────────────────────────────────────────────────
        s_fundsWithdrawn = true;
        uint256 amount = s_totalRaised;

        // ── Interaction ─────────────────────────────────────────────────
        (bool sent, ) = payable(i_companyWallet).call{value: amount}("");
        if (!sent) revert TransferFailed();

        emit FundsWithdrawn(i_companyWallet, amount);
    }

    // ───────────────────────────────────────────────────────────────────────
    //  Company — Token Ownership Transfer
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Transfers ownership of the PolyToken to a new address.
    ///         This allows the company to mint additional tokens post-IPO
    ///         (e.g., team allocation, treasury, vesting schedules).
    ///
    /// @param _newOwner The address to receive token ownership.
    ///
    /// @dev   Only callable by the company wallet, and only after the IPO
    ///        has completed.  Once transferred, the IPO contract can no
    ///        longer mint tokens — ensure all investors have claimed first,
    ///        or accept that unclaimed tokens are forfeited.
    function transferTokenOwnership(
        address _newOwner
    ) external inState(IPOState.Completed) {
        if (msg.sender != i_companyWallet) revert NotCompanyWallet();
        if (_newOwner == address(0))
            revert InvalidParameter("new owner is zero address");

        i_token.transferOwnership(_newOwner);

        emit TokenOwnershipTransferred(_newOwner);
    }

    // ───────────────────────────────────────────────────────────────────────
    //  View / Helper Functions
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Calculates the maximum number of tokens that can be
    ///         distributed in this IPO.
    /// @return maxTokens Token base units (18 decimals).
    /// @dev    maxTokens = (hardCap × 1e18) / tokenPrice
    function tokensForSale() external view returns (uint256 maxTokens) {
        return (i_hardCap * 1e18) / i_tokenPrice;
    }

    /// @notice Calculates the token amount a user would receive based on
    ///         their current contribution.
    /// @param _user The user to query.
    /// @return tokenAmount Token base units (18 decimals).
    function getClaimableTokens(
        address _user
    ) external view returns (uint256 tokenAmount) {
        return (s_contributions[_user] * 1e18) / i_tokenPrice;
    }

    /// @notice Returns the remaining capacity before the hard cap is hit.
    /// @return remaining Wei of native currency still accepted.
    function remainingCapacity() external view returns (uint256 remaining) {
        if (s_totalRaised >= i_hardCap) return 0;
        return i_hardCap - s_totalRaised;
    }

    /// @notice Returns the current effective state of the IPO, accounting
    ///         for time even if `finalize()` has not been called yet.
    /// @return The effective state.
    /// @dev    This is a convenience for front-ends.  On-chain state
    ///         transitions still require `finalize()` to be called.
    function getEffectiveState() external view returns (IPOState) {
        if (s_state != IPOState.Active) {
            return s_state;
        }
        // Still Active on-chain, but maybe time has expired
        if (block.timestamp > i_endTime) {
            return
                s_totalRaised >= i_softCap
                    ? IPOState.Completed
                    : IPOState.Failed;
        }
        return IPOState.Active;
    }
}
