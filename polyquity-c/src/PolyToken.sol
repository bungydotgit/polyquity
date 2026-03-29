// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// ============================================================================
//  ____       _       _____     _
// |  _ \ ___ | |_   _|_   _|__ | | _____ _ __
// | |_) / _ \| | | | | | |/ _ \| |/ / _ \ '_ \
// |  __/ (_) | | |_| | | | (_) |   <  __/ | | |
// |_|   \___/|_|\__, | |_|\___/|_|\_\___|_| |_|
//               |___/
//
//  PolyToken.sol — ERC-20 token issued during a Polyquity IPO
//
//  Design rationale
//  ────────────────
//  • Bare-bones ERC-20 with a single privileged `mint()` function.
//  • The owner is expected to be a PolyIPO contract so that tokens are
//    minted on-demand when verified investors call `claimTokens()`.
//  • After the IPO concludes, the company can take token ownership via
//    PolyIPO.transferTokenOwnership() for future governance / vesting.
//  • No cap is enforced at the token level — supply limits are enforced
//    by the IPO contract's hardCap and tokenPrice parameters.
//
//  OpenZeppelin v5.x
//  ──────────────────
//  This contract targets OZ v5 which requires the Ownable constructor to
//  receive an `initialOwner` address.
// ============================================================================

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title  PolyToken
/// @author Polyquity Engineering
/// @notice A mintable ERC-20 token created by the PolyFactory for each new
///         IPO.  Ownership is transferred to the PolyIPO contract at
///         deployment time so only that contract can mint tokens.
contract PolyToken is ERC20, Ownable {
    // ───────────────────────────────────────────────────────────────────────
    //  Constructor
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Deploys a new ERC-20 token with no initial supply.
    /// @param _name         Human-readable token name   (e.g. "Acme Corp").
    /// @param _symbol       Token ticker symbol          (e.g. "ACME").
    /// @param _initialOwner The address that receives the Ownable role.
    ///                      In the Polyquity flow this is the PolyFactory,
    ///                      which immediately transfers ownership to the
    ///                      corresponding PolyIPO contract.
    /// @dev   No tokens are minted in the constructor.  All supply is
    ///        created lazily via `mint()` when investors claim.
    constructor(
        string memory _name,
        string memory _symbol,
        address _initialOwner
    )
        ERC20(_name, _symbol)   // Sets name() and symbol()
        Ownable(_initialOwner)  // OZ v5: explicit initial owner
    {
        // No additional state to initialise.
        // Token decimals default to 18 (ERC20.decimals()).
    }

    // ───────────────────────────────────────────────────────────────────────
    //  Minting
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Creates `_amount` new tokens and assigns them to `_to`.
    /// @param _to     Recipient of the newly minted tokens.
    /// @param _amount Number of token base units to mint (18 decimals).
    ///
    /// @dev   Access control: only the current `owner()` (the PolyIPO
    ///        contract) may call this function.
    ///
    ///        The function deliberately has NO supply cap.  The PolyIPO
    ///        contract enforces the economic cap via:
    ///
    ///            maxTokens = (hardCap × 1e18) / tokenPrice
    ///
    ///        This separation of concerns keeps the token simple and lets
    ///        the company mint additional tokens (team, treasury, vesting)
    ///        after reclaiming ownership post-IPO.
    function mint(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    }
}
