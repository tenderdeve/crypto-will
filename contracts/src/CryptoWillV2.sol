// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ICryptoWillV2} from "./interfaces/ICryptoWillV2.sol";

/// @title CryptoWillV2
/// @notice Dead man's switch for crypto wallets — V2 with multi-will support.
///         Each address can create up to MAX_WILLS_PER_ADDRESS independent wills,
///         each with its own beneficiary, token list, grace period, and ETH deposit.
/// @dev Approval-based for ERC-20 tokens (non-custodial). Custodial for ETH deposits only.
///      ETH is distributed via pull-payment to avoid beneficiary contract compatibility issues.
contract CryptoWillV2 is ICryptoWillV2, ReentrancyGuard, EIP712 {
    // ─── Constants ──────────────────────────────────────────────────────

    /// @notice Minimum grace period: 30 days
    uint256 public constant MIN_GRACE_PERIOD = 30 days;

    /// @notice Maximum number of tokens per will (prevents gas limit DoS)
    uint256 public constant MAX_TOKENS = 50;

    /// @notice Maximum number of active wills per address
    uint256 public constant MAX_WILLS_PER_ADDRESS = 10;

    /// @notice EIP-712 typehash for AliveProof struct
    bytes32 public constant ALIVE_TYPEHASH =
        keccak256("AliveProof(address owner,uint256 nonce,uint256 issuedAt)");

    /// @notice Maximum number of guardians per will
    uint256 public constant MAX_GUARDIANS = 5;

    /// @notice Minimum voting window: 7 days
    uint256 public constant MIN_VOTING_WINDOW = 7 days;

    /// @notice Maximum voting window: 30 days
    uint256 public constant MAX_VOTING_WINDOW = 30 days;

    // ─── State ──────────────────────────────────────────────────────────

    /// @notice Will data: owner => willId => Will
    mapping(address => mapping(uint256 => Will)) public wills;

    /// @notice Total wills created by each owner (auto-increment counter, includes revoked/executed)
    mapping(address => uint256) public willCount;

    /// @notice Number of currently active wills per owner (enforce limit)
    mapping(address => uint256) public activeWillCount;

    /// @notice ETH balances deposited per will: owner => willId => balance
    mapping(address => mapping(uint256 => uint256)) public ethBalances;

    /// @notice ETH owed to beneficiaries after will execution (pull-payment, per beneficiary)
    mapping(address => uint256) public pendingETH;

    /// @notice Nonce per will owner for EIP-712 alive proofs (prevents replay)
    mapping(address => uint256) public aliveNonce;

    /// @notice Guardian votes: keccak256(owner, willId) => guardian => voted
    mapping(bytes32 => mapping(address => bool)) public guardianVotes;

    /// @notice Guardian vote count: keccak256(owner, willId) => count
    mapping(bytes32 => uint256) public guardianVoteCount;

    /// @notice Voting start timestamp: keccak256(owner, willId) => timestamp
    mapping(bytes32 => uint256) public votingStartedAt;

    // ─── Constructor ──────────────────────────────────────────────────────

    constructor() EIP712("ChainWill", "2") {}

    // ─── External Functions ─────────────────────────────────────────────

    /// @inheritdoc ICryptoWillV2
    function createWill(
        address beneficiary,
        address[] calldata tokens,
        uint256 gracePeriod
    ) external returns (uint256 willId) {
        // Checks
        if (activeWillCount[msg.sender] >= MAX_WILLS_PER_ADDRESS) revert TooManyWills();
        if (beneficiary == address(0) || beneficiary == msg.sender) revert InvalidBeneficiary();
        if (tokens.length == 0) revert NoTokensSpecified();
        if (tokens.length > MAX_TOKENS) revert TooManyTokens();
        if (gracePeriod < MIN_GRACE_PERIOD) revert GracePeriodTooShort();

        // Effects — assign will ID and store
        willId = willCount[msg.sender];
        willCount[msg.sender] = willId + 1;
        activeWillCount[msg.sender] += 1;

        Will storage w = wills[msg.sender][willId];
        w.owner = msg.sender;
        w.beneficiary = beneficiary;
        w.tokens = tokens;
        w.lastAlive = block.timestamp;
        w.gracePeriod = gracePeriod;
        w.active = true;
        // guardianConfig left empty (no guardians by default)

        emit WillCreated(msg.sender, beneficiary, gracePeriod, willId);
    }

    /// @inheritdoc ICryptoWillV2
    function signAlive(uint256 willId) external {
        if (willId >= willCount[msg.sender]) revert WillIdOutOfRange();

        Will storage w = wills[msg.sender][willId];
        if (w.owner == address(0)) revert WillNotFound();
        if (!w.active) revert WillNotActive();

        w.lastAlive = block.timestamp;

        emit AliveConfirmed(msg.sender, block.timestamp, willId);
    }

    /// @inheritdoc ICryptoWillV2
    function signAlive() external {
        uint256 count = willCount[msg.sender];
        if (count == 0) revert WillNotFound();

        bool foundActive = false;
        for (uint256 i = 0; i < count; i++) {
            Will storage w = wills[msg.sender][i];
            if (w.active) {
                w.lastAlive = block.timestamp;
                foundActive = true;
            }
        }

        if (!foundActive) revert WillNotActive();

        // willId = type(uint256).max signals "all wills refreshed"
        emit AliveConfirmed(msg.sender, block.timestamp, type(uint256).max);
    }

    /// @inheritdoc ICryptoWillV2
    function signAliveBySig(
        address owner,
        uint256 nonce,
        uint256 issuedAt,
        bytes calldata signature
    ) external {
        uint256 count = willCount[owner];
        if (count == 0) revert WillNotFound();
        if (nonce != aliveNonce[owner]) revert InvalidNonce();
        if (block.timestamp > issuedAt + 7 days) revert ProofExpired();

        bytes32 structHash = keccak256(
            abi.encode(ALIVE_TYPEHASH, owner, nonce, issuedAt)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        if (signer != owner) revert InvalidSignature();

        aliveNonce[owner] += 1;

        // Refresh all active wills
        bool foundActive = false;
        for (uint256 i = 0; i < count; i++) {
            Will storage w = wills[owner][i];
            if (w.active) {
                w.lastAlive = block.timestamp;
                foundActive = true;
            }
        }

        if (!foundActive) revert WillNotActive();

        emit AliveConfirmed(owner, block.timestamp, type(uint256).max);
    }

    /// @inheritdoc ICryptoWillV2
    function executeWill(address owner, uint256 willId) external nonReentrant {
        if (willId >= willCount[owner]) revert WillIdOutOfRange();

        Will storage w = wills[owner][willId];

        // Checks
        if (w.owner == address(0)) revert WillNotFound();
        if (!w.active) revert WillNotActive();
        if (block.timestamp < w.lastAlive + w.gracePeriod) revert GracePeriodNotExpired();

        // Guardian check — if guardians are configured, require voting
        if (w.guardianConfig.guardians.length > 0) {
            bytes32 key = keccak256(abi.encodePacked(owner, willId));
            if (votingStartedAt[key] == 0) revert VotingNotStarted();
            if (guardianVoteCount[key] < w.guardianConfig.threshold) revert ThresholdNotMet();
            if (block.timestamp > votingStartedAt[key] + w.guardianConfig.votingWindow) revert VotingWindowExpired();
        }

        // Effects — cache values before delete
        address beneficiary = w.beneficiary;
        address[] memory tokens = w.tokens;
        uint256 tokenCount = tokens.length;

        uint256 ethAmount = ethBalances[owner][willId];
        ethBalances[owner][willId] = 0;

        // Pull-payment: credit ETH to beneficiary rather than pushing
        if (ethAmount > 0) {
            pendingETH[beneficiary] += ethAmount;
            emit ETHPendingClaim(beneficiary, ethAmount);
        }

        // Mark inactive and decrement active count
        w.active = false;
        activeWillCount[owner] -= 1;

        // Interactions — transfer each ERC-20 token individually, skipping failures
        for (uint256 i = 0; i < tokenCount; i++) {
            IERC20 token = IERC20(tokens[i]);
            uint256 allowance = token.allowance(owner, address(this));
            if (allowance == 0) continue;

            uint256 balance = token.balanceOf(owner);
            uint256 amount = allowance < balance ? allowance : balance;
            if (amount == 0) continue;

            try token.transferFrom(owner, beneficiary, amount) returns (bool ok) {
                if (!ok) {
                    emit TokenTransferFailed(address(token), owner, beneficiary, amount);
                }
            } catch {
                emit TokenTransferFailed(address(token), owner, beneficiary, amount);
            }
        }

        emit WillExecuted(owner, beneficiary, tokenCount, willId);
    }

    /// @inheritdoc ICryptoWillV2
    function revokeWill(uint256 willId) external nonReentrant {
        if (willId >= willCount[msg.sender]) revert WillIdOutOfRange();

        Will storage w = wills[msg.sender][willId];
        if (w.owner == address(0)) revert WillNotFound();
        if (!w.active) revert WillNotActive();

        // Effects — cache ETH, mark inactive
        uint256 ethAmount = ethBalances[msg.sender][willId];
        ethBalances[msg.sender][willId] = 0;
        w.active = false;
        activeWillCount[msg.sender] -= 1;

        // Interactions — refund deposited ETH to owner
        if (ethAmount > 0) {
            (bool success,) = msg.sender.call{value: ethAmount}("");
            if (!success) revert TransferFailed();
        }

        emit WillRevoked(msg.sender, willId);
    }

    /// @inheritdoc ICryptoWillV2
    function updateBeneficiary(uint256 willId, address newBeneficiary) external {
        if (willId >= willCount[msg.sender]) revert WillIdOutOfRange();

        Will storage w = wills[msg.sender][willId];
        if (w.owner == address(0)) revert WillNotFound();
        if (!w.active) revert WillNotActive();
        if (newBeneficiary == address(0) || newBeneficiary == msg.sender) {
            revert InvalidBeneficiary();
        }

        w.beneficiary = newBeneficiary;

        emit BeneficiaryUpdated(msg.sender, newBeneficiary, willId);
    }

    /// @inheritdoc ICryptoWillV2
    function updateTokens(uint256 willId, address[] calldata newTokens) external {
        if (willId >= willCount[msg.sender]) revert WillIdOutOfRange();

        Will storage w = wills[msg.sender][willId];
        if (w.owner == address(0)) revert WillNotFound();
        if (!w.active) revert WillNotActive();
        if (newTokens.length == 0) revert NoTokensSpecified();
        if (newTokens.length > MAX_TOKENS) revert TooManyTokens();

        w.tokens = newTokens;

        emit TokensUpdated(msg.sender, newTokens, willId);
    }

    /// @inheritdoc ICryptoWillV2
    function depositETH(uint256 willId) external payable nonReentrant {
        if (willId >= willCount[msg.sender]) revert WillIdOutOfRange();

        Will storage w = wills[msg.sender][willId];
        if (w.owner == address(0)) revert WillNotFound();
        if (!w.active) revert WillNotActive();
        if (msg.value == 0) revert ZeroETHDeposit();

        ethBalances[msg.sender][willId] += msg.value;

        emit ETHDeposited(msg.sender, msg.value, willId);
    }

    /// @inheritdoc ICryptoWillV2
    function claimETH() external nonReentrant {
        uint256 amount = pendingETH[msg.sender];
        if (amount == 0) revert NoETHPending();

        // Effects before interaction
        pendingETH[msg.sender] = 0;

        (bool success,) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit ETHClaimed(msg.sender, amount);
    }

    /// @inheritdoc ICryptoWillV2
    function getWill(address owner, uint256 willId) external view returns (Will memory) {
        return wills[owner][willId];
    }

    /// @inheritdoc ICryptoWillV2
    function getWillCount(address owner) external view returns (uint256) {
        return willCount[owner];
    }

    /// @inheritdoc ICryptoWillV2
    function getActiveWillIds(address owner) external view returns (uint256[] memory) {
        uint256 count = willCount[owner];
        uint256 activeCount = activeWillCount[owner];

        uint256[] memory ids = new uint256[](activeCount);
        uint256 idx = 0;

        for (uint256 i = 0; i < count; i++) {
            if (wills[owner][i].active) {
                ids[idx] = i;
                idx++;
            }
        }

        return ids;
    }

    /// @notice Returns the EIP-712 domain separator used for alive proofs
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // ─── Guardian Functions ─────────────────────────────────────────────

    /// @inheritdoc ICryptoWillV2
    function setGuardians(
        uint256 willId,
        address[] calldata guardians,
        uint8 threshold,
        uint256 votingWindow
    ) external {
        if (willId >= willCount[msg.sender]) revert WillIdOutOfRange();

        Will storage w = wills[msg.sender][willId];
        if (w.owner == address(0)) revert WillNotFound();
        if (!w.active) revert WillNotActive();

        bytes32 key = keccak256(abi.encodePacked(msg.sender, willId));

        // Reset any active voting state from old guardians
        _resetVotingState(key, w.guardianConfig.guardians);

        // Allow clearing guardians (empty array with threshold 0)
        if (guardians.length == 0) {
            delete w.guardianConfig;
            emit GuardiansSet(msg.sender, willId, guardians, 0);
            return;
        }

        if (guardians.length > MAX_GUARDIANS) revert TooManyGuardians();
        if (threshold == 0 || threshold > guardians.length) revert InvalidThreshold();
        if (votingWindow < MIN_VOTING_WINDOW || votingWindow > MAX_VOTING_WINDOW) revert InvalidVotingWindow();

        w.guardianConfig.guardians = guardians;
        w.guardianConfig.threshold = threshold;
        w.guardianConfig.votingWindow = votingWindow;

        emit GuardiansSet(msg.sender, willId, guardians, threshold);
    }

    /// @inheritdoc ICryptoWillV2
    function startVoting(address owner, uint256 willId) external {
        if (willId >= willCount[owner]) revert WillIdOutOfRange();

        Will storage w = wills[owner][willId];
        if (w.owner == address(0)) revert WillNotFound();
        if (!w.active) revert WillNotActive();
        if (w.guardianConfig.guardians.length == 0) revert NotAGuardian();
        if (block.timestamp < w.lastAlive + w.gracePeriod) revert GracePeriodNotExpired();

        bytes32 key = keccak256(abi.encodePacked(owner, willId));

        // Check if there's an active (non-expired) voting session
        if (votingStartedAt[key] > 0) {
            if (block.timestamp <= votingStartedAt[key] + w.guardianConfig.votingWindow) {
                revert VotingAlreadyStarted();
            }
            // Previous voting window expired — reset and allow new session
            _resetVotingState(key, w.guardianConfig.guardians);
            emit VotingWindowReset(owner, willId);
        }

        votingStartedAt[key] = block.timestamp;

        emit VotingStarted(owner, willId, block.timestamp);
    }

    /// @inheritdoc ICryptoWillV2
    function voteToExecute(address owner, uint256 willId) external {
        if (willId >= willCount[owner]) revert WillIdOutOfRange();

        Will storage w = wills[owner][willId];
        if (w.owner == address(0)) revert WillNotFound();
        if (!w.active) revert WillNotActive();

        bytes32 key = keccak256(abi.encodePacked(owner, willId));
        if (votingStartedAt[key] == 0) revert VotingNotStarted();
        if (block.timestamp > votingStartedAt[key] + w.guardianConfig.votingWindow) revert VotingWindowExpired();

        // Verify caller is a guardian
        if (!_isGuardian(w.guardianConfig.guardians, msg.sender)) revert NotAGuardian();
        if (guardianVotes[key][msg.sender]) revert AlreadyVoted();

        guardianVotes[key][msg.sender] = true;
        guardianVoteCount[key] += 1;

        emit GuardianVoted(owner, willId, msg.sender, "execute");
    }

    /// @inheritdoc ICryptoWillV2
    function voteAlive(address owner, uint256 willId) external {
        if (willId >= willCount[owner]) revert WillIdOutOfRange();

        Will storage w = wills[owner][willId];
        if (w.owner == address(0)) revert WillNotFound();
        if (!w.active) revert WillNotActive();

        bytes32 key = keccak256(abi.encodePacked(owner, willId));
        if (votingStartedAt[key] == 0) revert VotingNotStarted();
        if (block.timestamp > votingStartedAt[key] + w.guardianConfig.votingWindow) revert VotingWindowExpired();

        // Verify caller is a guardian
        if (!_isGuardian(w.guardianConfig.guardians, msg.sender)) revert NotAGuardian();
        if (guardianVotes[key][msg.sender]) revert AlreadyVoted();

        guardianVotes[key][msg.sender] = true;
        guardianVoteCount[key] += 1;

        emit GuardianVoted(owner, willId, msg.sender, "alive");

        // If threshold met with alive votes, reset lastAlive and clear voting
        if (guardianVoteCount[key] >= w.guardianConfig.threshold) {
            w.lastAlive = block.timestamp;
            _resetVotingState(key, w.guardianConfig.guardians);
            emit AliveConfirmed(owner, block.timestamp, willId);
        }
    }

    /// @inheritdoc ICryptoWillV2
    function getGuardianConfig(address owner, uint256 willId) external view returns (GuardianConfig memory) {
        return wills[owner][willId].guardianConfig;
    }

    /// @inheritdoc ICryptoWillV2
    function getVoteStatus(address owner, uint256 willId)
        external
        view
        returns (uint256 votes, uint256 threshold, uint256 votingEndsAt)
    {
        Will storage w = wills[owner][willId];
        bytes32 key = keccak256(abi.encodePacked(owner, willId));

        votes = guardianVoteCount[key];
        threshold = w.guardianConfig.threshold;
        votingEndsAt = votingStartedAt[key] > 0
            ? votingStartedAt[key] + w.guardianConfig.votingWindow
            : 0;
    }

    /// @inheritdoc ICryptoWillV2
    function hasVoted(address owner, uint256 willId, address guardian) external view returns (bool) {
        bytes32 key = keccak256(abi.encodePacked(owner, willId));
        return guardianVotes[key][guardian];
    }

    // ─── Internal Helpers ───────────────────────────────────────────────

    function _isGuardian(address[] storage guardians, address addr) internal view returns (bool) {
        uint256 len = guardians.length;
        for (uint256 i = 0; i < len; i++) {
            if (guardians[i] == addr) return true;
        }
        return false;
    }

    function _resetVotingState(bytes32 key, address[] storage guardians) internal {
        uint256 len = guardians.length;
        for (uint256 i = 0; i < len; i++) {
            guardianVotes[key][guardians[i]] = false;
        }
        guardianVoteCount[key] = 0;
        votingStartedAt[key] = 0;
    }
}
