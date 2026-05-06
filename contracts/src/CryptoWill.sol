// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ICryptoWill} from "./interfaces/ICryptoWill.sol";

/// @title CryptoWill
/// @notice Dead man's switch for crypto wallets — manages wills that automatically
///         transfer ERC-20 tokens and ETH to a beneficiary after a grace period expires.
/// @dev Approval-based for ERC-20 tokens (non-custodial). Custodial for ETH deposits only.
///      ETH is distributed via pull-payment to avoid beneficiary contract compatibility issues.
contract CryptoWill is ICryptoWill, ReentrancyGuard {
    // ─── Constants ──────────────────────────────────────────────────────

    /// @notice Minimum grace period: 30 days
    uint256 public constant MIN_GRACE_PERIOD = 30 days;

    /// @notice Maximum number of tokens per will (prevents gas limit DoS)
    uint256 public constant MAX_TOKENS = 50;

    // ─── State ──────────────────────────────────────────────────────────

    /// @notice Will data for each owner
    mapping(address => Will) public wills;

    /// @notice ETH balances deposited by each will owner (claimable on revoke)
    mapping(address => uint256) public ethBalances;

    /// @notice ETH owed to beneficiaries after will execution (pull-payment)
    mapping(address => uint256) public pendingETH;

    // ─── Modifiers ──────────────────────────────────────────────────────

    /// @dev Reverts if the caller does not have an active will
    modifier onlyWillOwner() {
        Will storage w = wills[msg.sender];
        if (w.owner == address(0)) revert WillNotFound();
        if (!w.active) revert WillNotActive();
        _;
    }

    // ─── External Functions ─────────────────────────────────────────────

    /// @inheritdoc ICryptoWill
    function createWill(
        address beneficiary,
        address[] calldata tokens,
        uint256 gracePeriod
    ) external {
        // Checks
        if (wills[msg.sender].owner != address(0)) revert WillAlreadyExists();
        if (beneficiary == address(0) || beneficiary == msg.sender) revert InvalidBeneficiary();
        if (tokens.length == 0) revert NoTokensSpecified();
        if (tokens.length > MAX_TOKENS) revert TooManyTokens();
        if (gracePeriod < MIN_GRACE_PERIOD) revert GracePeriodTooShort();

        // Effects
        wills[msg.sender] = Will({
            owner: msg.sender,
            beneficiary: beneficiary,
            tokens: tokens,
            lastAlive: block.timestamp,
            gracePeriod: gracePeriod,
            active: true
        });

        emit WillCreated(msg.sender, beneficiary, gracePeriod);
    }

    /// @inheritdoc ICryptoWill
    function signAlive() external onlyWillOwner {
        wills[msg.sender].lastAlive = block.timestamp;

        emit AliveConfirmed(msg.sender, block.timestamp);
    }

    /// @inheritdoc ICryptoWill
    function executeWill(address owner) external nonReentrant {
        Will storage w = wills[owner];

        // Checks
        if (w.owner == address(0)) revert WillNotFound();
        if (!w.active) revert WillNotActive();
        if (block.timestamp < w.lastAlive + w.gracePeriod) revert GracePeriodNotExpired();

        // Effects — cache values before delete
        address beneficiary = w.beneficiary;
        address[] memory tokens = w.tokens;
        uint256 tokenCount = tokens.length;

        uint256 ethAmount = ethBalances[owner];
        ethBalances[owner] = 0;

        // Pull-payment: credit ETH to beneficiary rather than pushing
        if (ethAmount > 0) {
            pendingETH[beneficiary] += ethAmount;
            emit ETHPendingClaim(beneficiary, ethAmount);
        }

        delete wills[owner];

        // Interactions — transfer each ERC-20 token individually, skipping failures
        // Each token is isolated: one bad token (blacklisted, paused, locked) cannot
        // block other tokens from transferring.
        for (uint256 i = 0; i < tokenCount; i++) {
            IERC20 token = IERC20(tokens[i]);
            uint256 allowance = token.allowance(owner, address(this));
            if (allowance == 0) continue;

            uint256 balance = token.balanceOf(owner);
            uint256 amount = allowance < balance ? allowance : balance;
            if (amount == 0) continue;

            // Use try/catch so a single token failure cannot revert the entire execution.
            // Tokens that return false (non-reverting failure) are also caught via the
            // bool check inside the try block.
            try token.transferFrom(owner, beneficiary, amount) returns (bool ok) {
                if (!ok) {
                    emit TokenTransferFailed(address(token), owner, beneficiary, amount);
                }
            } catch {
                emit TokenTransferFailed(address(token), owner, beneficiary, amount);
            }
        }

        emit WillExecuted(owner, beneficiary, tokenCount);
    }

    /// @inheritdoc ICryptoWill
    function revokeWill() external onlyWillOwner nonReentrant {
        // Effects — cache ETH before delete
        uint256 ethAmount = ethBalances[msg.sender];
        ethBalances[msg.sender] = 0;
        delete wills[msg.sender];

        // Interactions — refund deposited ETH to owner
        if (ethAmount > 0) {
            (bool success,) = msg.sender.call{value: ethAmount}("");
            if (!success) revert TransferFailed();
        }

        emit WillRevoked(msg.sender);
    }

    /// @inheritdoc ICryptoWill
    function updateBeneficiary(address newBeneficiary) external onlyWillOwner {
        if (newBeneficiary == address(0) || newBeneficiary == msg.sender) {
            revert InvalidBeneficiary();
        }

        wills[msg.sender].beneficiary = newBeneficiary;

        emit BeneficiaryUpdated(msg.sender, newBeneficiary);
    }

    /// @inheritdoc ICryptoWill
    function depositETH() external payable onlyWillOwner nonReentrant {
        if (msg.value == 0) revert ZeroETHDeposit();

        ethBalances[msg.sender] += msg.value;

        emit ETHDeposited(msg.sender, msg.value);
    }

    /// @inheritdoc ICryptoWill
    function claimETH() external nonReentrant {
        uint256 amount = pendingETH[msg.sender];
        if (amount == 0) revert NoETHPending();

        // Effects before interaction
        pendingETH[msg.sender] = 0;

        (bool success,) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit ETHClaimed(msg.sender, amount);
    }

    /// @inheritdoc ICryptoWill
    function getWill(address owner) external view returns (Will memory) {
        return wills[owner];
    }
}
