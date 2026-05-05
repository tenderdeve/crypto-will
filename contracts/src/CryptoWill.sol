// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ICryptoWill} from "./interfaces/ICryptoWill.sol";

/// @title CryptoWill
/// @notice Dead man's switch for crypto wallets — manages wills that automatically
///         transfer ERC-20 tokens and ETH to a beneficiary after a grace period expires.
/// @dev Approval-based for ERC-20 tokens (non-custodial). Custodial for ETH deposits only.
contract CryptoWill is ICryptoWill, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Constants ──────────────────────────────────────────────────────

    /// @notice Minimum grace period: 30 days
    uint256 public constant MIN_GRACE_PERIOD = 30 days;

    // ─── State ──────────────────────────────────────────────────────────

    /// @notice Will data for each owner
    mapping(address => Will) public wills;

    /// @notice ETH balances deposited by each will owner
    mapping(address => uint256) public ethBalances;

    // ─── Modifiers ──────────────────────────────────────────────────────

    /// @dev Reverts if the caller does not have an active will
    modifier onlyWillOwner() {
        Will storage w = wills[msg.sender];
        if (w.owner == address(0)) revert WillNotFound();
        if (!w.active) revert WillNotActive();
        if (w.owner != msg.sender) revert NotWillOwner();
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

        // Effects
        w.active = false;
        address beneficiary = w.beneficiary;
        uint256 tokenCount = w.tokens.length;

        uint256 ethAmount = ethBalances[owner];
        if (ethAmount > 0) {
            ethBalances[owner] = 0;
        }

        // Interactions — transfer all approved ERC-20 tokens
        for (uint256 i = 0; i < tokenCount; i++) {
            IERC20 token = IERC20(w.tokens[i]);
            uint256 allowance = token.allowance(owner, address(this));
            if (allowance > 0) {
                uint256 balance = token.balanceOf(owner);
                uint256 amount = allowance < balance ? allowance : balance;
                if (amount > 0) {
                    token.safeTransferFrom(owner, beneficiary, amount);
                }
            }
        }

        // Transfer deposited ETH to beneficiary
        if (ethAmount > 0) {
            (bool success,) = beneficiary.call{value: ethAmount}("");
            if (!success) revert TransferFailed();
        }

        emit WillExecuted(owner, beneficiary, tokenCount);
    }

    /// @inheritdoc ICryptoWill
    function revokeWill() external onlyWillOwner {
        // Effects
        wills[msg.sender].active = false;

        uint256 ethAmount = ethBalances[msg.sender];
        if (ethAmount > 0) {
            ethBalances[msg.sender] = 0;
        }

        // Interactions — refund deposited ETH
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
    function depositETH() external payable {
        Will storage w = wills[msg.sender];
        if (w.owner == address(0)) revert WillNotFound();
        if (!w.active) revert WillNotActive();

        ethBalances[msg.sender] += msg.value;

        emit ETHDeposited(msg.sender, msg.value);
    }

    /// @inheritdoc ICryptoWill
    function getWill(address owner) external view returns (Will memory) {
        return wills[owner];
    }
}
