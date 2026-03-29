// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {PolyFactory} from "../src/PolyFactory.sol";

// ============================================================================
//  DeployPolyquity.s.sol
//  Deploys IdentityRegistry (Reclaim Protocol) + PolyFactory
//
//  Required environment variables
//  ───────────────────────────────
//  PRIVATE_KEY          — deployer private key (no 0x prefix)
//  RECLAIM_VERIFIER     — Reclaim on-chain verifier address for your chain
//  RECLAIM_PROVIDER     — provider string, e.g. "digilocker" or "pan-india"
//
//  Reclaim Verifier Addresses (as of 2025 — check docs.reclaimprotocol.org):
//  ─────────────────────────────────────────────────────────────────────────
//  Ethereum Sepolia  : 0xF93F605142Fb1Efad7Aa58253dDffF7775e0ab6
//  Polygon Mainnet   : 0xd6534f52CEB3d0139b915bc0C3278a33F7bC8ff
//  Polygon Amoy      : 0x6D0f81BDA11995f25921aAd5B43359630E99cC66
//  Base Mainnet      : 0x8CDc031d5B7F148ab0435028b16c682c469A8609
//  Arbitrum One      : 0xdD63f7EdD56e5571A0e6b1Ca4B87d955f10B2652
//
//  Usage examples
//  ──────────────
//  # Polygon Amoy testnet (recommended for dev)
//  RECLAIM_VERIFIER=0x6D0f81BDA11995f25921aAd5B43359630E99cC66 \
//  RECLAIM_PROVIDER=digilocker \
//  forge script script/DeployPolyquity.s.sol \
//    --rpc-url $AMOY_RPC_URL \
//    --broadcast --verify
//
//  # Polygon Mainnet
//  RECLAIM_VERIFIER=0xd6534f52CEB3d0139b915bc0C3278a33F7bC8ff \
//  RECLAIM_PROVIDER=digilocker \
//  forge script script/DeployPolyquity.s.sol \
//    --rpc-url $POLYGON_RPC_URL \
//    --broadcast --verify
// ============================================================================

contract DeployPolyquity is Script {
    function run() external {
        // ── Load deployer key ────────────────────────────────────────────
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        // ── Load Reclaim config from environment ─────────────────────────
        address reclaimVerifier = vm.envOr(
            "RECLAIM_VERIFIER",
            makeAddr("reclaimVerifier") // fallback mock for local anvil tests
        );

        string memory reclaimProvider = vm.envOr(
            "RECLAIM_PROVIDER",
            string("digilocker") // default provider for Indian users
        );

        vm.startBroadcast(deployerKey);

        // ── 1. Deploy IdentityRegistry ───────────────────────────────────
        IdentityRegistry registry = new IdentityRegistry(
            reclaimVerifier,  // Reclaim on-chain verifier address
            reclaimProvider   // expected provider (e.g. "digilocker")
        );

        // ── 2. Deploy PolyFactory ────────────────────────────────────────
        PolyFactory factory = new PolyFactory(
            address(registry), // shared IdentityRegistry
            deployer           // factory owner
        );

        vm.stopBroadcast();

        // ── Log deployed addresses ───────────────────────────────────────
        // These will appear in the forge broadcast output.
        // Copy them to your .env or frontend config.
        vm.serializeAddress("out", "IdentityRegistry", address(registry));
        vm.serializeAddress("out", "PolyFactory", address(factory));
    }
}