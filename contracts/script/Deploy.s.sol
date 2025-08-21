// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/TownHallPredictions.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("ADMIN_PRIVATE_KEY");
        address usdcAddress = vm.envAddress("NEXT_PUBLIC_USDC_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the TownHallPredictions contract
        TownHallPredictions predictions = new TownHallPredictions(usdcAddress);
        
        vm.stopBroadcast();
        
        console.log("TownHallPredictions deployed to:", address(predictions));
        console.log("Owner:", predictions.owner());
        console.log("USDC Address:", address(predictions.usdc()));
        console.log("Bet Amount:", predictions.BET_AMOUNT());
    }
}