// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {CryptoWillV2} from "../src/CryptoWillV2.sol";
import {ICryptoWillV2} from "../src/interfaces/ICryptoWillV2.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract CryptoWillV2GuardianTest is Test {
    CryptoWillV2 public cryptoWill;
    MockERC20 public token1;
    MockERC20 public token2;

    address public owner = makeAddr("owner");
    address public beneficiary = makeAddr("beneficiary");
    address public executor = makeAddr("executor");

    address public guardian1 = makeAddr("guardian1");
    address public guardian2 = makeAddr("guardian2");
    address public guardian3 = makeAddr("guardian3");
    address public guardian4 = makeAddr("guardian4");
    address public guardian5 = makeAddr("guardian5");
    address public nonGuardian = makeAddr("nonGuardian");

    uint256 public constant GRACE_PERIOD = 90 days;
    uint256 public constant VOTING_WINDOW = 14 days;

    function setUp() public {
        cryptoWill = new CryptoWillV2();
        token1 = new MockERC20("Token1", "TK1");
        token2 = new MockERC20("Token2", "TK2");

        token1.mint(owner, 1000 ether);
        token2.mint(owner, 500 ether);
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    function _createDefaultWill() internal returns (uint256) {
        address[] memory tokens = new address[](2);
        tokens[0] = address(token1);
        tokens[1] = address(token2);

        vm.prank(owner);
        return cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
    }

    function _approveTokens() internal {
        vm.startPrank(owner);
        token1.approve(address(cryptoWill), type(uint256).max);
        token2.approve(address(cryptoWill), type(uint256).max);
        vm.stopPrank();
    }

    function _setGuardians2of3(uint256 willId) internal {
        address[] memory guardians = new address[](3);
        guardians[0] = guardian1;
        guardians[1] = guardian2;
        guardians[2] = guardian3;

        vm.prank(owner);
        cryptoWill.setGuardians(willId, guardians, 2, VOTING_WINDOW);
    }

    function _setGuardians3of5(uint256 willId) internal {
        address[] memory guardians = new address[](5);
        guardians[0] = guardian1;
        guardians[1] = guardian2;
        guardians[2] = guardian3;
        guardians[3] = guardian4;
        guardians[4] = guardian5;

        vm.prank(owner);
        cryptoWill.setGuardians(willId, guardians, 3, VOTING_WINDOW);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  setGuardians: 2-of-3 configuration
    // ═══════════════════════════════════════════════════════════════════════

    function test_setGuardians_2of3() public {
        uint256 willId = _createDefaultWill();

        address[] memory guardians = new address[](3);
        guardians[0] = guardian1;
        guardians[1] = guardian2;
        guardians[2] = guardian3;

        vm.expectEmit(true, false, false, true);
        emit ICryptoWillV2.GuardiansSet(owner, willId, guardians, 2);

        vm.prank(owner);
        cryptoWill.setGuardians(willId, guardians, 2, VOTING_WINDOW);

        ICryptoWillV2.GuardianConfig memory config = cryptoWill.getGuardianConfig(owner, willId);
        assertEq(config.guardians.length, 3);
        assertEq(config.guardians[0], guardian1);
        assertEq(config.guardians[1], guardian2);
        assertEq(config.guardians[2], guardian3);
        assertEq(config.threshold, 2);
        assertEq(config.votingWindow, VOTING_WINDOW);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  setGuardians: 3-of-5 configuration
    // ═══════════════════════════════════════════════════════════════════════

    function test_setGuardians_3of5() public {
        uint256 willId = _createDefaultWill();
        _setGuardians3of5(willId);

        ICryptoWillV2.GuardianConfig memory config = cryptoWill.getGuardianConfig(owner, willId);
        assertEq(config.guardians.length, 5);
        assertEq(config.threshold, 3);
        assertEq(config.votingWindow, VOTING_WINDOW);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  startVoting: only after grace period expires
    // ═══════════════════════════════════════════════════════════════════════

    function test_startVoting_afterGracePeriodExpires() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);

        // Can't start voting before grace period expires
        vm.warp(block.timestamp + GRACE_PERIOD - 1);
        vm.expectRevert(ICryptoWillV2.GracePeriodNotExpired.selector);
        cryptoWill.startVoting(owner, willId);

        // Can start after grace period expires
        vm.warp(block.timestamp + 2);

        vm.expectEmit(true, false, false, true);
        emit ICryptoWillV2.VotingStarted(owner, willId, block.timestamp);

        cryptoWill.startVoting(owner, willId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Guardian votes: count increments, duplicate vote rejected
    // ═══════════════════════════════════════════════════════════════════════

    function test_voteToExecute_incrementsCount() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.startVoting(owner, willId);

        // Guardian 1 votes
        vm.prank(guardian1);
        cryptoWill.voteToExecute(owner, willId);

        (uint256 votes, uint256 threshold, uint256 votingEndsAt) = cryptoWill.getVoteStatus(owner, willId);
        assertEq(votes, 1);
        assertEq(threshold, 2);
        assertGt(votingEndsAt, 0);

        assertTrue(cryptoWill.hasVoted(owner, willId, guardian1));
        assertFalse(cryptoWill.hasVoted(owner, willId, guardian2));

        // Guardian 2 votes
        vm.prank(guardian2);
        cryptoWill.voteToExecute(owner, willId);

        (votes,,) = cryptoWill.getVoteStatus(owner, willId);
        assertEq(votes, 2);
    }

    function test_voteToExecute_duplicateVoteRejected() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.startVoting(owner, willId);

        vm.prank(guardian1);
        cryptoWill.voteToExecute(owner, willId);

        // Same guardian tries to vote again
        vm.prank(guardian1);
        vm.expectRevert(ICryptoWillV2.AlreadyVoted.selector);
        cryptoWill.voteToExecute(owner, willId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Execute after threshold met (within window)
    // ═══════════════════════════════════════════════════════════════════════

    function test_executeWill_afterThresholdMet() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);
        _approveTokens();

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.startVoting(owner, willId);

        // Two guardians vote (threshold = 2)
        vm.prank(guardian1);
        cryptoWill.voteToExecute(owner, willId);
        vm.prank(guardian2);
        cryptoWill.voteToExecute(owner, willId);

        // Execute should succeed
        vm.prank(executor);
        cryptoWill.executeWill(owner, willId);

        assertEq(token1.balanceOf(beneficiary), 1000 ether);
        assertEq(token2.balanceOf(beneficiary), 500 ether);
        assertFalse(cryptoWill.getWill(owner, willId).active);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Reject execution if threshold not met
    // ═══════════════════════════════════════════════════════════════════════

    function test_executeWill_revert_thresholdNotMet() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);
        _approveTokens();

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.startVoting(owner, willId);

        // Only 1 guardian votes (threshold = 2)
        vm.prank(guardian1);
        cryptoWill.voteToExecute(owner, willId);

        vm.prank(executor);
        vm.expectRevert(ICryptoWillV2.ThresholdNotMet.selector);
        cryptoWill.executeWill(owner, willId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Reject execution if voting window expired
    // ═══════════════════════════════════════════════════════════════════════

    function test_executeWill_revert_votingWindowExpired() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);
        _approveTokens();

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.startVoting(owner, willId);

        // Two guardians vote
        vm.prank(guardian1);
        cryptoWill.voteToExecute(owner, willId);
        vm.prank(guardian2);
        cryptoWill.voteToExecute(owner, willId);

        // Warp past voting window
        vm.warp(block.timestamp + VOTING_WINDOW + 1);

        vm.prank(executor);
        vm.expectRevert(ICryptoWillV2.VotingWindowExpired.selector);
        cryptoWill.executeWill(owner, willId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Reject execution if voting not started
    // ═══════════════════════════════════════════════════════════════════════

    function test_executeWill_revert_votingNotStarted() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);
        _approveTokens();

        vm.warp(block.timestamp + GRACE_PERIOD + 1);

        // Grace period expired, but voting not started
        vm.prank(executor);
        vm.expectRevert(ICryptoWillV2.VotingNotStarted.selector);
        cryptoWill.executeWill(owner, willId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Voting window expiry: new startVoting required
    // ═══════════════════════════════════════════════════════════════════════

    function test_votingWindowExpiry_requiresNewStartVoting() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.startVoting(owner, willId);

        // One guardian votes
        vm.prank(guardian1);
        cryptoWill.voteToExecute(owner, willId);

        // Voting window expires
        vm.warp(block.timestamp + VOTING_WINDOW + 1);

        // Voting expired, can't vote anymore
        vm.prank(guardian2);
        vm.expectRevert(ICryptoWillV2.VotingWindowExpired.selector);
        cryptoWill.voteToExecute(owner, willId);

        // New startVoting resets everything
        vm.expectEmit(true, false, false, true);
        emit ICryptoWillV2.VotingWindowReset(owner, willId);

        cryptoWill.startVoting(owner, willId);

        // Vote count is reset
        (uint256 votes,,) = cryptoWill.getVoteStatus(owner, willId);
        assertEq(votes, 0);

        // Previous voters can vote again
        assertFalse(cryptoWill.hasVoted(owner, willId, guardian1));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  voteAlive: if threshold met, resets lastAlive
    // ═══════════════════════════════════════════════════════════════════════

    function test_voteAlive_resetsLastAlive_onThreshold() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.startVoting(owner, willId);

        uint256 voteTime = block.timestamp;

        vm.prank(guardian1);
        cryptoWill.voteAlive(owner, willId);

        // Threshold not yet met — lastAlive should not be reset yet
        ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, willId);
        assertTrue(w.lastAlive < voteTime); // still the original create time

        vm.prank(guardian2);
        cryptoWill.voteAlive(owner, willId);

        // Threshold met — lastAlive should be reset
        w = cryptoWill.getWill(owner, willId);
        assertEq(w.lastAlive, voteTime);

        // Voting state should be cleared
        (uint256 votes,,) = cryptoWill.getVoteStatus(owner, willId);
        assertEq(votes, 0);

        assertFalse(cryptoWill.hasVoted(owner, willId, guardian1));
        assertFalse(cryptoWill.hasVoted(owner, willId, guardian2));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Non-guardian cannot vote
    // ═══════════════════════════════════════════════════════════════════════

    function test_voteToExecute_revert_notGuardian() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.startVoting(owner, willId);

        vm.prank(nonGuardian);
        vm.expectRevert(ICryptoWillV2.NotAGuardian.selector);
        cryptoWill.voteToExecute(owner, willId);
    }

    function test_voteAlive_revert_notGuardian() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.startVoting(owner, willId);

        vm.prank(nonGuardian);
        vm.expectRevert(ICryptoWillV2.NotAGuardian.selector);
        cryptoWill.voteAlive(owner, willId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Owner can change guardians while alive
    // ═══════════════════════════════════════════════════════════════════════

    function test_setGuardians_ownerCanChangeWhileAlive() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);

        // Update to different guardians
        address newGuardian = makeAddr("newGuardian");
        address[] memory newGuardians = new address[](2);
        newGuardians[0] = newGuardian;
        newGuardians[1] = guardian1;

        vm.prank(owner);
        cryptoWill.setGuardians(willId, newGuardians, 2, 7 days);

        ICryptoWillV2.GuardianConfig memory config = cryptoWill.getGuardianConfig(owner, willId);
        assertEq(config.guardians.length, 2);
        assertEq(config.guardians[0], newGuardian);
        assertEq(config.guardians[1], guardian1);
        assertEq(config.threshold, 2);
        assertEq(config.votingWindow, 7 days);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Will without guardians: original behavior (no voting required)
    // ═══════════════════════════════════════════════════════════════════════

    function test_executeWill_noGuardians_originalBehavior() public {
        uint256 willId = _createDefaultWill();
        _approveTokens();

        // No guardians set — execute directly after grace period
        vm.warp(block.timestamp + GRACE_PERIOD + 1);

        vm.prank(executor);
        cryptoWill.executeWill(owner, willId);

        assertEq(token1.balanceOf(beneficiary), 1000 ether);
        assertFalse(cryptoWill.getWill(owner, willId).active);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Remove all guardians: reverts to no-guardian behavior
    // ═══════════════════════════════════════════════════════════════════════

    function test_removeGuardians_revertsToNoGuardianBehavior() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);
        _approveTokens();

        // Remove guardians by setting empty array
        address[] memory empty = new address[](0);
        vm.prank(owner);
        cryptoWill.setGuardians(willId, empty, 0, 0);

        ICryptoWillV2.GuardianConfig memory config = cryptoWill.getGuardianConfig(owner, willId);
        assertEq(config.guardians.length, 0);
        assertEq(config.threshold, 0);

        // Execute directly after grace period — no voting needed
        vm.warp(block.timestamp + GRACE_PERIOD + 1);

        vm.prank(executor);
        cryptoWill.executeWill(owner, willId);

        assertEq(token1.balanceOf(beneficiary), 1000 ether);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Max guardians boundary (5 ok, 6 rejected)
    // ═══════════════════════════════════════════════════════════════════════

    function test_setGuardians_maxBoundary() public {
        uint256 willId = _createDefaultWill();

        // 5 guardians — should succeed
        address[] memory five = new address[](5);
        for (uint256 i = 0; i < 5; i++) {
            five[i] = address(uint160(100 + i));
        }
        vm.prank(owner);
        cryptoWill.setGuardians(willId, five, 3, VOTING_WINDOW);

        ICryptoWillV2.GuardianConfig memory config = cryptoWill.getGuardianConfig(owner, willId);
        assertEq(config.guardians.length, 5);

        // 6 guardians — should revert
        address[] memory six = new address[](6);
        for (uint256 i = 0; i < 6; i++) {
            six[i] = address(uint160(200 + i));
        }
        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.TooManyGuardians.selector);
        cryptoWill.setGuardians(willId, six, 3, VOTING_WINDOW);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Invalid threshold (0, > guardian count)
    // ═══════════════════════════════════════════════════════════════════════

    function test_setGuardians_revert_thresholdZero() public {
        uint256 willId = _createDefaultWill();

        address[] memory guardians = new address[](3);
        guardians[0] = guardian1;
        guardians[1] = guardian2;
        guardians[2] = guardian3;

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.InvalidThreshold.selector);
        cryptoWill.setGuardians(willId, guardians, 0, VOTING_WINDOW);
    }

    function test_setGuardians_revert_thresholdExceedsGuardianCount() public {
        uint256 willId = _createDefaultWill();

        address[] memory guardians = new address[](3);
        guardians[0] = guardian1;
        guardians[1] = guardian2;
        guardians[2] = guardian3;

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.InvalidThreshold.selector);
        cryptoWill.setGuardians(willId, guardians, 4, VOTING_WINDOW);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Invalid voting window
    // ═══════════════════════════════════════════════════════════════════════

    function test_setGuardians_revert_votingWindowTooShort() public {
        uint256 willId = _createDefaultWill();

        address[] memory guardians = new address[](3);
        guardians[0] = guardian1;
        guardians[1] = guardian2;
        guardians[2] = guardian3;

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.InvalidVotingWindow.selector);
        cryptoWill.setGuardians(willId, guardians, 2, 6 days);
    }

    function test_setGuardians_revert_votingWindowTooLong() public {
        uint256 willId = _createDefaultWill();

        address[] memory guardians = new address[](3);
        guardians[0] = guardian1;
        guardians[1] = guardian2;
        guardians[2] = guardian3;

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.InvalidVotingWindow.selector);
        cryptoWill.setGuardians(willId, guardians, 2, 31 days);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Voting window boundaries
    // ═══════════════════════════════════════════════════════════════════════

    function test_setGuardians_minVotingWindow() public {
        uint256 willId = _createDefaultWill();

        address[] memory guardians = new address[](2);
        guardians[0] = guardian1;
        guardians[1] = guardian2;

        vm.prank(owner);
        cryptoWill.setGuardians(willId, guardians, 2, 7 days);

        ICryptoWillV2.GuardianConfig memory config = cryptoWill.getGuardianConfig(owner, willId);
        assertEq(config.votingWindow, 7 days);
    }

    function test_setGuardians_maxVotingWindow() public {
        uint256 willId = _createDefaultWill();

        address[] memory guardians = new address[](2);
        guardians[0] = guardian1;
        guardians[1] = guardian2;

        vm.prank(owner);
        cryptoWill.setGuardians(willId, guardians, 2, 30 days);

        ICryptoWillV2.GuardianConfig memory config = cryptoWill.getGuardianConfig(owner, willId);
        assertEq(config.votingWindow, 30 days);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  startVoting: can't start twice (while window active)
    // ═══════════════════════════════════════════════════════════════════════

    function test_startVoting_revert_alreadyStarted() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.startVoting(owner, willId);

        // Try to start again while voting window active
        vm.expectRevert(ICryptoWillV2.VotingAlreadyStarted.selector);
        cryptoWill.startVoting(owner, willId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Voting not started: can't vote
    // ═══════════════════════════════════════════════════════════════════════

    function test_voteToExecute_revert_votingNotStarted() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);

        vm.prank(guardian1);
        vm.expectRevert(ICryptoWillV2.VotingNotStarted.selector);
        cryptoWill.voteToExecute(owner, willId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getVoteStatus view
    // ═══════════════════════════════════════════════════════════════════════

    function test_getVoteStatus_beforeVotingStarts() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);

        (uint256 votes, uint256 threshold, uint256 votingEndsAt) = cryptoWill.getVoteStatus(owner, willId);
        assertEq(votes, 0);
        assertEq(threshold, 2);
        assertEq(votingEndsAt, 0);
    }

    function test_getVoteStatus_afterVotingStarts() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        uint256 startTime = block.timestamp;
        cryptoWill.startVoting(owner, willId);

        (uint256 votes, uint256 threshold, uint256 votingEndsAt) = cryptoWill.getVoteStatus(owner, willId);
        assertEq(votes, 0);
        assertEq(threshold, 2);
        assertEq(votingEndsAt, startTime + VOTING_WINDOW);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Guardian event emissions
    // ═══════════════════════════════════════════════════════════════════════

    function test_voteToExecute_emitsEvent() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.startVoting(owner, willId);

        vm.expectEmit(true, false, true, true);
        emit ICryptoWillV2.GuardianVoted(owner, willId, guardian1, "execute");

        vm.prank(guardian1);
        cryptoWill.voteToExecute(owner, willId);
    }

    function test_voteAlive_emitsEvent() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.startVoting(owner, willId);

        vm.expectEmit(true, false, true, true);
        emit ICryptoWillV2.GuardianVoted(owner, willId, guardian1, "alive");

        vm.prank(guardian1);
        cryptoWill.voteAlive(owner, willId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  3-of-5 full lifecycle
    // ═══════════════════════════════════════════════════════════════════════

    function test_fullLifecycle_3of5() public {
        uint256 willId = _createDefaultWill();
        _setGuardians3of5(willId);
        _approveTokens();

        // Grace period expires
        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.startVoting(owner, willId);

        // 2 guardians vote — not enough
        vm.prank(guardian1);
        cryptoWill.voteToExecute(owner, willId);
        vm.prank(guardian3);
        cryptoWill.voteToExecute(owner, willId);

        vm.prank(executor);
        vm.expectRevert(ICryptoWillV2.ThresholdNotMet.selector);
        cryptoWill.executeWill(owner, willId);

        // 3rd guardian votes — threshold met
        vm.prank(guardian5);
        cryptoWill.voteToExecute(owner, willId);

        (uint256 votes,,) = cryptoWill.getVoteStatus(owner, willId);
        assertEq(votes, 3);

        vm.prank(executor);
        cryptoWill.executeWill(owner, willId);

        assertEq(token1.balanceOf(beneficiary), 1000 ether);
        assertEq(token2.balanceOf(beneficiary), 500 ether);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  setGuardians: non-owner can't set guardians
    // ═══════════════════════════════════════════════════════════════════════

    function test_setGuardians_revert_nonOwner() public {
        uint256 willId = _createDefaultWill();

        address[] memory guardians = new address[](2);
        guardians[0] = guardian1;
        guardians[1] = guardian2;

        // Non-owner tries to set guardians on owner's will — fails because willCount is 0 for non-owner
        vm.prank(nonGuardian);
        vm.expectRevert(ICryptoWillV2.WillIdOutOfRange.selector);
        cryptoWill.setGuardians(willId, guardians, 2, VOTING_WINDOW);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Changing guardians resets voting state
    // ═══════════════════════════════════════════════════════════════════════

    function test_setGuardians_resetsVotingState() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.startVoting(owner, willId);

        // Guardian1 votes
        vm.prank(guardian1);
        cryptoWill.voteToExecute(owner, willId);

        (uint256 votes,,) = cryptoWill.getVoteStatus(owner, willId);
        assertEq(votes, 1);

        // Owner changes guardians (refreshing signAlive first)
        vm.prank(owner);
        cryptoWill.signAlive(willId);

        // Now set new guardians
        address[] memory newGuardians = new address[](2);
        newGuardians[0] = guardian4;
        newGuardians[1] = guardian5;

        vm.prank(owner);
        cryptoWill.setGuardians(willId, newGuardians, 2, VOTING_WINDOW);

        // Old votes should be cleared
        (votes,,) = cryptoWill.getVoteStatus(owner, willId);
        assertEq(votes, 0);
        assertFalse(cryptoWill.hasVoted(owner, willId, guardian1));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  ETH deposit + guardian execution
    // ═══════════════════════════════════════════════════════════════════════

    function test_executeWill_withGuardians_andETH() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);
        _approveTokens();

        vm.deal(owner, 5 ether);
        vm.prank(owner);
        cryptoWill.depositETH{value: 3 ether}(willId);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.startVoting(owner, willId);

        vm.prank(guardian1);
        cryptoWill.voteToExecute(owner, willId);
        vm.prank(guardian2);
        cryptoWill.voteToExecute(owner, willId);

        vm.prank(executor);
        cryptoWill.executeWill(owner, willId);

        assertEq(cryptoWill.pendingETH(beneficiary), 3 ether);
        assertEq(token1.balanceOf(beneficiary), 1000 ether);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Fuzz: random guardian counts and thresholds
    // ═══════════════════════════════════════════════════════════════════════

    function testFuzz_setGuardians_validConfigurations(uint8 count, uint8 threshold) public {
        uint256 guardianCount = bound(uint256(count), 1, 5);
        uint256 thresholdVal = bound(uint256(threshold), 1, guardianCount);

        uint256 willId = _createDefaultWill();

        address[] memory guardians = new address[](guardianCount);
        for (uint256 i = 0; i < guardianCount; i++) {
            guardians[i] = address(uint160(500 + i));
        }

        vm.prank(owner);
        cryptoWill.setGuardians(willId, guardians, uint8(thresholdVal), VOTING_WINDOW);

        ICryptoWillV2.GuardianConfig memory config = cryptoWill.getGuardianConfig(owner, willId);
        assertEq(config.guardians.length, guardianCount);
        assertEq(config.threshold, thresholdVal);
    }

    function testFuzz_setGuardians_invalidConfigurations(uint8 count, uint8 threshold) public {
        // Ensure count > 5 or threshold > count or threshold == 0
        uint256 guardianCount = bound(uint256(count), 6, 20);

        uint256 willId = _createDefaultWill();

        address[] memory guardians = new address[](guardianCount);
        for (uint256 i = 0; i < guardianCount; i++) {
            guardians[i] = address(uint160(600 + i));
        }

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.TooManyGuardians.selector);
        cryptoWill.setGuardians(willId, guardians, 3, VOTING_WINDOW);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Fuzz: random voting window durations
    // ═══════════════════════════════════════════════════════════════════════

    function testFuzz_setGuardians_votingWindowBoundary(uint256 window) public {
        uint256 willId = _createDefaultWill();

        address[] memory guardians = new address[](2);
        guardians[0] = guardian1;
        guardians[1] = guardian2;

        window = bound(window, 0, 365 days);

        if (window < 7 days || window > 30 days) {
            vm.prank(owner);
            vm.expectRevert(ICryptoWillV2.InvalidVotingWindow.selector);
            cryptoWill.setGuardians(willId, guardians, 2, window);
        } else {
            vm.prank(owner);
            cryptoWill.setGuardians(willId, guardians, 2, window);

            ICryptoWillV2.GuardianConfig memory config = cryptoWill.getGuardianConfig(owner, willId);
            assertEq(config.votingWindow, window);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Fuzz: execute only works when threshold met within window
    // ═══════════════════════════════════════════════════════════════════════

    function testFuzz_guardianExecution(uint8 numVoters, uint256 timePassed) public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);
        _approveTokens();

        uint256 voterCount = bound(uint256(numVoters), 0, 3);
        timePassed = bound(timePassed, 0, VOTING_WINDOW + 7 days);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.startVoting(owner, willId);

        address[3] memory guardiansList = [guardian1, guardian2, guardian3];
        for (uint256 i = 0; i < voterCount; i++) {
            vm.prank(guardiansList[i]);
            cryptoWill.voteToExecute(owner, willId);
        }

        vm.warp(block.timestamp + timePassed);

        bool thresholdMet = voterCount >= 2;
        bool windowExpired = timePassed > VOTING_WINDOW;

        if (!thresholdMet) {
            vm.expectRevert(ICryptoWillV2.ThresholdNotMet.selector);
            cryptoWill.executeWill(owner, willId);
        } else if (windowExpired) {
            vm.expectRevert(ICryptoWillV2.VotingWindowExpired.selector);
            cryptoWill.executeWill(owner, willId);
        } else {
            cryptoWill.executeWill(owner, willId);
            assertFalse(cryptoWill.getWill(owner, willId).active);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  voteAlive: only one vote — doesn't reach threshold
    // ═══════════════════════════════════════════════════════════════════════

    function test_voteAlive_singleVote_doesNotResetAlive() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);

        uint256 createTime = block.timestamp;

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.startVoting(owner, willId);

        vm.prank(guardian1);
        cryptoWill.voteAlive(owner, willId);

        // Only 1 vote, threshold is 2 — lastAlive should NOT be reset
        ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, willId);
        assertEq(w.lastAlive, createTime);

        // Votes should still be counted
        (uint256 votes,,) = cryptoWill.getVoteStatus(owner, willId);
        assertEq(votes, 1);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  hasVoted view
    // ═══════════════════════════════════════════════════════════════════════

    function test_hasVoted_returnsCorrectState() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.startVoting(owner, willId);

        // Before voting
        assertFalse(cryptoWill.hasVoted(owner, willId, guardian1));

        // After voting
        vm.prank(guardian1);
        cryptoWill.voteToExecute(owner, willId);
        assertTrue(cryptoWill.hasVoted(owner, willId, guardian1));
        assertFalse(cryptoWill.hasVoted(owner, willId, guardian2));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Will with guardians: signAlive by owner doesn't bypass guardian flow
    // ═══════════════════════════════════════════════════════════════════════

    function test_signAlive_byOwner_resetsTimer_guardianStillRequired() public {
        uint256 willId = _createDefaultWill();
        _setGuardians2of3(willId);
        _approveTokens();

        // Grace period expires
        vm.warp(block.timestamp + GRACE_PERIOD + 1);

        // Owner signs alive — resets timer
        vm.prank(owner);
        cryptoWill.signAlive(willId);

        ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, willId);
        assertEq(w.lastAlive, block.timestamp);

        // Grace period expires again
        vm.warp(block.timestamp + GRACE_PERIOD + 1);

        // Still need voting to execute
        vm.prank(executor);
        vm.expectRevert(ICryptoWillV2.VotingNotStarted.selector);
        cryptoWill.executeWill(owner, willId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  setGuardians: threshold == guardian count (N-of-N)
    // ═══════════════════════════════════════════════════════════════════════

    function test_setGuardians_NofN() public {
        uint256 willId = _createDefaultWill();

        address[] memory guardians = new address[](3);
        guardians[0] = guardian1;
        guardians[1] = guardian2;
        guardians[2] = guardian3;

        vm.prank(owner);
        cryptoWill.setGuardians(willId, guardians, 3, VOTING_WINDOW);

        ICryptoWillV2.GuardianConfig memory config = cryptoWill.getGuardianConfig(owner, willId);
        assertEq(config.threshold, 3);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  startVoting: only after grace expired (not by guardian alone)
    // ═══════════════════════════════════════════════════════════════════════

    function test_startVoting_revert_noGuardians() public {
        uint256 willId = _createDefaultWill();
        // No guardians set

        vm.warp(block.timestamp + GRACE_PERIOD + 1);

        vm.expectRevert(ICryptoWillV2.NotAGuardian.selector);
        cryptoWill.startVoting(owner, willId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Multiple wills with different guardian configs
    // ═══════════════════════════════════════════════════════════════════════

    function test_multipleWills_independentGuardianConfigs() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        address beneficiary2 = makeAddr("beneficiary2");

        vm.startPrank(owner);
        uint256 id0 = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
        uint256 id1 = cryptoWill.createWill(beneficiary2, tokens, GRACE_PERIOD);
        vm.stopPrank();

        // Set different guardian configs for each will
        _setGuardians2of3(id0);

        address[] memory guardians = new address[](2);
        guardians[0] = guardian4;
        guardians[1] = guardian5;
        vm.prank(owner);
        cryptoWill.setGuardians(id1, guardians, 2, 10 days);

        // Verify independent configs
        ICryptoWillV2.GuardianConfig memory config0 = cryptoWill.getGuardianConfig(owner, id0);
        ICryptoWillV2.GuardianConfig memory config1 = cryptoWill.getGuardianConfig(owner, id1);

        assertEq(config0.guardians.length, 3);
        assertEq(config0.threshold, 2);

        assertEq(config1.guardians.length, 2);
        assertEq(config1.threshold, 2);
        assertEq(config1.votingWindow, 10 days);
    }
}
