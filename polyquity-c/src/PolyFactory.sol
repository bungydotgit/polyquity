// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================================
//  PolyFactory.sol — Deploys paired PolyToken + PolyIPO contracts
// ============================================================================

import {PolyToken} from "./PolyToken.sol";
import {PolyIPO} from "./PolyIPO.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title  PolyFactory
/// @author Polyquity Engineering
/// @notice Factory contract for launching new IPOs on the Polyquity platform.
///         Companies call `createIPO()` with their economic parameters and
///         an IPFS CID pointing to their prospectus document.
///
/// @dev    Uses a `CreateIPOParams` struct to avoid "stack too deep" errors
///         that arise when passing many individual arguments through the
///         legacy Solidity compiler pipeline.
contract PolyFactory is Ownable {
    // ───────────────────────────────────────────────────────────────────────
    //  Types
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Bundles all parameters required to create a new IPO.
    /// @dev    Using a struct reduces stack depth from 9 parameters to 1,
    ///         which avoids the "Stack too deep" compiler error without
    ///         needing the slower `--via-ir` pipeline.
    struct CreateIPOParams {
        /// @notice ERC-20 name for the new token (e.g. "Acme Corp").
        string tokenName;
        /// @notice ERC-20 symbol (e.g. "ACME").
        string tokenSymbol;
        /// @notice Minimum raise in wei for the IPO to succeed.
        uint256 softCap;
        /// @notice Maximum raise in wei.
        uint256 hardCap;
        /// @notice Price of one whole token (1e18 base units) in wei.
        uint256 tokenPrice;
        /// @notice Unix timestamp when bidding opens.
        uint256 startTime;
        /// @notice Unix timestamp when bidding closes.
        uint256 endTime;
        /// @notice Address that receives funds on success.
        address companyWallet;
        /// @notice IPFS CID of the prospectus / offering document.
        string ipfsCID;
    }

    // ───────────────────────────────────────────────────────────────────────
    //  Custom Errors
    // ───────────────────────────────────────────────────────────────────────

    /// @dev The IPFS CID for the prospectus was empty.
    error EmptyIPFSCID();

    /// @dev A constructor/creation parameter was invalid.
    error InvalidCreationParameter(string reason);

    // ───────────────────────────────────────────────────────────────────────
    //  Events
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Emitted when a new IPO is created.
    /// @param ipo           Address of the deployed PolyIPO contract.
    /// @param token         Address of the deployed PolyToken contract.
    /// @param companyWallet Address that will receive raised funds.
    /// @param ipfsCID       IPFS content identifier of the prospectus.
    /// @param tokenName     The ERC-20 name of the token.
    /// @param tokenSymbol   The ERC-20 symbol of the token.
    /// @param softCap       Minimum raise (wei) for success.
    /// @param hardCap       Maximum raise (wei).
    /// @param tokenPrice    Price per whole token (wei).
    /// @param startTime     Unix timestamp when bidding opens.
    /// @param endTime       Unix timestamp when bidding closes.
    event IPOCreated(
        address indexed ipo,
        address indexed token,
        address indexed companyWallet,
        string  ipfsCID,
        string  tokenName,
        string  tokenSymbol,
        uint256 softCap,
        uint256 hardCap,
        uint256 tokenPrice,
        uint256 startTime,
        uint256 endTime
    );

    // ───────────────────────────────────────────────────────────────────────
    //  Immutable State
    // ───────────────────────────────────────────────────────────────────────

    /// @notice The IdentityRegistry shared by all IPOs created via this
    ///         factory.
    address public immutable i_identityRegistry;

    // ───────────────────────────────────────────────────────────────────────
    //  Mutable State — IPO Registry
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Ordered list of all IPO contracts deployed by this factory.
    address[] public s_deployedIPOs;

    /// @notice Maps an IPO contract address to its paired token address.
    mapping(address => address) public s_ipoToToken;

    /// @notice Maps a company wallet to the list of IPOs it has launched.
    mapping(address => address[]) public s_companyIPOs;

    // ───────────────────────────────────────────────────────────────────────
    //  Constructor
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Deploys the factory with a reference to the shared
    ///         IdentityRegistry.
    /// @param _identityRegistry Address of the deployed IdentityRegistry.
    /// @param _owner            Address of the factory owner (protocol team).
    constructor(
        address _identityRegistry,
        address _owner
    ) Ownable(_owner) {
        if (_identityRegistry == address(0)) {
            revert InvalidCreationParameter("registry is zero address");
        }
        i_identityRegistry = _identityRegistry;
    }

    // ───────────────────────────────────────────────────────────────────────
    //  Core — IPO Creation
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Deploys a new PolyToken and PolyIPO, links them, and records
    ///         the IPO in the on-chain registry.
    ///
    /// @param params A `CreateIPOParams` struct containing all IPO config.
    ///               See the struct definition for field descriptions.
    ///
    /// @return token Address of the deployed PolyToken.
    /// @return ipo   Address of the deployed PolyIPO.
    ///
    /// @dev   **Why a struct?**
    ///        Passing 9 individual parameters hits the EVM's 16-slot stack
    ///        limit when combined with local variables and the event
    ///        emission.  Bundling into a struct passes a single memory
    ///        pointer on the stack, eliminating the issue without needing
    ///        the slower `--via-ir` compiler pipeline.
    ///
    ///        **Atomicity:** Everything happens in a single transaction.
    ///        If any step reverts, the entire transaction rolls back.
    ///
    ///        **Post-deployment ownership:**
    ///        - PolyToken.owner()  -> PolyIPO address
    ///        - PolyFactory retains NO control over either contract
    function createIPO(
        CreateIPOParams calldata params
    ) external returns (address token, address ipo) {
        // ── Validate factory-level parameters ───────────────────────────
        if (bytes(params.ipfsCID).length == 0) revert EmptyIPFSCID();
        if (bytes(params.tokenName).length == 0) {
            revert InvalidCreationParameter("token name is empty");
        }
        if (bytes(params.tokenSymbol).length == 0) {
            revert InvalidCreationParameter("token symbol is empty");
        }

        // ── Step 1: Deploy the PolyToken ────────────────────────────────
        // Factory is temporary owner so it can transfer to the IPO.
        PolyToken newToken = new PolyToken(
            params.tokenName,
            params.tokenSymbol,
            address(this)
        );
        token = address(newToken);

        // ── Step 2: Deploy the PolyIPO ──────────────────────────────────
        // The IPO constructor validates all economic parameters.
        PolyIPO newIPO = new PolyIPO(
            token,
            i_identityRegistry,
            params.companyWallet,
            params.softCap,
            params.hardCap,
            params.tokenPrice,
            params.startTime,
            params.endTime
        );
        ipo = address(newIPO);

        // ── Step 3: Transfer token ownership to the IPO ─────────────────
        newToken.transferOwnership(ipo);

        // ── Step 4: Record in the on-chain registry ─────────────────────
        s_deployedIPOs.push(ipo);
        s_ipoToToken[ipo] = token;
        s_companyIPOs[params.companyWallet].push(ipo);

        // ── Step 5: Emit the creation event ─────────────────────────────
        emit IPOCreated(
            ipo,
            token,
            params.companyWallet,
            params.ipfsCID,
            params.tokenName,
            params.tokenSymbol,
            params.softCap,
            params.hardCap,
            params.tokenPrice,
            params.startTime,
            params.endTime
        );
    }

    // ───────────────────────────────────────────────────────────────────────
    //  Convenience — Overloaded createIPO with individual parameters
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Convenience wrapper that accepts individual parameters,
    ///         packs them into a `CreateIPOParams` struct, and delegates
    ///         to the struct-based `createIPO()`.
    ///
    /// @dev   This preserves the original function signature so existing
    ///        tests and integrations don't break.  The struct version is
    ///        the canonical implementation; this just adapts the interface.
    function createIPO(
        string calldata _tokenName,
        string calldata _tokenSymbol,
        uint256 _softCap,
        uint256 _hardCap,
        uint256 _tokenPrice,
        uint256 _startTime,
        uint256 _endTime,
        address _companyWallet,
        string calldata _ipfsCID
    ) external returns (address token, address ipo) {
        // Build the struct in memory and delegate.
        // Using `this.createIPO(params)` would be an external call (wastes
        // gas + reentrancy surface), so we inline the logic via the
        // internal helper instead.
        return _createIPOInternal(
            CreateIPOParams({
                tokenName:     _tokenName,
                tokenSymbol:   _tokenSymbol,
                softCap:       _softCap,
                hardCap:       _hardCap,
                tokenPrice:    _tokenPrice,
                startTime:     _startTime,
                endTime:       _endTime,
                companyWallet: _companyWallet,
                ipfsCID:       _ipfsCID
            })
        );
    }

    // ───────────────────────────────────────────────────────────────────────
    //  Internal — Shared implementation
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Internal implementation shared by both public `createIPO`
    ///         entry points.
    /// @dev   Extracting this avoids code duplication between the struct
    ///        and individual-parameter versions.
    function _createIPOInternal(
        CreateIPOParams memory params
    ) internal returns (address token, address ipo) {
        // ── Validate ────────────────────────────────────────────────────
        if (bytes(params.ipfsCID).length == 0) revert EmptyIPFSCID();
        if (bytes(params.tokenName).length == 0) {
            revert InvalidCreationParameter("token name is empty");
        }
        if (bytes(params.tokenSymbol).length == 0) {
            revert InvalidCreationParameter("token symbol is empty");
        }

        // ── Deploy Token ────────────────────────────────────────────────
        PolyToken newToken = new PolyToken(
            params.tokenName,
            params.tokenSymbol,
            address(this)
        );
        token = address(newToken);

        // ── Deploy IPO ──────────────────────────────────────────────────
        PolyIPO newIPO = new PolyIPO(
            token,
            i_identityRegistry,
            params.companyWallet,
            params.softCap,
            params.hardCap,
            params.tokenPrice,
            params.startTime,
            params.endTime
        );
        ipo = address(newIPO);

        // ── Link token -> IPO ───────────────────────────────────────────
        newToken.transferOwnership(ipo);

        // ── Registry bookkeeping ────────────────────────────────────────
        s_deployedIPOs.push(ipo);
        s_ipoToToken[ipo] = token;
        s_companyIPOs[params.companyWallet].push(ipo);

        // ── Event ───────────────────────────────────────────────────────
        emit IPOCreated(
            ipo,
            token,
            params.companyWallet,
            params.ipfsCID,
            params.tokenName,
            params.tokenSymbol,
            params.softCap,
            params.hardCap,
            params.tokenPrice,
            params.startTime,
            params.endTime
        );
    }

    // ───────────────────────────────────────────────────────────────────────
    //  View Functions — Registry Queries
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Returns the total number of IPOs deployed via this factory.
    function getDeployedIPOCount() external view returns (uint256) {
        return s_deployedIPOs.length;
    }

    /// @notice Returns all IPO addresses deployed via this factory.
    function getAllDeployedIPOs() external view returns (address[] memory) {
        return s_deployedIPOs;
    }

    /// @notice Returns all IPO addresses launched by a specific company.
    function getCompanyIPOs(
        address _companyWallet
    ) external view returns (address[] memory) {
        return s_companyIPOs[_companyWallet];
    }

    /// @notice Returns the token address paired with a given IPO.
    function getTokenForIPO(address _ipo) external view returns (address) {
        return s_ipoToToken[_ipo];
    }
}
