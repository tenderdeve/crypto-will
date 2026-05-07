// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {CryptoWill} from "../src/CryptoWill.sol";

/// @notice Deployment script for Base Sepolia and Base Mainnet.
/// @dev Run with:
///   forge script script/Deploy.s.sol \
///     --rpc-url $RPC_URL \
///     --private-key $PRIVATE_KEY \
///     --broadcast \
///     --verify \
///     --etherscan-api-key $BASESCAN_API_KEY
contract Deploy is Script {
    function run() external returns (CryptoWill) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Deploying CryptoWill...");
        console2.log("Deployer:    ", deployer);
        console2.log("Chain ID:    ", block.chainid);
        console2.log("Balance:     ", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);
        CryptoWill cryptoWill = new CryptoWill();
        vm.stopBroadcast();

        console2.log("CryptoWill deployed at:", address(cryptoWill));
        console2.log("Add to .env:");
        console2.log("  NEXT_PUBLIC_CONTRACT_ADDRESS=", address(cryptoWill));
        console2.log("  NEXT_PUBLIC_CHAIN_ID=84532");

        return cryptoWill;
    }
}
