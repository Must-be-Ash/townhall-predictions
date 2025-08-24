// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TownHallPredictions
 * @dev A binary prediction market contract for town hall events
 * @notice This contract allows users to place fixed-amount bets on binary outcomes
 */
contract TownHallPredictions is Ownable, ReentrancyGuard {
    /// @notice Structure representing a prediction market
    struct Market {
        string question;          // The question being predicted
        uint256 closeTime;       // When betting closes (timestamp)
        bool resolved;           // Whether the market has been resolved
        bool winningOutcome;     // The winning outcome (true = Yes, false = No)
        uint256 yesTotal;        // Total USDC bet on Yes
        uint256 noTotal;         // Total USDC bet on No
        uint256 yesCount;        // Number of Yes bets
        uint256 noCount;         // Number of No bets
        bool voided;             // Whether the market has been voided
        uint256 createdAt;       // Market creation timestamp
        address creator;         // Address that created this market
    }
    
    /// @notice Structure representing a user's bet in a market
    struct UserBet {
        bool hasBet;             // Whether the user has placed a bet
        bool outcome;            // The outcome they bet on (true = Yes, false = No)
        bool withdrawn;          // Whether they have withdrawn their winnings/refund
    }
    
    /// @notice The fixed bet amount in USDC (1.0 USDC with 6 decimals)
    uint256 public constant BET_AMOUNT = 1000000; // 1.0 USDC (6 decimals)
    
    /// @notice Maximum bets per side before dynamic caps kick in
    uint256 public constant BASE_MAX_BETS_PER_SIDE = 50;
    
    /// @notice Multiplier precision (100 = 1.0x, 150 = 1.5x, 80 = 0.8x)
    uint256 public constant MULTIPLIER_BASE = 100;
    
    /// @notice The USDC token contract
    IERC20 public immutable usdc;
    
    /// @notice Counter for generating unique market IDs
    uint256 public marketCounter;
    
    /// @notice Mapping from market ID to market data
    mapping(uint256 => Market) public markets;
    
    /// @notice Mapping from market ID to user address to their bet
    mapping(uint256 => mapping(address => UserBet)) public userBets;
    
    /// @notice Mapping from market ID to array of participant addresses
    mapping(uint256 => address[]) public marketParticipants;
    
    /// @notice Mapping to track if dead pool funds have been claimed for a market
    mapping(uint256 => bool) public deadPoolClaimed;
    
    /// @notice Emitted when a new market is created
    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string question,
        uint256 closeTime,
        uint256 createdAt
    );
    
    /// @notice Emitted when a user places a bet
    event BetPlaced(
        uint256 indexed marketId,
        address indexed user,
        bool outcome,
        uint256 amount
    );
    
    /// @notice Emitted when a market is resolved
    event MarketResolved(
        uint256 indexed marketId,
        bool winningOutcome,
        uint256 yesTotal,
        uint256 noTotal
    );
    
    /// @notice Emitted when a market is voided
    event MarketVoided(uint256 indexed marketId);
    
    /// @notice Emitted when a user withdraws winnings or refund
    event WinningsWithdrawn(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount
    );
    
    /// @notice Emitted when admin claims dead pool funds
    event DeadPoolFundsClaimed(
        uint256 indexed marketId,
        address indexed admin,
        uint256 amount
    );
    
    /// @notice Thrown when a market does not exist
    error MarketNotFound();
    
    /// @notice Thrown when trying to bet on a closed market
    error MarketClosed();
    
    /// @notice Thrown when a user tries to bet twice on the same market
    error AlreadyBet();
    
    /// @notice Thrown when trying to resolve an already resolved market
    error MarketAlreadyResolved();
    
    /// @notice Thrown when trying to resolve a market that hasn't closed yet
    error MarketNotClosed();
    
    /// @notice Thrown when a user tries to withdraw with no winnings
    error NoWinnings();
    
    /// @notice Thrown when a user has already withdrawn
    error AlreadyWithdrawn();
    
    /// @notice Thrown when trying to interact with a voided market
    error MarketIsVoided();
    
    /// @notice Thrown when trying to interact with a non-voided market expecting it to be voided
    error MarketNotVoided();
    
    /// @notice Thrown when trying to void an already resolved market
    error CannotVoidResolvedMarket();
    
    /// @notice Thrown when trying to bet on a side that has reached its dynamic cap
    error BettingSideFull();
    
    /// @notice Thrown when trying to claim dead pool funds that don't exist
    error NoDeadPoolFunds();
    
    /// @notice Thrown when trying to claim already claimed dead pool funds
    error DeadPoolAlreadyClaimed();
    
    /**
     * @dev Constructor sets the USDC token address and initializes ownership
     * @param _usdc The address of the USDC token contract
     */
    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }
    
    /**
     * @notice Creates a new prediction market
     * @dev Any user can create markets, only admin can resolve them
     * @param question The question for the market
     * @param closeTime Timestamp when betting closes
     * @return marketId The ID of the created market
     */
    function createMarket(
        string calldata question,
        uint256 closeTime
    ) external returns (uint256 marketId) {
        require(bytes(question).length > 0, "Question cannot be empty");
        require(closeTime > block.timestamp, "Close time must be in the future");
        
        marketId = marketCounter++;
        
        markets[marketId] = Market({
            question: question,
            closeTime: closeTime,
            resolved: false,
            winningOutcome: false,
            yesTotal: 0,
            noTotal: 0,
            yesCount: 0,
            noCount: 0,
            voided: false,
            createdAt: block.timestamp,
            creator: msg.sender
        });
        
        emit MarketCreated(marketId, msg.sender, question, closeTime, block.timestamp);
    }
    
    /**
     * @notice Places a bet on a market
     * @dev Requires prior USDC approval of BET_AMOUNT
     * @param marketId The ID of the market to bet on
     * @param outcome The outcome to bet on (true = Yes, false = No)
     */
    function placeBet(uint256 marketId, bool outcome) external nonReentrant {
        Market storage market = markets[marketId];
        
        if (market.createdAt == 0) revert MarketNotFound();
        if (block.timestamp >= market.closeTime) revert MarketClosed();
        if (market.resolved) revert MarketAlreadyResolved();
        if (market.voided) revert MarketIsVoided();
        if (userBets[marketId][msg.sender].hasBet) revert AlreadyBet();
        
        // Check dynamic betting cap for this side
        uint256 currentSideBets = outcome ? market.yesCount : market.noCount;
        uint256 maxAllowed = getDynamicCap(marketId, outcome);
        if (currentSideBets >= maxAllowed) revert BettingSideFull();
        
        // Transfer USDC from user to contract
        require(
            usdc.transferFrom(msg.sender, address(this), BET_AMOUNT),
            "USDC transfer failed"
        );
        
        // Record the user's bet
        userBets[marketId][msg.sender] = UserBet({
            hasBet: true,
            outcome: outcome,
            withdrawn: false
        });
        
        // Add user to participants list
        marketParticipants[marketId].push(msg.sender);
        
        // Update market totals
        if (outcome) {
            market.yesTotal += BET_AMOUNT;
            market.yesCount++;
        } else {
            market.noTotal += BET_AMOUNT;
            market.noCount++;
        }
        
        emit BetPlaced(marketId, msg.sender, outcome, BET_AMOUNT);
    }
    
    /**
     * @notice Resolves a market with the winning outcome
     * @dev Only the contract owner can resolve markets
     * @param marketId The ID of the market to resolve
     * @param winningOutcome The winning outcome (true = Yes, false = No)
     */
    function resolveMarket(
        uint256 marketId,
        bool winningOutcome
    ) external onlyOwner {
        Market storage market = markets[marketId];
        
        if (market.createdAt == 0) revert MarketNotFound();
        if (market.resolved) revert MarketAlreadyResolved();
        if (market.voided) revert MarketIsVoided();
        if (block.timestamp < market.closeTime) revert MarketNotClosed();
        
        market.resolved = true;
        market.winningOutcome = winningOutcome;
        
        emit MarketResolved(marketId, winningOutcome, market.yesTotal, market.noTotal);
    }
    
    /**
     * @notice Voids a market, allowing all participants to get refunds
     * @dev Only the contract owner can void markets
     * @param marketId The ID of the market to void
     */
    function voidMarket(uint256 marketId) external onlyOwner {
        Market storage market = markets[marketId];
        
        if (market.createdAt == 0) revert MarketNotFound();
        if (market.resolved) revert CannotVoidResolvedMarket();
        
        market.voided = true;
        
        emit MarketVoided(marketId);
    }
    
    /**
     * @notice Allows winners to withdraw their winnings
     * @param marketId The ID of the market to withdraw from
     */
    function withdrawWinnings(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        UserBet storage userBet = userBets[marketId][msg.sender];
        
        if (market.createdAt == 0) revert MarketNotFound();
        if (!market.resolved) revert MarketAlreadyResolved();
        if (market.voided) revert MarketIsVoided();
        if (!userBet.hasBet) revert NoWinnings();
        if (userBet.withdrawn) revert AlreadyWithdrawn();
        
        // Check if user won
        if (userBet.outcome != market.winningOutcome) revert NoWinnings();
        
        uint256 winnings = calculateWinnings(marketId, msg.sender);
        if (winnings == 0) revert NoWinnings();
        
        userBet.withdrawn = true;
        
        require(usdc.transfer(msg.sender, winnings), "USDC transfer failed");
        
        emit WinningsWithdrawn(marketId, msg.sender, winnings);
    }
    
    /**
     * @notice Allows participants to withdraw refunds from voided markets
     * @param marketId The ID of the voided market to withdraw from
     */
    function withdrawRefund(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        UserBet storage userBet = userBets[marketId][msg.sender];
        
        if (market.createdAt == 0) revert MarketNotFound();
        if (!market.voided) revert MarketNotVoided();
        if (!userBet.hasBet) revert NoWinnings();
        if (userBet.withdrawn) revert AlreadyWithdrawn();
        
        userBet.withdrawn = true;
        
        require(usdc.transfer(msg.sender, BET_AMOUNT), "USDC transfer failed");
        
        emit WinningsWithdrawn(marketId, msg.sender, BET_AMOUNT);
    }
    
    /**
     * @notice Calculates the winnings for a user in a specific market
     * @param marketId The ID of the market
     * @param user The address of the user
     * @return winnings The amount of USDC the user can withdraw
     */
    function calculateWinnings(
        uint256 marketId,
        address user
    ) public view returns (uint256 winnings) {
        Market storage market = markets[marketId];
        UserBet storage userBet = userBets[marketId][user];
        
        if (!market.resolved || market.voided || !userBet.hasBet || userBet.withdrawn) {
            return 0;
        }
        
        // Check if user won
        if (userBet.outcome != market.winningOutcome) {
            return 0;
        }
        
        uint256 winningPool = userBet.outcome ? market.yesTotal : market.noTotal;
        uint256 losingPool = userBet.outcome ? market.noTotal : market.yesTotal;
        
        if (winningPool == 0) {
            return 0;
        }
        
        // Calculate base pro-rata winnings: stake + (losing pool * stake / winning pool)
        uint256 baseWinnings = BET_AMOUNT + (losingPool * BET_AMOUNT) / winningPool;
        
        // Apply payout multiplier based on when user bet and market imbalance
        uint256 multiplier = getPayoutMultiplier(marketId, userBet.outcome);
        winnings = (baseWinnings * multiplier) / MULTIPLIER_BASE;
    }
    
    /**
     * @notice Gets the details of a market
     * @param marketId The ID of the market
     * @return market The market struct
     */
    function getMarket(uint256 marketId) external view returns (Market memory market) {
        if (markets[marketId].createdAt == 0) revert MarketNotFound();
        return markets[marketId];
    }
    
    /**
     * @notice Gets a user's bet for a specific market
     * @param marketId The ID of the market
     * @param user The address of the user
     * @return userBet The user's bet struct
     */
    function getUserBet(
        uint256 marketId,
        address user
    ) external view returns (UserBet memory userBet) {
        return userBets[marketId][user];
    }
    
    /**
     * @notice Gets all participants for a specific market
     * @param marketId The ID of the market
     * @return participants Array of participant addresses
     */
    function getMarketParticipants(
        uint256 marketId
    ) external view returns (address[] memory participants) {
        return marketParticipants[marketId];
    }
    
    /**
     * @notice Calculates the payout multiplier for a given side based on bet imbalance
     * @dev AMM-lite system: minority side gets better odds, majority side gets worse odds
     * @param marketId The ID of the market
     * @param outcome The outcome to check (true = Yes, false = No)
     * @return multiplier The payout multiplier (100 = 1.0x, 150 = 1.5x, 80 = 0.8x)
     */
    function getPayoutMultiplier(
        uint256 marketId,
        bool outcome
    ) public view returns (uint256 multiplier) {
        Market storage market = markets[marketId];
        
        if (market.createdAt == 0) return MULTIPLIER_BASE; // 1.0x for non-existent markets
        
        uint256 yesCount = market.yesCount;
        uint256 noCount = market.noCount;
        uint256 totalCount = yesCount + noCount;
        
        // No bets yet, return base multiplier
        if (totalCount == 0) return MULTIPLIER_BASE;
        
        uint256 sideCount = outcome ? yesCount : noCount;
        uint256 otherCount = outcome ? noCount : yesCount;
        
        // First bet on empty side gets bonus
        if (sideCount == 0 && otherCount > 0) return 150; // 1.5x
        
        // If only one side has bets, don't penalize it - give base multiplier
        if (sideCount > 0 && otherCount == 0) return MULTIPLIER_BASE; // 1.0x
        
        // Calculate imbalance ratio (percentage on this side)
        uint256 sidePercentage = (sideCount * 100) / totalCount;
        
        // Multiplier based on how much of a minority/majority this side is
        if (sidePercentage <= 20) {
            return 150; // 1.5x for strong minority (≤20%)
        } else if (sidePercentage <= 35) {
            return 125; // 1.25x for moderate minority (≤35%)
        } else if (sidePercentage <= 45) {
            return 110; // 1.1x for slight minority (≤45%)
        } else if (sidePercentage >= 80) {
            return 75;  // 0.75x for overwhelming majority (≥80%)
        } else if (sidePercentage >= 65) {
            return 85;  // 0.85x for strong majority (≥65%)
        } else {
            return MULTIPLIER_BASE; // 1.0x for balanced market (45-65%)
        }
    }
    
    /**
     * @notice Calculates the dynamic betting cap for a given side
     * @dev Prevents extreme imbalances by reducing caps as one side dominates
     * @param marketId The ID of the market
     * @param outcome The outcome to check (true = Yes, false = No)
     * @return cap The maximum number of bets allowed on this side
     */
    function getDynamicCap(
        uint256 marketId,
        bool outcome
    ) public view returns (uint256 cap) {
        Market storage market = markets[marketId];
        
        if (market.createdAt == 0) return BASE_MAX_BETS_PER_SIDE;
        
        uint256 yesCount = market.yesCount;
        uint256 noCount = market.noCount;
        uint256 totalCount = yesCount + noCount;
        
        // Early in the market, allow full capacity
        if (totalCount < 4) return BASE_MAX_BETS_PER_SIDE;
        
        uint256 sideCount = outcome ? yesCount : noCount;
        uint256 otherCount = outcome ? noCount : yesCount;
        
        uint256 calculatedCap;
        
        // If this side is already dominant, reduce its cap
        if (sideCount >= otherCount * 2) {
            // If 2:1 ratio or worse, cap at current + 2 more
            calculatedCap = sideCount + 2;
        } else if (sideCount > otherCount) {
            // If ahead but not 2:1, cap at current + 4 more  
            calculatedCap = sideCount + 4;
        } else {
            // If behind or equal, allow full capacity
            calculatedCap = BASE_MAX_BETS_PER_SIDE;
        }
        
        // Never exceed the base maximum
        return calculatedCap > BASE_MAX_BETS_PER_SIDE ? BASE_MAX_BETS_PER_SIDE : calculatedCap;
    }
    
    /**
     * @notice Checks if a market is a dead pool (resolved with zero winners)
     * @param marketId The ID of the market to check
     * @return isDeadPool True if the market is a dead pool
     */
    function isDeadPoolMarket(uint256 marketId) public view returns (bool isDeadPool) {
        Market storage market = markets[marketId];
        
        if (!market.resolved || market.voided || market.createdAt == 0) {
            return false;
        }
        
        // Check if the winning side has zero bets
        uint256 winningPool = market.winningOutcome ? market.yesTotal : market.noTotal;
        return winningPool == 0;
    }
    
    /**
     * @notice Allows admin to claim funds from dead pool markets
     * @dev Dead pool occurs when market resolves but winning side has zero bets
     * @param marketId The ID of the dead pool market
     */
    function claimDeadPoolFunds(uint256 marketId) external onlyOwner nonReentrant {
        Market storage market = markets[marketId];
        
        if (market.createdAt == 0) revert MarketNotFound();
        if (market.voided) revert MarketIsVoided();
        if (!market.resolved) revert MarketAlreadyResolved();
        if (deadPoolClaimed[marketId]) revert DeadPoolAlreadyClaimed();
        
        // Verify this is actually a dead pool
        if (!isDeadPoolMarket(marketId)) revert NoDeadPoolFunds();
        
        // Calculate total pool amount
        uint256 totalPool = market.yesTotal + market.noTotal;
        if (totalPool == 0) revert NoDeadPoolFunds();
        
        // Mark as claimed to prevent double-claiming
        deadPoolClaimed[marketId] = true;
        
        // Transfer funds to admin
        require(usdc.transfer(msg.sender, totalPool), "USDC transfer failed");
        
        emit DeadPoolFundsClaimed(marketId, msg.sender, totalPool);
    }
    
    /**
     * @notice Emergency function to withdraw stuck tokens (only owner)
     * @dev Should only be used in emergency situations
     * @param token The token address to withdraw
     * @param amount The amount to withdraw
     * @param to The address to send tokens to
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        IERC20(token).transfer(to, amount);
    }
}