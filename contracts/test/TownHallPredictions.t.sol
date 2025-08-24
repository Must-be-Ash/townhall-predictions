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

contract TownHallPredictionsTest is Test {
    TownHallPredictions public predictions;
    MockUSDC public usdc;

    address public admin = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public user3 = address(0x4);

    uint256 public constant BET_AMOUNT = 1000000; // 1.0 USDC
    uint256 public constant INITIAL_BALANCE = 1000 * 10**6; // $1000 USDC

    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string question,
        uint256 closeTime,
        uint256 createdAt
    );
    
    event BetPlaced(
        uint256 indexed marketId,
        address indexed user,
        bool outcome,
        uint256 amount
    );
    
    event MarketResolved(
        uint256 indexed marketId,
        bool winningOutcome,
        uint256 yesTotal,
        uint256 noTotal
    );
    
    event MarketVoided(uint256 indexed marketId);
    
    event WinningsWithdrawn(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount
    );
    
    event DeadPoolFundsClaimed(
        uint256 indexed marketId,
        address indexed admin,
        uint256 amount
    );

    function setUp() public {
        // Deploy mock USDC
        usdc = new MockUSDC();
        
        // Deploy predictions contract
        vm.prank(admin);
        predictions = new TownHallPredictions(address(usdc));
        
        // Mint USDC to test users
        usdc.mint(user1, INITIAL_BALANCE);
        usdc.mint(user2, INITIAL_BALANCE);
        usdc.mint(user3, INITIAL_BALANCE);
        
        // Approve predictions contract to spend USDC
        vm.prank(user1);
        usdc.approve(address(predictions), type(uint256).max);
        
        vm.prank(user2);
        usdc.approve(address(predictions), type(uint256).max);
        
        vm.prank(user3);
        usdc.approve(address(predictions), type(uint256).max);
    }

    function test_Constructor() public view {
        assertEq(address(predictions.usdc()), address(usdc));
        assertEq(predictions.owner(), admin);
        assertEq(predictions.BET_AMOUNT(), BET_AMOUNT);
    }

    function test_CreateMarket() public {
        uint256 closeTime = block.timestamp + 1 hours;
        string memory question = "Will Dan wear a black hat?";
        
        vm.expectEmit(true, true, true, true);
        emit MarketCreated(0, admin, question, closeTime, block.timestamp);
        
        vm.prank(admin);
        uint256 marketId = predictions.createMarket(question, closeTime);
        
        assertEq(marketId, 0);
        assertEq(predictions.marketCounter(), 1);
        
        TownHallPredictions.Market memory market = predictions.getMarket(marketId);
        assertEq(market.question, question);
        assertEq(market.closeTime, closeTime);
        assertFalse(market.resolved);
        assertFalse(market.voided);
        assertEq(market.yesTotal, 0);
        assertEq(market.noTotal, 0);
        assertEq(market.yesCount, 0);
        assertEq(market.noCount, 0);
        assertEq(market.createdAt, block.timestamp);
    }

    function test_CreateMarketByUser() public {
        uint256 closeTime = block.timestamp + 1 hours;
        string memory question = "Can users create markets?";
        
        vm.expectEmit(true, true, true, true);
        emit MarketCreated(0, user1, question, closeTime, block.timestamp);
        
        vm.prank(user1);
        uint256 marketId = predictions.createMarket(question, closeTime);
        
        assertEq(marketId, 0);
        
        TownHallPredictions.Market memory market = predictions.getMarket(marketId);
        assertEq(market.creator, user1);
    }

    function test_CreateMarketInvalidCloseTime() public {
        vm.prank(admin);
        vm.expectRevert("Close time must be in the future");
        predictions.createMarket("Test question?", 1); // timestamp = 1 (past)
    }

    function test_CreateMarketEmptyQuestion() public {
        vm.expectRevert("Question cannot be empty");
        vm.prank(admin);
        predictions.createMarket("", block.timestamp + 1 hours);
    }

    function test_PlaceBetYes() public {
        // Create market
        vm.prank(admin);
        uint256 marketId = predictions.createMarket(
            "Will Dan wear a black hat?",
            block.timestamp + 1 hours
        );
        
        uint256 initialBalance = usdc.balanceOf(user1);
        
        vm.expectEmit(true, true, true, true);
        emit BetPlaced(marketId, user1, true, BET_AMOUNT);
        
        // User1 bets YES
        vm.prank(user1);
        predictions.placeBet(marketId, true);
        
        // Check balances
        assertEq(usdc.balanceOf(user1), initialBalance - BET_AMOUNT);
        assertEq(usdc.balanceOf(address(predictions)), BET_AMOUNT);
        
        // Check user bet
        TownHallPredictions.UserBet memory userBet = predictions.getUserBet(marketId, user1);
        assertTrue(userBet.hasBet);
        assertTrue(userBet.outcome);
        assertFalse(userBet.withdrawn);
        
        // Check market stats
        TownHallPredictions.Market memory market = predictions.getMarket(marketId);
        assertEq(market.yesTotal, BET_AMOUNT);
        assertEq(market.noTotal, 0);
        assertEq(market.yesCount, 1);
        assertEq(market.noCount, 0);
        
        // Check participants
        address[] memory participants = predictions.getMarketParticipants(marketId);
        assertEq(participants.length, 1);
        assertEq(participants[0], user1);
    }

    function test_PlaceBetNo() public {
        // Create market
        vm.prank(admin);
        uint256 marketId = predictions.createMarket(
            "Will Dan wear a black hat?",
            block.timestamp + 1 hours
        );
        
        // User2 bets NO
        vm.prank(user2);
        predictions.placeBet(marketId, false);
        
        // Check user bet
        TownHallPredictions.UserBet memory userBet = predictions.getUserBet(marketId, user2);
        assertTrue(userBet.hasBet);
        assertFalse(userBet.outcome);
        
        // Check market stats
        TownHallPredictions.Market memory market = predictions.getMarket(marketId);
        assertEq(market.yesTotal, 0);
        assertEq(market.noTotal, BET_AMOUNT);
        assertEq(market.yesCount, 0);
        assertEq(market.noCount, 1);
    }

    function test_PlaceBetAlreadyBet() public {
        // Create market
        vm.prank(admin);
        uint256 marketId = predictions.createMarket(
            "Will Dan wear a black hat?",
            block.timestamp + 1 hours
        );
        
        // User1 bets YES
        vm.prank(user1);
        predictions.placeBet(marketId, true);
        
        // User1 tries to bet again
        vm.expectRevert(TownHallPredictions.AlreadyBet.selector);
        vm.prank(user1);
        predictions.placeBet(marketId, false);
    }

    function test_PlaceBetMarketClosed() public {
        // Create market
        vm.prank(admin);
        uint256 marketId = predictions.createMarket(
            "Will Dan wear a black hat?",
            block.timestamp + 1 hours
        );
        
        // Fast forward past close time
        vm.warp(block.timestamp + 2 hours);
        
        vm.expectRevert(TownHallPredictions.MarketClosed.selector);
        vm.prank(user1);
        predictions.placeBet(marketId, true);
    }

    function test_PlaceBetNonexistentMarket() public {
        vm.expectRevert(TownHallPredictions.MarketNotFound.selector);
        vm.prank(user1);
        predictions.placeBet(999, true);
    }

    function test_ResolveMarket() public {
        // Create market
        vm.prank(admin);
        uint256 marketId = predictions.createMarket(
            "Will Dan wear a black hat?",
            block.timestamp + 1 hours
        );
        
        // Users place bets
        vm.prank(user1);
        predictions.placeBet(marketId, true); // YES
        
        vm.prank(user2);
        predictions.placeBet(marketId, false); // NO
        
        // Fast forward past close time
        vm.warp(block.timestamp + 2 hours);
        
        vm.expectEmit(true, true, true, true);
        emit MarketResolved(marketId, true, BET_AMOUNT, BET_AMOUNT);
        
        // Resolve market with YES winning
        vm.prank(admin);
        predictions.resolveMarket(marketId, true);
        
        TownHallPredictions.Market memory market = predictions.getMarket(marketId);
        assertTrue(market.resolved);
        assertTrue(market.winningOutcome);
    }

    function test_ResolveMarketOnlyOwner() public {
        // Create and close market
        vm.prank(admin);
        uint256 marketId = predictions.createMarket(
            "Will Dan wear a black hat?",
            block.timestamp + 1 hours
        );
        
        vm.warp(block.timestamp + 2 hours);
        
        vm.expectRevert();
        vm.prank(user1);
        predictions.resolveMarket(marketId, true);
    }

    function test_ResolveMarketNotClosed() public {
        // Create market
        vm.prank(admin);
        uint256 marketId = predictions.createMarket(
            "Will Dan wear a black hat?",
            block.timestamp + 1 hours
        );
        
        vm.expectRevert(TownHallPredictions.MarketNotClosed.selector);
        vm.prank(admin);
        predictions.resolveMarket(marketId, true);
    }

    function test_VoidMarket() public {
        // Create market
        vm.prank(admin);
        uint256 marketId = predictions.createMarket(
            "Will Dan wear a black hat?",
            block.timestamp + 1 hours
        );
        
        // Users place bets
        vm.prank(user1);
        predictions.placeBet(marketId, true);
        
        vm.prank(user2);
        predictions.placeBet(marketId, false);
        
        vm.expectEmit(true, true, true, true);
        emit MarketVoided(marketId);
        
        // Void market
        vm.prank(admin);
        predictions.voidMarket(marketId);
        
        TownHallPredictions.Market memory market = predictions.getMarket(marketId);
        assertTrue(market.voided);
    }

    function test_WithdrawWinnings() public {
        // Create market
        vm.prank(admin);
        uint256 marketId = predictions.createMarket(
            "Will Dan wear a black hat?",
            block.timestamp + 1 hours
        );
        
        // Users place bets - 2 YES, 1 NO
        vm.prank(user1);
        predictions.placeBet(marketId, true); // YES
        
        vm.prank(user2);
        predictions.placeBet(marketId, true); // YES
        
        vm.prank(user3);
        predictions.placeBet(marketId, false); // NO
        
        // Fast forward and resolve
        vm.warp(block.timestamp + 2 hours);
        vm.prank(admin);
        predictions.resolveMarket(marketId, true); // YES wins
        
        // Calculate expected winnings with multiplier
        uint256 expectedWinnings = predictions.calculateWinnings(marketId, user1);
        // Base: 0.5 + (0.5 * 0.5 / 1.0) = 0.75 USDC
        // With 0.85x multiplier for majority side (2 YES vs 1 NO): 0.75 * 0.85 = 0.6375 USDC
        assertEq(expectedWinnings, 637500); // 0.6375 USDC
        
        uint256 initialBalance = usdc.balanceOf(user1);
        
        vm.expectEmit(true, true, true, true);
        emit WinningsWithdrawn(marketId, user1, expectedWinnings);
        
        // User1 withdraws winnings
        vm.prank(user1);
        predictions.withdrawWinnings(marketId);
        
        assertEq(usdc.balanceOf(user1), initialBalance + expectedWinnings);
        
        // Check user bet status
        TownHallPredictions.UserBet memory userBet = predictions.getUserBet(marketId, user1);
        assertTrue(userBet.withdrawn);
    }

    function test_WithdrawWinningsLoser() public {
        // Create market and place bets
        vm.prank(admin);
        uint256 marketId = predictions.createMarket(
            "Will Dan wear a black hat?",
            block.timestamp + 1 hours
        );
        
        vm.prank(user1);
        predictions.placeBet(marketId, true); // YES
        
        vm.prank(user2);
        predictions.placeBet(marketId, false); // NO
        
        // Resolve with NO winning
        vm.warp(block.timestamp + 2 hours);
        vm.prank(admin);
        predictions.resolveMarket(marketId, false); // NO wins
        
        // User1 (YES bettor) tries to withdraw
        vm.expectRevert(TownHallPredictions.NoWinnings.selector);
        vm.prank(user1);
        predictions.withdrawWinnings(marketId);
    }

    function test_WithdrawRefundFromVoidedMarket() public {
        // Create market
        vm.prank(admin);
        uint256 marketId = predictions.createMarket(
            "Will Dan wear a black hat?",
            block.timestamp + 1 hours
        );
        
        uint256 initialBalance = usdc.balanceOf(user1);
        
        // User1 places bet
        vm.prank(user1);
        predictions.placeBet(marketId, true);
        
        // Void market
        vm.prank(admin);
        predictions.voidMarket(marketId);
        
        vm.expectEmit(true, true, true, true);
        emit WinningsWithdrawn(marketId, user1, BET_AMOUNT);
        
        // User1 withdraws refund
        vm.prank(user1);
        predictions.withdrawRefund(marketId);
        
        assertEq(usdc.balanceOf(user1), initialBalance); // Back to original balance
        
        // Check user bet status
        TownHallPredictions.UserBet memory userBet = predictions.getUserBet(marketId, user1);
        assertTrue(userBet.withdrawn);
    }

    function test_CalculateWinnings() public {
        // Create market
        vm.prank(admin);
        uint256 marketId = predictions.createMarket(
            "Will Dan wear a black hat?",
            block.timestamp + 1 hours
        );
        
        // Place bets: 3 YES, 2 NO
        vm.prank(user1);
        predictions.placeBet(marketId, true); // YES
        
        vm.prank(user2);
        predictions.placeBet(marketId, true); // YES
        
        vm.prank(user3);
        predictions.placeBet(marketId, true); // YES
        
        address user4 = address(0x5);
        address user5 = address(0x6);
        usdc.mint(user4, INITIAL_BALANCE);
        usdc.mint(user5, INITIAL_BALANCE);
        
        vm.prank(user4);
        usdc.approve(address(predictions), type(uint256).max);
        vm.prank(user4);
        predictions.placeBet(marketId, false); // NO
        
        vm.prank(user5);
        usdc.approve(address(predictions), type(uint256).max);
        vm.prank(user5);
        predictions.placeBet(marketId, false); // NO
        
        // Resolve with YES winning
        vm.warp(block.timestamp + 2 hours);
        vm.prank(admin);
        predictions.resolveMarket(marketId, true);
        
        // Calculate winnings for YES winners
        uint256 winnings = predictions.calculateWinnings(marketId, user1);
        // Each YES winner gets: 0.5 + (1.0 * 0.5 / 1.5) = 0.5 + 0.333... ≈ 0.833 USDC
        assertEq(winnings, 833333); // 0.833333 USDC
        
        // NO losers should get 0
        uint256 loserWinnings = predictions.calculateWinnings(marketId, user4);
        assertEq(loserWinnings, 0);
    }

    function test_EmergencyWithdraw() public {
        // Send some tokens to the contract
        usdc.mint(address(predictions), 1000000); // 1 USDC
        
        uint256 initialBalance = usdc.balanceOf(admin);
        
        vm.prank(admin);
        predictions.emergencyWithdraw(address(usdc), 1000000, admin);
        
        assertEq(usdc.balanceOf(admin), initialBalance + 1000000);
    }

    function test_EmergencyWithdrawOnlyOwner() public {
        vm.expectRevert();
        vm.prank(user1);
        predictions.emergencyWithdraw(address(usdc), 1000000, admin);
    }

    function test_CompleteMarketFlow() public {
        // Create market
        vm.prank(admin);
        uint256 marketId = predictions.createMarket(
            "Will Dan wear a black hat?",
            block.timestamp + 1 hours
        );
        
        // Multiple users place bets
        vm.prank(user1);
        predictions.placeBet(marketId, true); // YES - 0.5 USDC
        
        vm.prank(user2);
        predictions.placeBet(marketId, true); // YES - 0.5 USDC
        
        vm.prank(user3);
        predictions.placeBet(marketId, false); // NO - 0.5 USDC
        
        // Check contract balance
        assertEq(usdc.balanceOf(address(predictions)), BET_AMOUNT * 3);
        
        // Fast forward and resolve
        vm.warp(block.timestamp + 2 hours);
        vm.prank(admin);
        predictions.resolveMarket(marketId, true); // YES wins
        
        // Winners withdraw
        uint256 user1BalanceBefore = usdc.balanceOf(user1);
        uint256 user2BalanceBefore = usdc.balanceOf(user2);
        
        vm.prank(user1);
        predictions.withdrawWinnings(marketId);
        
        vm.prank(user2);
        predictions.withdrawWinnings(marketId);
        
        // Each YES winner should get 0.6375 USDC (0.75 base * 0.85 multiplier for majority)
        assertEq(usdc.balanceOf(user1), user1BalanceBefore + 637500);
        assertEq(usdc.balanceOf(user2), user2BalanceBefore + 637500);
        
        // Contract retains some funds due to reduced multipliers (prevents over-payment)
        // Total deposited: 1.5 USDC, Total paid: 1.275 USDC, Remaining: 0.225 USDC
        assertEq(usdc.balanceOf(address(predictions)), 225000);
    }

    // ========================================
    // Dead Pool Tests
    // ========================================

    function test_isDeadPoolMarket_OnlyYesBets_ResolvesNo() public {
        // Create market
        uint256 closeTime = block.timestamp + 1 hours;
        vm.prank(admin);
        uint256 marketId = predictions.createMarket("Question?", closeTime);

        // Only YES bets placed
        vm.prank(user1);
        predictions.placeBet(marketId, true); // YES
        vm.prank(user2);
        predictions.placeBet(marketId, true); // YES

        // Market resolves to NO (opposite of bets)
        vm.warp(closeTime + 1);
        vm.prank(admin);
        predictions.resolveMarket(marketId, false); // NO wins

        // Should be dead pool
        assertTrue(predictions.isDeadPoolMarket(marketId));
    }

    function test_isDeadPoolMarket_OnlyNoBets_ResolvesYes() public {
        // Create market
        uint256 closeTime = block.timestamp + 1 hours;
        vm.prank(admin);
        uint256 marketId = predictions.createMarket("Question?", closeTime);

        // Only NO bets placed
        vm.prank(user1);
        predictions.placeBet(marketId, false); // NO
        vm.prank(user2);
        predictions.placeBet(marketId, false); // NO

        // Market resolves to YES (opposite of bets)
        vm.warp(closeTime + 1);
        vm.prank(admin);
        predictions.resolveMarket(marketId, true); // YES wins

        // Should be dead pool
        assertTrue(predictions.isDeadPoolMarket(marketId));
    }

    function test_isDeadPoolMarket_NormalMarket_NotDeadPool() public {
        // Create market with balanced bets
        uint256 closeTime = block.timestamp + 1 hours;
        vm.prank(admin);
        uint256 marketId = predictions.createMarket("Question?", closeTime);

        // Balanced betting
        vm.prank(user1);
        predictions.placeBet(marketId, true); // YES
        vm.prank(user2);
        predictions.placeBet(marketId, false); // NO

        // Resolve normally
        vm.warp(closeTime + 1);
        vm.prank(admin);
        predictions.resolveMarket(marketId, true); // YES wins

        // Should NOT be dead pool
        assertFalse(predictions.isDeadPoolMarket(marketId));
    }

    function test_isDeadPoolMarket_UnresolvedMarket_NotDeadPool() public {
        // Create market
        uint256 closeTime = block.timestamp + 1 hours;
        vm.prank(admin);
        uint256 marketId = predictions.createMarket("Question?", closeTime);

        // Only YES bets
        vm.prank(user1);
        predictions.placeBet(marketId, true);

        // Don't resolve - should not be dead pool
        assertFalse(predictions.isDeadPoolMarket(marketId));
    }

    function test_isDeadPoolMarket_VoidedMarket_NotDeadPool() public {
        // Create market
        uint256 closeTime = block.timestamp + 1 hours;
        vm.prank(admin);
        uint256 marketId = predictions.createMarket("Question?", closeTime);

        // Only YES bets
        vm.prank(user1);
        predictions.placeBet(marketId, true);

        // Void instead of resolve
        vm.prank(admin);
        predictions.voidMarket(marketId);

        // Should NOT be dead pool
        assertFalse(predictions.isDeadPoolMarket(marketId));
    }

    function test_claimDeadPoolFunds_Success() public {
        // Create market
        uint256 closeTime = block.timestamp + 1 hours;
        vm.prank(admin);
        uint256 marketId = predictions.createMarket("Question?", closeTime);

        // Only YES bets (2 USDC total)
        vm.prank(user1);
        predictions.placeBet(marketId, true);
        vm.prank(user2);
        predictions.placeBet(marketId, true);

        // Market resolves to NO (dead pool)
        vm.warp(closeTime + 1);
        vm.prank(admin);
        predictions.resolveMarket(marketId, false);

        // Check contract has the funds
        assertEq(usdc.balanceOf(address(predictions)), 2 * BET_AMOUNT);

        // Check admin balance before
        uint256 adminBalanceBefore = usdc.balanceOf(admin);

        // Admin claims dead pool funds
        vm.expectEmit(true, true, true, true);
        emit DeadPoolFundsClaimed(marketId, admin, 2 * BET_AMOUNT);
        
        vm.prank(admin);
        predictions.claimDeadPoolFunds(marketId);

        // Check funds transferred to admin
        assertEq(usdc.balanceOf(admin), adminBalanceBefore + 2 * BET_AMOUNT);
        assertEq(usdc.balanceOf(address(predictions)), 0);

        // Check dead pool marked as claimed
        assertTrue(predictions.deadPoolClaimed(marketId));
    }

    function test_claimDeadPoolFunds_RevertIfNotDeadPool() public {
        // Create balanced market
        uint256 closeTime = block.timestamp + 1 hours;
        vm.prank(admin);
        uint256 marketId = predictions.createMarket("Question?", closeTime);

        // Balanced betting
        vm.prank(user1);
        predictions.placeBet(marketId, true);
        vm.prank(user2);
        predictions.placeBet(marketId, false);

        // Resolve normally
        vm.warp(closeTime + 1);
        vm.prank(admin);
        predictions.resolveMarket(marketId, true);

        // Try to claim - should revert
        vm.prank(admin);
        vm.expectRevert(TownHallPredictions.NoDeadPoolFunds.selector);
        predictions.claimDeadPoolFunds(marketId);
    }

    function test_claimDeadPoolFunds_RevertIfNotResolved() public {
        // Create market
        uint256 closeTime = block.timestamp + 1 hours;
        vm.prank(admin);
        uint256 marketId = predictions.createMarket("Question?", closeTime);

        // Place bets but don't resolve
        vm.prank(user1);
        predictions.placeBet(marketId, true);

        // Try to claim - should revert
        vm.prank(admin);
        vm.expectRevert(TownHallPredictions.MarketAlreadyResolved.selector);
        predictions.claimDeadPoolFunds(marketId);
    }

    function test_claimDeadPoolFunds_RevertIfVoided() public {
        // Create market
        uint256 closeTime = block.timestamp + 1 hours;
        vm.prank(admin);
        uint256 marketId = predictions.createMarket("Question?", closeTime);

        // Place bets and void
        vm.prank(user1);
        predictions.placeBet(marketId, true);
        vm.prank(admin);
        predictions.voidMarket(marketId);

        // Try to claim - should revert
        vm.prank(admin);
        vm.expectRevert(TownHallPredictions.MarketIsVoided.selector);
        predictions.claimDeadPoolFunds(marketId);
    }

    function test_claimDeadPoolFunds_RevertIfAlreadyClaimed() public {
        // Create dead pool market
        uint256 closeTime = block.timestamp + 1 hours;
        vm.prank(admin);
        uint256 marketId = predictions.createMarket("Question?", closeTime);

        vm.prank(user1);
        predictions.placeBet(marketId, true);

        vm.warp(closeTime + 1);
        vm.prank(admin);
        predictions.resolveMarket(marketId, false);

        // Claim once
        vm.prank(admin);
        predictions.claimDeadPoolFunds(marketId);

        // Try to claim again - should revert
        vm.prank(admin);
        vm.expectRevert(TownHallPredictions.DeadPoolAlreadyClaimed.selector);
        predictions.claimDeadPoolFunds(marketId);
    }

    function test_claimDeadPoolFunds_RevertIfNotOwner() public {
        // Create dead pool market
        uint256 closeTime = block.timestamp + 1 hours;
        vm.prank(admin);
        uint256 marketId = predictions.createMarket("Question?", closeTime);

        vm.prank(user1);
        predictions.placeBet(marketId, true);

        vm.warp(closeTime + 1);
        vm.prank(admin);
        predictions.resolveMarket(marketId, false);

        // Non-owner tries to claim - should revert
        vm.prank(user1);
        vm.expectRevert();
        predictions.claimDeadPoolFunds(marketId);
    }

    function test_claimDeadPoolFunds_RevertIfNoBets() public {
        // Create market with no bets
        uint256 closeTime = block.timestamp + 1 hours;
        vm.prank(admin);
        uint256 marketId = predictions.createMarket("Question?", closeTime);

        // Resolve with no bets
        vm.warp(closeTime + 1);
        vm.prank(admin);
        predictions.resolveMarket(marketId, false);

        // Try to claim - should revert (no funds)
        vm.prank(admin);
        vm.expectRevert(TownHallPredictions.NoDeadPoolFunds.selector);
        predictions.claimDeadPoolFunds(marketId);
    }

    function test_deadPoolScenario_PreservesMarketResolution() public {
        // Create market
        uint256 closeTime = block.timestamp + 1 hours;
        vm.prank(admin);
        uint256 marketId = predictions.createMarket("Question?", closeTime);

        // Only YES bets
        vm.prank(user1);
        predictions.placeBet(marketId, true);
        vm.prank(user2);
        predictions.placeBet(marketId, true);

        // Resolve to NO (dead pool)
        vm.warp(closeTime + 1);
        vm.prank(admin);
        predictions.resolveMarket(marketId, false);

        // Verify market state preserved
        TownHallPredictions.Market memory market = predictions.getMarket(marketId);
        assertTrue(market.resolved);
        assertFalse(market.winningOutcome); // NO won
        assertFalse(market.voided);

        // Users can't withdraw (no winnings)
        vm.prank(user1);
        vm.expectRevert(TownHallPredictions.NoWinnings.selector);
        predictions.withdrawWinnings(marketId);

        // But admin can claim dead pool funds
        vm.prank(admin);
        predictions.claimDeadPoolFunds(marketId);

        // Market resolution data still intact
        market = predictions.getMarket(marketId);
        assertTrue(market.resolved);
        assertFalse(market.winningOutcome); // Still shows NO won
    }
}