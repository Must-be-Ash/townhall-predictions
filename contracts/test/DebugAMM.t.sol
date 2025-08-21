// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/TownHallPredictions.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract DebugAMM is Test {
    TownHallPredictions public predictions;
    MockUSDC public usdc;
    
    address public admin = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    
    function setUp() public {
        usdc = new MockUSDC();
        vm.prank(admin);
        predictions = new TownHallPredictions(address(usdc));
        
        usdc.mint(user1, 1000 * 10**6);
        usdc.mint(user2, 1000 * 10**6);
        
        vm.prank(user1);
        usdc.approve(address(predictions), type(uint256).max);
        vm.prank(user2);
        usdc.approve(address(predictions), type(uint256).max);
    }
    
    function test_DebugBettingSideFull() public {
        vm.prank(user1);
        uint256 marketId = predictions.createMarket("Test", block.timestamp + 1 hours);
        
        // Place initial bets: 4 YES vs 1 NO
        vm.prank(user1);
        predictions.placeBet(marketId, true);
        vm.prank(user2);
        predictions.placeBet(marketId, true);
        
        address user3 = address(0x4);
        address user4 = address(0x5);
        address user5 = address(0x6);
        
        usdc.mint(user3, 1000 * 10**6);
        usdc.mint(user4, 1000 * 10**6);
        usdc.mint(user5, 1000 * 10**6);
        
        vm.prank(user3);
        usdc.approve(address(predictions), type(uint256).max);
        vm.prank(user4);
        usdc.approve(address(predictions), type(uint256).max);
        vm.prank(user5);
        usdc.approve(address(predictions), type(uint256).max);
        
        vm.prank(user3);
        predictions.placeBet(marketId, true);
        vm.prank(user4);
        predictions.placeBet(marketId, true);
        vm.prank(user5);
        predictions.placeBet(marketId, false);
        
        uint256 yesCap = predictions.getDynamicCap(marketId, true);
        console.log("YES cap after 4v1:", yesCap);
        
        // Add one more bet to make it 5 YES vs 1 NO
        address user6 = address(0x7);
        usdc.mint(user6, 1000 * 10**6);
        vm.prank(user6);
        usdc.approve(address(predictions), type(uint256).max);
        vm.prank(user6);
        predictions.placeBet(marketId, true);
        
        console.log("YES cap after 5v1:", predictions.getDynamicCap(marketId, true));
        
        // Try 6th bet
        address user7 = address(0x8);
        usdc.mint(user7, 1000 * 10**6);
        vm.prank(user7);
        usdc.approve(address(predictions), type(uint256).max);
        
        vm.prank(user7);
        predictions.placeBet(marketId, true);
        console.log("6th bet succeeded, new cap:", predictions.getDynamicCap(marketId, true));
    }
    
    function test_DebugDynamicCaps() public {
        vm.prank(user1);
        uint256 marketId = predictions.createMarket("Test", block.timestamp + 1 hours);
        
        address user3 = address(0x4);
        address user4 = address(0x5);
        address user5 = address(0x6);
        address user6 = address(0x7);
        
        usdc.mint(user3, 1000 * 10**6);
        usdc.mint(user4, 1000 * 10**6);
        usdc.mint(user5, 1000 * 10**6);
        usdc.mint(user6, 1000 * 10**6);
        
        vm.prank(user3);
        usdc.approve(address(predictions), type(uint256).max);
        vm.prank(user4);
        usdc.approve(address(predictions), type(uint256).max);
        vm.prank(user5);
        usdc.approve(address(predictions), type(uint256).max);
        vm.prank(user6);
        usdc.approve(address(predictions), type(uint256).max);
        
        // Create 2:1 imbalance (4 YES, 2 NO)
        vm.prank(user1);
        predictions.placeBet(marketId, true);
        vm.prank(user2);
        predictions.placeBet(marketId, true);
        vm.prank(user3);
        predictions.placeBet(marketId, true);
        vm.prank(user4);
        predictions.placeBet(marketId, true);
        
        vm.prank(user5);
        predictions.placeBet(marketId, false);
        vm.prank(user6);
        predictions.placeBet(marketId, false);
        
        console.log("YES cap after 4 YES vs 2 NO:", predictions.getDynamicCap(marketId, true));
        console.log("NO cap after 4 YES vs 2 NO:", predictions.getDynamicCap(marketId, false));
        
        // Get market state
        TownHallPredictions.Market memory market = predictions.getMarket(marketId);
        console.log("YES count:", market.yesCount);
        console.log("NO count:", market.noCount);
        console.log("Total count:", market.yesCount + market.noCount);
        console.log("YES is 2x NO?", market.yesCount > market.noCount * 2);
    }
    
    function test_DebugBalancedMarket() public {
        vm.prank(user1);
        uint256 marketId = predictions.createMarket("Test", block.timestamp + 1 hours);
        
        address user3 = address(0x4);
        address user4 = address(0x5);
        address user5 = address(0x6);
        
        usdc.mint(user3, 1000 * 10**6);
        usdc.mint(user4, 1000 * 10**6);
        usdc.mint(user5, 1000 * 10**6);
        
        vm.prank(user3);
        usdc.approve(address(predictions), type(uint256).max);
        vm.prank(user4);
        usdc.approve(address(predictions), type(uint256).max);
        vm.prank(user5);
        usdc.approve(address(predictions), type(uint256).max);
        
        // Create 3 YES vs 2 NO (60% vs 40%)
        vm.prank(user1);
        predictions.placeBet(marketId, true);
        vm.prank(user2);
        predictions.placeBet(marketId, true);
        vm.prank(user3);
        predictions.placeBet(marketId, true);
        
        vm.prank(user4);
        predictions.placeBet(marketId, false);
        vm.prank(user5);
        predictions.placeBet(marketId, false);
        
        console.log("YES multiplier (60%):", predictions.getPayoutMultiplier(marketId, true));
        console.log("NO multiplier (40%):", predictions.getPayoutMultiplier(marketId, false));
        
        // Get market state
        TownHallPredictions.Market memory market = predictions.getMarket(marketId);
        console.log("YES count:", market.yesCount);
        console.log("NO count:", market.noCount);
        console.log("YES percentage:", (market.yesCount * 100) / (market.yesCount + market.noCount));
    }
}