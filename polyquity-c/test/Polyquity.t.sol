// // SPDX-License-Identifier: MIT
// pragma solidity 0.8.28;
//
// // ============================================================================
// //
// //  Polyquity.t.sol — Foundry test suite for the Polyquity DeFi IPO Platform
// //
// //  Primary test: test_HappyPath_FullLifecycle
// //  ──────────────────────────────────────────
// //  Exercises the complete sunny-day flow:
// //
// //    Factory creates IPO -> user mocked as World-ID-verified ->
// //    user bids (hits soft cap) -> IPO finalized -> user claims tokens ->
// //    company withdraws funds
// //
// //  Bonus tests cover critical revert paths and the failed-IPO refund flow.
// //
// //  Run with:
// //    forge test -vvvv --match-contract PolyquityTest
// //
// // ============================================================================
//
// import {Test, console2} from "forge-std/Test.sol";
//
// // ── Source contracts ────────────────────────────────────────────────────────
// import {IdentityRegistry, IWorldID} from "../src/IdentityRegistry.sol";
// import {PolyToken} from "../src/PolyToken.sol";
// import {PolyIPO} from "../src/PolyIPO.sol";
// import {PolyFactory} from "../src/PolyFactory.sol";
//
// /// @title  PolyquityTest
// /// @notice End-to-end integration tests for the Polyquity IPO platform.
// /// @dev    Uses `vm.store` to mock World-ID-verified status in the
// ///         IdentityRegistry without requiring a real ZK proof.  This
// ///         isolates the IPO / Token logic from the World ID verifier,
// ///         which has its own unit tests.
// contract PolyquityTest is Test {
//     // ═══════════════════════════════════════════════════════════════════════
//     //  EVENTS (re-declared here so we can use `vm.expectEmit`)
//     // ═══════════════════════════════════════════════════════════════════════
//
//     /// @dev Mirrors PolyFactory.IPOCreated — only indexed fields needed for
//     ///      topic matching.
//     event IPOCreated(
//         address indexed ipo,
//         address indexed token,
//         address indexed companyWallet,
//         string  ipfsCID,
//         string  tokenName,
//         string  tokenSymbol,
//         uint256 softCap,
//         uint256 hardCap,
//         uint256 tokenPrice,
//         uint256 startTime,
//         uint256 endTime
//     );
//
//     /// @dev Mirrors PolyIPO.BidPlaced.
//     event BidPlaced(
//         address indexed bidder,
//         uint256 accepted,
//         uint256 totalContribution,
//         uint256 totalRaised
//     );
//
//     /// @dev Mirrors PolyIPO.IPOFinalized.
//     event IPOFinalized(
//         PolyIPO.IPOState indexed newState,
//         uint256 totalRaised
//     );
//
//     /// @dev Mirrors PolyIPO.TokensClaimed.
//     event TokensClaimed(address indexed investor, uint256 tokenAmount);
//
//     /// @dev Mirrors PolyIPO.FundsWithdrawn.
//     event FundsWithdrawn(address indexed companyWallet, uint256 amount);
//
//     /// @dev Mirrors PolyIPO.RefundClaimed.
//     event RefundClaimed(address indexed investor, uint256 refundAmount);
//
//     // ═══════════════════════════════════════════════════════════════════════
//     //  CONSTANTS — IPO parameters used across tests
//     // ═══════════════════════════════════════════════════════════════════════
//
//     string  constant TOKEN_NAME   = "Acme Corp";
//     string  constant TOKEN_SYMBOL = "ACME";
//     uint256 constant SOFT_CAP     = 10 ether;
//     uint256 constant HARD_CAP     = 100 ether;
//     uint256 constant TOKEN_PRICE  = 0.01 ether;  // 1e16 wei per whole token
//     string  constant IPFS_CID     = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
//
//     /// @dev The `isVerified` mapping is the THIRD state variable in
//     ///      IdentityRegistry (after `s_owner` and `s_paused` which pack
//     ///      into slot 0).  Therefore, `isVerified` occupies storage slot 1.
//     ///
//     ///      Storage slot for isVerified[user]:
//     ///          keccak256(abi.encode(user, 1))
//     uint256 constant IS_VERIFIED_MAPPING_SLOT = 1;
//
//     // ═══════════════════════════════════════════════════════════════════════
//     //  STATE — deployed contracts and actor addresses
//     // ═══════════════════════════════════════════════════════════════════════
//
//     IdentityRegistry public registry;
//     PolyFactory      public factory;
//
//     // Labeled actor addresses — `makeAddr` produces deterministic, labeled
//     // addresses that show up nicely in Foundry's trace output.
//     address public deployer;
//     address public company;
//     address public investor1;
//     address public investor2;
//     address public outsider;  // uninvolved third party (never verified)
//
//     // Timestamps for the IPO window
//     uint256 public startTime;
//     uint256 public endTime;
//
//     // ═══════════════════════════════════════════════════════════════════════
//     //  SETUP — runs before every test function
//     // ═══════════════════════════════════════════════════════════════════════
//
//     function setUp() public {
//         // ── Create labelled actors ──────────────────────────────────────
//         deployer  = makeAddr("deployer");
//         company   = makeAddr("company");
//         investor1 = makeAddr("investor1");
//         investor2 = makeAddr("investor2");
//         outsider  = makeAddr("outsider");
//
//         // ── Fund actors with native currency ────────────────────────────
//         vm.deal(investor1, 500 ether);
//         vm.deal(investor2, 500 ether);
//
//         // ── Define the IPO bidding window ───────────────────────────────
//         // block.timestamp starts at 1 in Foundry.
//         // Start in 1 hour, end in 7 days.
//         startTime = block.timestamp + 1 hours;
//         endTime   = block.timestamp + 7 days;
//
//         // ── Deploy core infrastructure as deployer ──────────────────────
//         vm.startPrank(deployer);
//
//         // 1. IdentityRegistry — uses a mock World ID address.
//         //    Since we mock `isVerified` via vm.store, the router is never
//         //    actually called.  We just need a non-zero address to pass the
//         //    constructor validation.
//         address mockWorldId = makeAddr("worldIdRouter");
//         registry = new IdentityRegistry(
//             IWorldID(mockWorldId),
//             "app_staging_polyquity_test", // appId (test)
//             "polyquity-verify",           // actionId
//             1                             // groupId: Orb-verified
//         );
//
//         // 2. PolyFactory — linked to the shared IdentityRegistry.
//         factory = new PolyFactory(
//             address(registry),
//             deployer // factory owner
//         );
//
//         vm.stopPrank();
//     }
//
//     // ═══════════════════════════════════════════════════════════════════════
//     //  HELPERS
//     // ═══════════════════════════════════════════════════════════════════════
//
//     /// @notice Mocks a user as World-ID-verified by writing directly to the
//     ///         IdentityRegistry's `isVerified` mapping storage slot.
//     ///
//     /// @dev   For a mapping `mapping(address => bool)` at storage slot `p`,
//     ///        the value for key `k` lives at:
//     ///
//     ///            slot = keccak256(abi.encode(k, p))
//     ///
//     ///        where `abi.encode(k, p)` left-pads both the address and the
//     ///        slot number to 32 bytes and concatenates them (64 bytes total).
//     ///
//     ///        We write `bytes32(uint256(1))` to represent `true`.
//     ///
//     ///        This approach is preferable to deploying a modified registry
//     ///        with a `setVerified()` backdoor because it tests the REAL
//     ///        contract code — only the World ID ZK proof step is bypassed.
//     ///
//     /// @param _user The address to mark as verified.
//     function _mockVerified(address _user) internal {
//         bytes32 slot = keccak256(
//             abi.encode(_user, IS_VERIFIED_MAPPING_SLOT)
//         );
//         vm.store(address(registry), slot, bytes32(uint256(1)));
//
//         // Sanity check — ensure the mock took effect.
//         assertTrue(
//             registry.isVerified(_user),
//             "MOCK FAILED: isVerified should be true after vm.store"
//         );
//     }
//
//     /// @notice Deploys a new IPO via the factory with the default constants.
//     ///         Used by multiple tests to avoid code duplication.
//     ///
//     /// @return token The deployed PolyToken contract.
//     /// @return ipo   The deployed PolyIPO contract.
//     function _createDefaultIPO()
//         internal
//         returns (PolyToken token, PolyIPO ipo)
//     {
//         vm.prank(company);
//         (address tokenAddr, address ipoAddr) = factory.createIPO(
//             TOKEN_NAME,
//             TOKEN_SYMBOL,
//             SOFT_CAP,
//             HARD_CAP,
//             TOKEN_PRICE,
//             startTime,
//             endTime,
//             company,
//             IPFS_CID
//         );
//         token = PolyToken(tokenAddr);
//         ipo   = PolyIPO(ipoAddr);
//     }
//
//     // ═══════════════════════════════════════════════════════════════════════
//     //  MAIN TEST — HAPPY PATH FULL LIFECYCLE
//     // ═══════════════════════════════════════════════════════════════════════
//
//     /// @notice Tests the complete sunny-day lifecycle of a Polyquity IPO:
//     ///
//     ///         1. Factory deploys Token + IPO and links them.
//     ///         2. Investor is mocked as World-ID-verified.
//     ///         3. Investor bids native ETH, reaching the soft cap.
//     ///         4. Time passes; the IPO is finalized as Completed.
//     ///         5. Investor claims their PolyTokens.
//     ///         6. Company withdraws the raised funds.
//     ///
//     ///         Every step includes comprehensive assertions on state,
//     ///         balances, events, and invariants.
//     function test_HappyPath_FullLifecycle() public {
//         // ═══════════════════════════════════════════════════════════════
//         //  STEP 1 — Factory creates the IPO
//         // ═══════════════════════════════════════════════════════════════
//         //
//         //  The factory deploys two new contracts atomically:
//         //    • PolyToken  (ERC-20, initial owner = factory)
//         //    • PolyIPO    (linked to token + registry)
//         //
//         //  Then the factory transfers token ownership to the IPO so only
//         //  the IPO can mint tokens.
//         // ───────────────────────────────────────────────────────────────
//
//         console2.log("");
//         console2.log("=== STEP 1: Factory creates IPO ===");
//
//         // We expect the factory to emit an IPOCreated event.
//         // We check all 3 indexed topics + data.
//         // Since addresses are deterministic in Foundry, we can predict them
//         // by computing CREATE addresses, but it's simpler to just verify
//         // the return values and check the event separately.
//
//         (PolyToken token, PolyIPO ipo) = _createDefaultIPO();
//
//         // ── Token assertions ────────────────────────────────────────────
//         assertEq(
//             token.name(), TOKEN_NAME,
//             "Token name should match constructor param"
//         );
//         assertEq(
//             token.symbol(), TOKEN_SYMBOL,
//             "Token symbol should match constructor param"
//         );
//         assertEq(
//             token.decimals(), 18,
//             "Default ERC-20 decimals should be 18"
//         );
//         assertEq(
//             token.totalSupply(), 0,
//             "No tokens should be minted at deployment"
//         );
//         assertEq(
//             token.owner(), address(ipo),
//             "Token owner should be the IPO contract (factory transferred)"
//         );
//
//         // ── IPO parameter assertions ────────────────────────────────────
//         assertEq(address(ipo.i_token()),            address(token));
//         assertEq(address(ipo.i_identityRegistry()), address(registry));
//         assertEq(ipo.i_companyWallet(),              company);
//         assertEq(ipo.i_softCap(),                    SOFT_CAP);
//         assertEq(ipo.i_hardCap(),                    HARD_CAP);
//         assertEq(ipo.i_tokenPrice(),                 TOKEN_PRICE);
//         assertEq(ipo.i_startTime(),                  startTime);
//         assertEq(ipo.i_endTime(),                    endTime);
//
//         // ── IPO initial state assertions ────────────────────────────────
//         assertEq(
//             uint256(ipo.s_state()),
//             uint256(PolyIPO.IPOState.Active),
//             "IPO should start in Active state"
//         );
//         assertEq(ipo.s_totalRaised(), 0,  "No funds raised yet");
//         assertFalse(ipo.s_fundsWithdrawn(), "Funds not withdrawn yet");
//
//         // ── Factory registry assertions ─────────────────────────────────
//         assertEq(
//             factory.getDeployedIPOCount(), 1,
//             "Factory should have recorded 1 IPO"
//         );
//         assertEq(
//             factory.s_deployedIPOs(0), address(ipo),
//             "First deployed IPO should match"
//         );
//         assertEq(
//             factory.getTokenForIPO(address(ipo)), address(token),
//             "IPO -> Token mapping should be set"
//         );
//
//         address[] memory companyIPOs = factory.getCompanyIPOs(company);
//         assertEq(companyIPOs.length, 1, "Company should have 1 IPO");
//         assertEq(companyIPOs[0], address(ipo));
//
//         // ── View helpers ────────────────────────────────────────────────
//         // tokensForSale = (hardCap * 1e18) / tokenPrice
//         //               = (100e18 * 1e18) / 1e16
//         //               = 10_000e18  (10,000 tokens)
//         uint256 expectedMaxTokens = (HARD_CAP * 1e18) / TOKEN_PRICE;
//         assertEq(ipo.tokensForSale(), expectedMaxTokens);
//         assertEq(ipo.remainingCapacity(), HARD_CAP);
//
//         console2.log("  Token deployed at:", address(token));
//         console2.log("  IPO deployed at:  ", address(ipo));
//         console2.log("  Token owner:      ", token.owner());
//         console2.log("  Max tokens:       ", expectedMaxTokens / 1e18);
//         console2.log("  STEP 1 PASSED");
//
//         // ═══════════════════════════════════════════════════════════════
//         //  STEP 2 — Mock investor as World-ID-verified
//         // ═══════════════════════════════════════════════════════════════
//         //
//         //  In production, the user would:
//         //    1. Open the IDKit widget on the front-end
//         //    2. Scan their iris with the Orb via the World App
//         //    3. Receive a ZK proof
//         //    4. Call IdentityRegistry.registerWithWorldID(proof...)
//         //
//         //  For testing, we bypass this by writing `true` directly into
//         //  the isVerified mapping using Foundry's vm.store cheatcode.
//         // ───────────────────────────────────────────────────────────────
//
//         console2.log("");
//         console2.log("=== STEP 2: Mock investor as verified ===");
//
//         // Before: investor is NOT verified
//         assertFalse(
//             registry.isVerified(investor1),
//             "Investor should NOT be verified before mock"
//         );
//
//         // Mock the verification
//         _mockVerified(investor1);
//
//         // After: investor IS verified
//         assertTrue(
//             registry.isVerified(investor1),
//             "Investor should be verified after mock"
//         );
//
//         // Outsider should still NOT be verified
//         assertFalse(
//             registry.isVerified(outsider),
//             "Outsider should NOT be verified"
//         );
//
//         console2.log("  Investor verified: ", registry.isVerified(investor1));
//         console2.log("  Outsider verified: ", registry.isVerified(outsider));
//         console2.log("  STEP 2 PASSED");
//
//         // ═══════════════════════════════════════════════════════════════
//         //  STEP 3 — Investor places a bid that reaches the soft cap
//         // ═══════════════════════════════════════════════════════════════
//         //
//         //  The investor sends exactly 10 ETH (= SOFT_CAP).
//         //  Since SOFT_CAP < HARD_CAP, the IPO does NOT auto-finalize.
//         //  It remains Active, awaiting either more bids or the endTime.
//         //
//         //  Expected tokens for this bid:
//         //    tokens = (10 ETH × 1e18) / 0.01 ETH
//         //           = (10e18 × 1e18) / 1e16
//         //           = 1,000e18   ->  1,000 tokens
//         // ───────────────────────────────────────────────────────────────
//
//         console2.log("");
//         console2.log("=== STEP 3: Investor places bid ===");
//
//         // Warp to after the start time so bidding is allowed
//         vm.warp(startTime + 1);
//
//         uint256 bidAmount              = SOFT_CAP; // 10 ETH
//         uint256 investorBalanceBefore  = investor1.balance;
//         uint256 ipoBalanceBefore       = address(ipo).balance;
//
//         // Expect the BidPlaced event with exact parameters
//         vm.expectEmit(true, false, false, true, address(ipo));
//         emit BidPlaced(
//             investor1,   // bidder (indexed)
//             bidAmount,   // accepted
//             bidAmount,   // totalContribution (first bid, so == accepted)
//             bidAmount    // totalRaised (first bid, so == accepted)
//         );
//
//         // Place the bid
//         vm.prank(investor1);
//         ipo.bid{value: bidAmount}();
//
//         // ── Contribution assertions ─────────────────────────────────────
//         assertEq(
//             ipo.s_contributions(investor1), bidAmount,
//             "Contribution should be recorded"
//         );
//         assertEq(
//             ipo.s_totalRaised(), bidAmount,
//             "Total raised should equal bid amount"
//         );
//         assertEq(
//             ipo.remainingCapacity(), HARD_CAP - bidAmount,
//             "Remaining capacity should decrease by bid amount"
//         );
//
//         // ── Balance assertions ──────────────────────────────────────────
//         assertEq(
//             investor1.balance,
//             investorBalanceBefore - bidAmount,
//             "Investor balance should decrease by bid amount"
//         );
//         assertEq(
//             address(ipo).balance,
//             ipoBalanceBefore + bidAmount,
//             "IPO contract should hold the bid"
//         );
//
//         // ── State assertion ─────────────────────────────────────────────
//         // Soft cap is met, but hard cap is NOT.
//         // IPO should STILL be Active (auto-finalize only on hard cap).
//         assertEq(
//             uint256(ipo.s_state()),
//             uint256(PolyIPO.IPOState.Active),
//             "IPO should remain Active (softCap met but hardCap not)"
//         );
//
//         // ── View helper assertion ───────────────────────────────────────
//         uint256 expectedClaimable = (bidAmount * 1e18) / TOKEN_PRICE;
//         assertEq(
//             ipo.getClaimableTokens(investor1),
//             expectedClaimable,
//             "Claimable tokens view should return correct amount"
//         );
//
//         // ── Effective state should show Completed hint (for front-end) ──
//         // Even though on-chain state is Active, the effective state
//         // helper should still show Active (endTime not passed yet).
//         assertEq(
//             uint256(ipo.getEffectiveState()),
//             uint256(PolyIPO.IPOState.Active),
//             "Effective state should be Active (endTime not passed)"
//         );
//
//         console2.log("  Bid amount:        ", bidAmount / 1e18, "ETH");
//         console2.log("  Total raised:      ", ipo.s_totalRaised() / 1e18, "ETH");
//         console2.log("  Remaining capacity:", ipo.remainingCapacity() / 1e18, "ETH");
//         console2.log("  Claimable tokens:  ", expectedClaimable / 1e18);
//         console2.log("  STEP 3 PASSED");
//
//         // ═══════════════════════════════════════════════════════════════
//         //  STEP 4 — Time passes, IPO is finalized as Completed
//         // ═══════════════════════════════════════════════════════════════
//         //
//         //  We warp past the endTime.  Since totalRaised (10 ETH) ≥
//         //  softCap (10 ETH), finalization transitions to Completed.
//         //
//         //  finalize() is permissionless — we call it from `outsider`
//         //  to prove that no special privilege is needed.
//         // ───────────────────────────────────────────────────────────────
//
//         console2.log("");
//         console2.log("=== STEP 4: Finalize IPO ===");
//
//         // Warp past the end time
//         vm.warp(endTime + 1);
//
//         // Before finalization: the effective state helper should now
//         // reflect Completed even though the on-chain state is Active.
//         assertEq(
//             uint256(ipo.getEffectiveState()),
//             uint256(PolyIPO.IPOState.Completed),
//             "Effective state should be Completed (endTime passed, softCap met)"
//         );
//
//         // Expect the IPOFinalized event
//         vm.expectEmit(true, false, false, true, address(ipo));
//         emit IPOFinalized(PolyIPO.IPOState.Completed, bidAmount);
//
//         // Anyone can call finalize — using outsider to prove this.
//         vm.prank(outsider);
//         ipo.finalize();
//
//         // ── State assertions ────────────────────────────────────────────
//         assertEq(
//             uint256(ipo.s_state()),
//             uint256(PolyIPO.IPOState.Completed),
//             "IPO state should be Completed"
//         );
//
//         // Verify the success condition held:
//         assertGe(
//             ipo.s_totalRaised(),
//             ipo.i_softCap(),
//             "Total raised should be >= soft cap"
//         );
//
//         console2.log("  Final state:  Completed");
//         console2.log("  Total raised: ", ipo.s_totalRaised() / 1e18, "ETH");
//         console2.log("  Soft cap:     ", ipo.i_softCap() / 1e18, "ETH");
//         console2.log("  STEP 4 PASSED");
//
//         // ═══════════════════════════════════════════════════════════════
//         //  STEP 5 — Investor claims their PolyTokens
//         // ═══════════════════════════════════════════════════════════════
//         //
//         //  Token calculation:
//         //    tokensOut = (contribution × 1e18) / tokenPrice
//         //             = (10e18 × 1e18) / 1e16
//         //             = 1_000e18   ->  1,000 ACME tokens
//         //
//         //  After claiming:
//         //    - investor1's token balance = 1,000 ACME
//         //    - investor1's contribution in IPO = 0 (prevents re-claim)
//         //    - token.totalSupply() = 1,000 ACME (first and only mint)
//         // ───────────────────────────────────────────────────────────────
//
//         console2.log("");
//         console2.log("=== STEP 5: Investor claims tokens ===");
//
//         uint256 expectedTokens = (bidAmount * 1e18) / TOKEN_PRICE;
//
//         // Sanity: 10 ETH at 0.01 ETH/token = 1,000 tokens
//         assertEq(
//             expectedTokens, 1_000e18,
//             "Math check: 10 ETH / 0.01 = 1,000 tokens"
//         );
//
//         // Before claiming
//         assertEq(token.balanceOf(investor1), 0,        "No tokens before claim");
//         assertEq(token.totalSupply(),        0,        "No supply before claim");
//         assertEq(ipo.s_contributions(investor1), bidAmount, "Contribution intact");
//
//         // Expect the TokensClaimed event
//         vm.expectEmit(true, false, false, true, address(ipo));
//         emit TokensClaimed(investor1, expectedTokens);
//
//         // Claim!
//         vm.prank(investor1);
//         ipo.claimTokens();
//
//         // ── Post-claim assertions ───────────────────────────────────────
//         assertEq(
//             token.balanceOf(investor1),
//             expectedTokens,
//             "Investor should hold the correct token amount"
//         );
//         assertEq(
//             token.totalSupply(),
//             expectedTokens,
//             "Total supply should equal minted amount"
//         );
//         assertEq(
//             ipo.s_contributions(investor1), 0,
//             "Contribution should be zeroed (prevents double-claim)"
//         );
//         assertEq(
//             ipo.getClaimableTokens(investor1), 0,
//             "Claimable tokens should be 0 after claiming"
//         );
//
//         console2.log("  Tokens received:", expectedTokens / 1e18, "ACME");
//         console2.log("  Total supply:   ", token.totalSupply() / 1e18, "ACME");
//         console2.log("  STEP 5 PASSED");
//
//         // ═══════════════════════════════════════════════════════════════
//         //  STEP 6 — Company withdraws the raised funds
//         // ═══════════════════════════════════════════════════════════════
//         //
//         //  Only the pre-set companyWallet can withdraw.
//         //  After withdrawal:
//         //    - Company wallet balance increases by totalRaised
//         //    - IPO contract balance drops to 0
//         //    - s_fundsWithdrawn flag is set to true
//         //    - A second withdrawal attempt would revert
//         // ───────────────────────────────────────────────────────────────
//
//         console2.log("");
//         console2.log("=== STEP 6: Company withdraws funds ===");
//
//         uint256 companyBalanceBefore = company.balance;
//         uint256 raisedFunds          = ipo.s_totalRaised();
//
//         assertEq(
//             address(ipo).balance,
//             raisedFunds,
//             "IPO contract should hold all raised funds"
//         );
//         assertFalse(ipo.s_fundsWithdrawn(), "Funds not yet withdrawn");
//
//         // Expect the FundsWithdrawn event
//         vm.expectEmit(true, false, false, true, address(ipo));
//         emit FundsWithdrawn(company, raisedFunds);
//
//         // Withdraw
//         vm.prank(company);
//         ipo.withdrawRaisedFunds();
//
//         // ── Post-withdrawal assertions ──────────────────────────────────
//         assertEq(
//             company.balance,
//             companyBalanceBefore + raisedFunds,
//             "Company should receive all raised funds"
//         );
//         assertEq(
//             address(ipo).balance, 0,
//             "IPO contract should have 0 balance after withdrawal"
//         );
//         assertTrue(
//             ipo.s_fundsWithdrawn(),
//             "fundsWithdrawn flag should be true"
//         );
//
//         console2.log("  Withdrawn:         ", raisedFunds / 1e18, "ETH");
//         console2.log("  Company balance:   ", company.balance / 1e18, "ETH");
//         console2.log("  IPO balance:       ", address(ipo).balance);
//         console2.log("  STEP 6 PASSED");
//
//         // ═══════════════════════════════════════════════════════════════
//         //  FINAL INVARIANT CHECKS
//         // ═══════════════════════════════════════════════════════════════
//
//         console2.log("");
//         console2.log("=== Final invariant checks ===");
//
//         // The IPO should be fully settled:
//         //   - State: Completed
//         //   - All contributions claimed (investor1's contribution = 0)
//         //   - Funds withdrawn
//         //   - Token supply matches what was distributed
//         assertEq(uint256(ipo.s_state()), uint256(PolyIPO.IPOState.Completed));
//         assertEq(ipo.s_contributions(investor1), 0);
//         assertTrue(ipo.s_fundsWithdrawn());
//         assertEq(token.totalSupply(), expectedTokens);
//         assertEq(token.balanceOf(investor1), expectedTokens);
//
//         // Accounting identity: the ETH that entered the IPO contract
//         // was fully disbursed to the company wallet.
//         assertEq(address(ipo).balance, 0);
//
//         console2.log("  All invariants hold.");
//         console2.log("");
//         console2.log("  ==========================================");
//         console2.log("  |  HAPPY PATH LIFECYCLE TEST PASSED  [OK]   |");
//         console2.log("  ==========================================");
//         console2.log("");
//     }
//
//     // ═══════════════════════════════════════════════════════════════════════
//     //  BONUS TESTS — Critical revert paths and edge cases
//     // ═══════════════════════════════════════════════════════════════════════
//
//     /// @notice An unverified user should NOT be able to bid.
//     function test_RevertWhen_UnverifiedUserBids() public {
//         (,PolyIPO ipo) = _createDefaultIPO();
//
//         // Warp into the bidding window
//         vm.warp(startTime + 1);
//
//         // outsider is NOT verified — should revert
//         vm.deal(outsider, 1 ether);
//         vm.prank(outsider);
//         vm.expectRevert(PolyIPO.NotVerified.selector);
//         ipo.bid{value: 1 ether}();
//     }
//
//     /// @notice Bidding before the start time should revert.
//     function test_RevertWhen_BidBeforeStartTime() public {
//         (,PolyIPO ipo) = _createDefaultIPO();
//         _mockVerified(investor1);
//
//         // block.timestamp < startTime  ->  IPONotStarted
//         vm.prank(investor1);
//         vm.expectRevert(PolyIPO.IPONotStarted.selector);
//         ipo.bid{value: 1 ether}();
//     }
//
//     /// @notice Bidding after the end time should revert.
//     function test_RevertWhen_BidAfterEndTime() public {
//         (,PolyIPO ipo) = _createDefaultIPO();
//         _mockVerified(investor1);
//
//         // Warp past endTime
//         vm.warp(endTime + 1);
//
//         vm.prank(investor1);
//         vm.expectRevert(PolyIPO.IPOEnded.selector);
//         ipo.bid{value: 1 ether}();
//     }
//
//     /// @notice Claiming tokens twice should revert on the second attempt.
//     function test_RevertWhen_DoubleClaimTokens() public {
//         (,PolyIPO ipo) = _createDefaultIPO();
//         _mockVerified(investor1);
//
//         // Bid, warp, finalize
//         vm.warp(startTime + 1);
//         vm.prank(investor1);
//         ipo.bid{value: SOFT_CAP}();
//         vm.warp(endTime + 1);
//         vm.prank(outsider);
//         ipo.finalize();
//
//         // First claim — succeeds
//         vm.prank(investor1);
//         ipo.claimTokens();
//
//         // Second claim — reverts (contribution is now 0)
//         vm.prank(investor1);
//         vm.expectRevert(PolyIPO.NothingToClaim.selector);
//         ipo.claimTokens();
//     }
//
//     /// @notice A non-company address should NOT be able to withdraw funds.
//     function test_RevertWhen_NonCompanyWithdraws() public {
//         (,PolyIPO ipo) = _createDefaultIPO();
//         _mockVerified(investor1);
//
//         // Bid, warp, finalize to Completed
//         vm.warp(startTime + 1);
//         vm.prank(investor1);
//         ipo.bid{value: SOFT_CAP}();
//         vm.warp(endTime + 1);
//         vm.prank(outsider);
//         ipo.finalize();
//
//         // outsider tries to withdraw — should revert
//         vm.prank(outsider);
//         vm.expectRevert(PolyIPO.NotCompanyWallet.selector);
//         ipo.withdrawRaisedFunds();
//     }
//
//     /// @notice Company should NOT be able to withdraw twice.
//     function test_RevertWhen_DoubleWithdraw() public {
//         (,PolyIPO ipo) = _createDefaultIPO();
//         _mockVerified(investor1);
//
//         vm.warp(startTime + 1);
//         vm.prank(investor1);
//         ipo.bid{value: SOFT_CAP}();
//         vm.warp(endTime + 1);
//         vm.prank(outsider);
//         ipo.finalize();
//
//         // First withdrawal — succeeds
//         vm.prank(company);
//         ipo.withdrawRaisedFunds();
//
//         // Second withdrawal — reverts
//         vm.prank(company);
//         vm.expectRevert(PolyIPO.FundsAlreadyWithdrawn.selector);
//         ipo.withdrawRaisedFunds();
//     }
//
//     /// @notice Finalize should NOT be callable while bidding is still open.
//     function test_RevertWhen_FinalizeBeforeEndTime() public {
//         (,PolyIPO ipo) = _createDefaultIPO();
//
//         // Still within the bidding window
//         vm.warp(startTime + 1);
//
//         vm.prank(outsider);
//         vm.expectRevert(PolyIPO.IPOStillActive.selector);
//         ipo.finalize();
//     }
//
//     /// @notice Full failed-IPO refund path: soft cap NOT met -> investors
//     ///         get their ETH back.
//     function test_FailedIPO_RefundPath() public {
//         (,PolyIPO ipo) = _createDefaultIPO();
//
//         // Verify and fund investor
//         _mockVerified(investor1);
//         uint256 bidAmount = SOFT_CAP - 1; // 1 wei short of soft cap
//
//         // ── Bid (below soft cap) ────────────────────────────────────────
//         vm.warp(startTime + 1);
//         vm.prank(investor1);
//         ipo.bid{value: bidAmount}();
//
//         // ── Warp past end and finalize ──────────────────────────────────
//         vm.warp(endTime + 1);
//
//         vm.expectEmit(true, false, false, true, address(ipo));
//         emit IPOFinalized(PolyIPO.IPOState.Failed, bidAmount);
//
//         vm.prank(outsider);
//         ipo.finalize();
//
//         assertEq(
//             uint256(ipo.s_state()),
//             uint256(PolyIPO.IPOState.Failed),
//             "IPO should be Failed (softCap not met)"
//         );
//
//         // ── Claiming tokens should revert (wrong state) ─────────────────
//         vm.prank(investor1);
//         vm.expectRevert(
//             abi.encodeWithSelector(
//                 PolyIPO.InvalidState.selector,
//                 PolyIPO.IPOState.Failed,
//                 PolyIPO.IPOState.Completed
//             )
//         );
//         ipo.claimTokens();
//
//         // ── Investor claims refund ──────────────────────────────────────
//         uint256 balanceBefore = investor1.balance;
//
//         vm.expectEmit(true, false, false, true, address(ipo));
//         emit RefundClaimed(investor1, bidAmount);
//
//         vm.prank(investor1);
//         ipo.claimRefund();
//
//         assertEq(
//             investor1.balance,
//             balanceBefore + bidAmount,
//             "Investor should receive full refund"
//         );
//         assertEq(
//             ipo.s_contributions(investor1), 0,
//             "Contribution should be zeroed after refund"
//         );
//         assertEq(
//             address(ipo).balance, 0,
//             "IPO contract should have 0 balance after refund"
//         );
//
//         // ── Double refund should revert ─────────────────────────────────
//         vm.prank(investor1);
//         vm.expectRevert(PolyIPO.NothingToClaim.selector);
//         ipo.claimRefund();
//     }
//
//     /// @notice When a bid would exceed the hard cap, the excess should be
//     ///         auto-refunded and the IPO should auto-finalize.
//     function test_HardCapHit_AutoFinalizeAndRefundExcess() public {
//         (PolyToken token, PolyIPO ipo) = _createDefaultIPO();
//
//         _mockVerified(investor1);
//         vm.warp(startTime + 1);
//
//         // Bid MORE than the hard cap
//         uint256 bidAmount = HARD_CAP + 50 ether; // 150 ETH, cap is 100
//         uint256 balanceBefore = investor1.balance;
//
//         vm.prank(investor1);
//         ipo.bid{value: bidAmount}();
//
//         // Only HARD_CAP should be accepted
//         assertEq(
//             ipo.s_totalRaised(), HARD_CAP,
//             "Total raised should equal hard cap"
//         );
//         assertEq(
//             ipo.s_contributions(investor1), HARD_CAP,
//             "Contribution should equal hard cap"
//         );
//
//         // Excess 50 ETH should be refunded
//         assertEq(
//             investor1.balance,
//             balanceBefore - HARD_CAP,
//             "Only hardCap amount deducted; excess refunded"
//         );
//
//         // IPO should have auto-finalized to Completed
//         assertEq(
//             uint256(ipo.s_state()),
//             uint256(PolyIPO.IPOState.Completed),
//             "IPO should auto-finalize to Completed on hard cap"
//         );
//
//         // Remaining capacity should be 0
//         assertEq(ipo.remainingCapacity(), 0);
//
//         // Investor can claim tokens
//         uint256 expectedTokens = (HARD_CAP * 1e18) / TOKEN_PRICE;
//         vm.prank(investor1);
//         ipo.claimTokens();
//         assertEq(token.balanceOf(investor1), expectedTokens);
//     }
//
//     /// @notice Multiple verified investors can bid, and each can claim
//     ///         their proportional token allocation.
//     function test_MultipleInvestors_ProportionalClaims() public {
//         (PolyToken token, PolyIPO ipo) = _createDefaultIPO();
//
//         _mockVerified(investor1);
//         _mockVerified(investor2);
//
//         vm.warp(startTime + 1);
//
//         // Investor 1 bids 10 ETH
//         uint256 bid1 = 10 ether;
//         vm.prank(investor1);
//         ipo.bid{value: bid1}();
//
//         // Investor 2 bids 20 ETH
//         uint256 bid2 = 20 ether;
//         vm.prank(investor2);
//         ipo.bid{value: bid2}();
//
//         // Finalize
//         vm.warp(endTime + 1);
//         ipo.finalize();
//
//         // Both claim
//         uint256 expected1 = (bid1 * 1e18) / TOKEN_PRICE; // 1,000 tokens
//         uint256 expected2 = (bid2 * 1e18) / TOKEN_PRICE; // 2,000 tokens
//
//         vm.prank(investor1);
//         ipo.claimTokens();
//
//         vm.prank(investor2);
//         ipo.claimTokens();
//
//         assertEq(token.balanceOf(investor1), expected1);
//         assertEq(token.balanceOf(investor2), expected2);
//         assertEq(token.totalSupply(), expected1 + expected2);
//     }
//
//     /// @notice Zero-value bids should revert.
//     function test_RevertWhen_ZeroBid() public {
//         (,PolyIPO ipo) = _createDefaultIPO();
//         _mockVerified(investor1);
//         vm.warp(startTime + 1);
//
//         vm.prank(investor1);
//         vm.expectRevert(PolyIPO.ZeroBid.selector);
//         ipo.bid{value: 0}();
//     }
//
//     /// @notice After IPO completion, company can transfer token ownership
//     ///         to another address (e.g., governance, vesting contract).
//     function test_CompanyTransfersTokenOwnership() public {
//         (PolyToken token, PolyIPO ipo) = _createDefaultIPO();
//         _mockVerified(investor1);
//
//         vm.warp(startTime + 1);
//         vm.prank(investor1);
//         ipo.bid{value: SOFT_CAP}();
//
//         vm.warp(endTime + 1);
//         ipo.finalize();
//
//         // Token is currently owned by the IPO
//         assertEq(token.owner(), address(ipo));
//
//         // Company transfers token ownership
//         address newOwner = makeAddr("governance");
//         vm.prank(company);
//         ipo.transferTokenOwnership(newOwner);
//
//         assertEq(
//             token.owner(), newOwner,
//             "Token ownership should transfer to new owner"
//         );
//     }
// }
