// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/TownHallPredictions.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract AMMTestSuite is Test {
    TownHallPredictions public predictions;
    MockUSDC public usdc;
    
    address public admin = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public user3 = address(0x4);
    address public user4 = address(0x5);
    address public user5 = address(0x6);
    
    uint256 public constant BET_AMOUNT = 500000; // 0.5 USDC
    uint256 public constant INITIAL_BALANCE = 10000 * 10**6; // $10,000 USDC
    
    function setUp() public {
        // Deploy mock USDC
        usdc = new MockUSDC();
        
        // Deploy predictions contract
        vm.prank(admin);
        predictions = new TownHallPredictions(address(usdc));
        
        // Setup users
        address[] memory users = new address[](5);
        users[0] = user1;
        users[1] = user2; 
        users[2] = user3;
        users[3] = user4;
        users[4] = user5;
        
        for (uint i = 0; i < users.length; i++) {
            usdc.mint(users[i], INITIAL_BALANCE);
            vm.prank(users[i]);
            usdc.approve(address(predictions), type(uint256).max);
        }
    }
    
    // ==================== MULTIPLIER TESTS ====================
    
    function test_InitialMultipliers() public {
        vm.prank(user1);
        uint256 marketId = predictions.createMarket("Test question?", block.timestamp + 1 hours);
        
        // No bets yet, should return base multiplier (1.0x)
        assertEq(predictions.getPayoutMultiplier(marketId, true), 100);
        assertEq(predictions.getPayoutMultiplier(marketId, false), 100);
    }
    
    function test_FirstBetBonus() public {
        vm.prank(user1);
        uint256 marketId = predictions.createMarket("Test question?", block.timestamp + 1 hours);
        
        // Place first bet on YES
        vm.prank(user1);
        predictions.placeBet(marketId, true);
        
        // YES should have base multiplier, NO should get first bet bonus
        assertEq(predictions.getPayoutMultiplier(marketId, true), 100);
        assertEq(predictions.getPayoutMultiplier(marketId, false), 150); // 1.5x bonus
    }
    
    function test_MinorityBonus() public {
        vm.prank(user1);
        uint256 marketId = predictions.createMarket("Test question?", block.timestamp + 1 hours);
        
        // Place 4 YES bets
        vm.prank(user1);
        predictions.placeBet(marketId, true);
        vm.prank(user2);
        predictions.placeBet(marketId, true);
        vm.prank(user3);
        predictions.placeBet(marketId, true);
        vm.prank(user4);
        predictions.placeBet(marketId, true);
        
        // Place 1 NO bet
        vm.prank(user5);
        predictions.placeBet(marketId, false);
        
        // NO is 20% (1/5), should get 1.5x minority bonus
        // YES is 80%, should get 0.75x majority penalty
        assertEq(predictions.getPayoutMultiplier(marketId, false), 150); // 1.5x
        assertEq(predictions.getPayoutMultiplier(marketId, true), 75);   // 0.75x
    }
    
    function test_BalancedMarketMultipliers() public {
        vm.prank(user1);
        uint256 marketId = predictions.createMarket("Test question?", block.timestamp + 1 hours);
        
        // Place 3 YES, 2 NO (60% vs 40%) 
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
        
        // YES (60%) should get 1.0x (in balanced range)
        // NO (40%) should get 1.1x (slight minority bonus)
        assertEq(predictions.getPayoutMultiplier(marketId, true), 100);  // 1.0x
        assertEq(predictions.getPayoutMultiplier(marketId, false), 110); // 1.1x
    }
    
    function test_GradualMultiplierChanges() public {
        vm.prank(user1);
        uint256 marketId = predictions.createMarket("Test question?", block.timestamp + 1 hours);
        
        // Test progression of multipliers as market becomes imbalanced
        
        // 1 YES vs 0 NO: YES gets 1.0x, NO gets 1.5x (first bet bonus)
        vm.prank(user1);
        predictions.placeBet(marketId, true);
        assertEq(predictions.getPayoutMultiplier(marketId, true), 100);
        assertEq(predictions.getPayoutMultiplier(marketId, false), 150);
        
        // 1 YES vs 1 NO: Both get 1.0x (balanced)
        vm.prank(user2);
        predictions.placeBet(marketId, false);
        assertEq(predictions.getPayoutMultiplier(marketId, true), 100);
        assertEq(predictions.getPayoutMultiplier(marketId, false), 100);
        
        // 2 YES vs 1 NO (67% vs 33%): YES gets 0.85x, NO gets 1.25x
        vm.prank(user3);
        predictions.placeBet(marketId, true);
        assertEq(predictions.getPayoutMultiplier(marketId, true), 85);   // 0.85x
        assertEq(predictions.getPayoutMultiplier(marketId, false), 125); // 1.25x
    }
    
    // ==================== DYNAMIC CAP TESTS ====================
    
    function test_InitialCaps() public {
        vm.prank(user1);
        uint256 marketId = predictions.createMarket("Test question?", block.timestamp + 1 hours);
        
        // Should start with base caps
        assertEq(predictions.getDynamicCap(marketId, true), 15);  // BASE_MAX_BETS_PER_SIDE
        assertEq(predictions.getDynamicCap(marketId, false), 15);
    }
    
    function test_EarlyMarketFullCaps() public {
        vm.prank(user1);
        uint256 marketId = predictions.createMarket("Test question?", block.timestamp + 1 hours);
        
        // Place 3 bets (< 4), should still have full caps
        vm.prank(user1);
        predictions.placeBet(marketId, true);
        vm.prank(user2);
        predictions.placeBet(marketId, true);
        vm.prank(user3);
        predictions.placeBet(marketId, false);
        
        assertEq(predictions.getDynamicCap(marketId, true), 15);
        assertEq(predictions.getDynamicCap(marketId, false), 15);
    }
    
    function test_DynamicCapReduction() public {
        vm.prank(user1);
        uint256 marketId = predictions.createMarket("Test question?", block.timestamp + 1 hours);
        
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
        
        // Add one more NO to make it 4 YES vs 2 NO (exactly 2:1)
        address user6 = address(0x7);
        usdc.mint(user6, INITIAL_BALANCE);
        vm.prank(user6);
        usdc.approve(address(predictions), type(uint256).max);
        vm.prank(user6);
        predictions.placeBet(marketId, false);
        
        // YES (dominant side) should have reduced cap: current (4) + 2 = 6
        // NO (minority side) should have full cap: 15
        assertEq(predictions.getDynamicCap(marketId, true), 6);
        assertEq(predictions.getDynamicCap(marketId, false), 15);
    }
    
    function test_BettingSideFullError() public {
        vm.prank(user1);
        uint256 marketId = predictions.createMarket("Test question?", block.timestamp + 1 hours);
        
        // Create a scenario where we hit the base cap of 15
        // Fill up YES side to the base maximum
        
        address[] memory moreUsers = new address[](20);
        for (uint i = 0; i < 20; i++) {
            moreUsers[i] = address(uint160(0x100 + i));
            usdc.mint(moreUsers[i], INITIAL_BALANCE);
            vm.prank(moreUsers[i]);
            usdc.approve(address(predictions), type(uint256).max);
        }
        
        // Place 15 YES bets (the base maximum)
        for (uint i = 0; i < 15; i++) {
            vm.prank(moreUsers[i]);
            predictions.placeBet(marketId, true);
        }
        
        // Place 1 NO bet to ensure we're not in early market phase
        vm.prank(moreUsers[15]);
        predictions.placeBet(marketId, false);
        
        // Now YES side should be at its dynamic cap
        // The cap should be min(current + allowance, BASE_MAX) = min(15 + 2, 15) = 15
        uint256 yesCap = predictions.getDynamicCap(marketId, true);
        console.log("YES cap with 15 YES vs 1 NO:", yesCap);
        
        // 16th YES bet should fail
        vm.expectRevert(TownHallPredictions.BettingSideFull.selector);
        vm.prank(moreUsers[16]);
        predictions.placeBet(marketId, true);
    }
    
    // ==================== WINNINGS CALCULATION TESTS ====================
    
    function test_MinorityWinnerBonus() public {
        vm.prank(user1);
        uint256 marketId = predictions.createMarket("Test question?", block.timestamp + 1 hours);
        
        // Create 4 YES vs 1 NO scenario
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
        
        vm.warp(block.timestamp + 2 hours);
        vm.prank(admin);
        predictions.resolveMarket(marketId, false); // NO wins (minority)
        
        // NO winner should get 1.5x multiplier
        uint256 winnings = predictions.calculateWinnings(marketId, user5);
        // Base winnings: 0.5 + (2.0 * 0.5 / 0.5) = 0.5 + 2.0 = 2.5 USDC
        // With 1.5x multiplier: 2.5 * 1.5 = 3.75 USDC
        assertEq(winnings, 3750000); // 3.75 USDC
    }
    
    function test_MajorityWinnerPenalty() public {
        vm.prank(user1);
        uint256 marketId = predictions.createMarket("Test question?", block.timestamp + 1 hours);
        
        // Create 4 YES vs 1 NO scenario
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
        
        vm.warp(block.timestamp + 2 hours);
        vm.prank(admin);
        predictions.resolveMarket(marketId, true); // YES wins (majority)
        
        // YES winners should get 0.75x multiplier
        uint256 winnings = predictions.calculateWinnings(marketId, user1);
        // Base winnings: 0.5 + (0.5 * 0.5 / 2.0) = 0.5 + 0.125 = 0.625 USDC  
        // With 0.75x multiplier: 0.625 * 0.75 = 0.46875 USDC
        assertEq(winnings, 468750); // 0.46875 USDC
    }
    
    function test_BalancedMarketNormalPayouts() public {
        vm.prank(user1);
        uint256 marketId = predictions.createMarket("Test question?", block.timestamp + 1 hours);
        
        // Create balanced scenario: 3 YES vs 2 NO
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
        
        vm.warp(block.timestamp + 2 hours);
        vm.prank(admin);
        predictions.resolveMarket(marketId, true); // YES wins
        
        // YES winners should get 1.0x multiplier (balanced market)
        uint256 winnings = predictions.calculateWinnings(marketId, user1);
        // Base winnings: 0.5 + (1.0 * 0.5 / 1.5) = 0.5 + 0.333... = 0.833... USDC
        // With 1.0x multiplier: no change
        assertEq(winnings, 833333); // 0.833333 USDC
    }
    
    // ==================== EDGE CASE TESTS ====================
    
    function test_SingleBetWinner() public {
        vm.prank(user1);
        uint256 marketId = predictions.createMarket("Test question?", block.timestamp + 1 hours);
        
        // Only one bet placed
        vm.prank(user1);
        predictions.placeBet(marketId, true);
        
        vm.warp(block.timestamp + 2 hours);
        vm.prank(admin);
        predictions.resolveMarket(marketId, true);
        
        // Winner should get their money back with 1.0x multiplier (no opposing bets)
        uint256 winnings = predictions.calculateWinnings(marketId, user1);
        // Base: 0.5 + (0 * 0.5 / 0.5) = 0.5 USDC  
        // With 1.0x multiplier (fixed logic): 0.5 USDC
        assertEq(winnings, 500000); // 0.5 USDC (just their stake back)
    }
    
    function test_NonExistentMarketMultiplier() public {
        // Should return base multiplier for non-existent market
        assertEq(predictions.getPayoutMultiplier(999, true), 100);
        assertEq(predictions.getPayoutMultiplier(999, false), 100);
    }
    
    function test_NonExistentMarketCap() public {
        // Should return base cap for non-existent market
        assertEq(predictions.getDynamicCap(999, true), 15);
        assertEq(predictions.getDynamicCap(999, false), 15);
    }
    
    // ==================== GAS EFFICIENCY TESTS ====================
    
    function test_MultiplierCalculationGas() public {
        vm.prank(user1);
        uint256 marketId = predictions.createMarket("Test question?", block.timestamp + 1 hours);
        
        // Place some bets to create imbalance
        vm.prank(user1);
        predictions.placeBet(marketId, true);
        vm.prank(user2);
        predictions.placeBet(marketId, false);
        
        uint256 gasBefore = gasleft();
        predictions.getPayoutMultiplier(marketId, true);
        uint256 gasAfter = gasleft();
        uint256 gasUsed = gasBefore - gasAfter;
        
        console.log("Multiplier calculation gas:", gasUsed);
        assertLt(gasUsed, 10000); // Should be very cheap (view function)
    }
    
    function test_DynamicCapCalculationGas() public {
        vm.prank(user1);
        uint256 marketId = predictions.createMarket("Test question?", block.timestamp + 1 hours);
        
        // Place some bets to create imbalance
        vm.prank(user1);
        predictions.placeBet(marketId, true);
        vm.prank(user2);
        predictions.placeBet(marketId, false);
        
        uint256 gasBefore = gasleft();
        predictions.getDynamicCap(marketId, true);
        uint256 gasAfter = gasleft();
        uint256 gasUsed = gasBefore - gasAfter;
        
        console.log("Dynamic cap calculation gas:", gasUsed);
        assertLt(gasUsed, 10000); // Should be very cheap (view function)
    }
}