// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {CryptoWillV2} from "../src/CryptoWillV2.sol";
import {ICryptoWillV2} from "../src/interfaces/ICryptoWillV2.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {RevertingERC20, ReturnFalseERC20} from "./mocks/RevertingERC20.sol";

contract CryptoWillV2Test is Test {
    CryptoWillV2 public cryptoWill;
    MockERC20 public token1;
    MockERC20 public token2;
    MockERC20 public token3;

    address public owner = makeAddr("owner");
    address public beneficiary = makeAddr("beneficiary");
    address public beneficiary2 = makeAddr("beneficiary2");
    address public executor = makeAddr("executor");

    uint256 public constant GRACE_PERIOD = 90 days;

    function setUp() public {
        cryptoWill = new CryptoWillV2();
        token1 = new MockERC20("Token1", "TK1");
        token2 = new MockERC20("Token2", "TK2");
        token3 = new MockERC20("Token3", "TK3");

        // Mint tokens to owner
        token1.mint(owner, 1000 ether);
        token2.mint(owner, 500 ether);
        token3.mint(owner, 250 ether);
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    function _createDefaultWill() internal returns (uint256) {
        address[] memory tokens = new address[](2);
        tokens[0] = address(token1);
        tokens[1] = address(token2);

        vm.prank(owner);
        return cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
    }

    function _createWillWith(
        address _owner,
        address _beneficiary,
        address[] memory _tokens,
        uint256 _gracePeriod
    ) internal returns (uint256) {
        vm.prank(_owner);
        return cryptoWill.createWill(_beneficiary, _tokens, _gracePeriod);
    }

    function _approveTokens() internal {
        vm.startPrank(owner);
        token1.approve(address(cryptoWill), type(uint256).max);
        token2.approve(address(cryptoWill), type(uint256).max);
        vm.stopPrank();
    }

    function _signAliveProof(uint256 privateKey, address willOwner, uint256 nonce, uint256 issuedAt)
        internal
        view
        returns (bytes memory)
    {
        bytes32 ALIVE_TH = keccak256("AliveProof(address owner,uint256 nonce,uint256 issuedAt)");
        bytes32 structHash = keccak256(abi.encode(ALIVE_TH, willOwner, nonce, issuedAt));
        bytes32 domainSeparator = cryptoWill.DOMAIN_SEPARATOR();
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  createWill
    // ═══════════════════════════════════════════════════════════════════════

    function test_createWill_success() public {
        address[] memory tokens = new address[](2);
        tokens[0] = address(token1);
        tokens[1] = address(token2);

        vm.expectEmit(true, true, false, true);
        emit ICryptoWillV2.WillCreated(owner, beneficiary, GRACE_PERIOD, 0);

        vm.prank(owner);
        uint256 willId = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);

        assertEq(willId, 0);

        // Verify state
        ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, 0);
        assertEq(w.owner, owner);
        assertEq(w.beneficiary, beneficiary);
        assertEq(w.tokens.length, 2);
        assertEq(w.tokens[0], address(token1));
        assertEq(w.tokens[1], address(token2));
        assertEq(w.gracePeriod, GRACE_PERIOD);
        assertEq(w.active, true);
        assertEq(w.lastAlive, block.timestamp);

        // Verify counters
        assertEq(cryptoWill.willCount(owner), 1);
        assertEq(cryptoWill.activeWillCount(owner), 1);
    }

    function test_createWill_multipleWills_sameOwner() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(owner);
        uint256 id0 = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
        uint256 id1 = cryptoWill.createWill(beneficiary2, tokens, 60 days);
        vm.stopPrank();

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(cryptoWill.willCount(owner), 2);
        assertEq(cryptoWill.activeWillCount(owner), 2);

        // Verify different beneficiaries
        ICryptoWillV2.Will memory w0 = cryptoWill.getWill(owner, 0);
        ICryptoWillV2.Will memory w1 = cryptoWill.getWill(owner, 1);
        assertEq(w0.beneficiary, beneficiary);
        assertEq(w1.beneficiary, beneficiary2);
        assertEq(w0.gracePeriod, GRACE_PERIOD);
        assertEq(w1.gracePeriod, 60 days);
    }

    function test_createWill_upTo10Wills() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(owner);
        for (uint256 i = 0; i < 10; i++) {
            uint256 id = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
            assertEq(id, i);
        }
        vm.stopPrank();

        assertEq(cryptoWill.willCount(owner), 10);
        assertEq(cryptoWill.activeWillCount(owner), 10);
    }

    function test_createWill_revert_tooManyWills() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(owner);
        for (uint256 i = 0; i < 10; i++) {
            cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
        }

        // 11th will should revert
        vm.expectRevert(ICryptoWillV2.TooManyWills.selector);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
        vm.stopPrank();
    }

    function test_createWill_afterRevoke_canCreateMore() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(owner);
        for (uint256 i = 0; i < 10; i++) {
            cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
        }

        // Revoke one
        cryptoWill.revokeWill(0);
        assertEq(cryptoWill.activeWillCount(owner), 9);

        // Should be able to create another
        uint256 newId = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
        assertEq(newId, 10); // ID is 10, not 0 (auto-increment never reuses)
        assertEq(cryptoWill.activeWillCount(owner), 10);
        vm.stopPrank();
    }

    function test_createWill_revert_zeroBeneficiary() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.InvalidBeneficiary.selector);
        cryptoWill.createWill(address(0), tokens, GRACE_PERIOD);
    }

    function test_createWill_revert_selfBeneficiary() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.InvalidBeneficiary.selector);
        cryptoWill.createWill(owner, tokens, GRACE_PERIOD);
    }

    function test_createWill_revert_noTokens() public {
        address[] memory tokens = new address[](0);

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.NoTokensSpecified.selector);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
    }

    function test_createWill_revert_tooManyTokens() public {
        address[] memory tokens = new address[](51);
        for (uint256 i = 0; i < 51; i++) {
            tokens[i] = address(uint160(i + 1));
        }

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.TooManyTokens.selector);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
    }

    function test_createWill_revert_gracePeriodTooShort() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.GracePeriodTooShort.selector);
        cryptoWill.createWill(beneficiary, tokens, 29 days);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  signAlive(uint256 willId) — single will refresh
    // ═══════════════════════════════════════════════════════════════════════

    function test_signAlive_single_success() public {
        uint256 willId = _createDefaultWill();

        vm.warp(block.timestamp + 45 days);

        vm.expectEmit(true, false, false, true);
        emit ICryptoWillV2.AliveConfirmed(owner, block.timestamp, willId);

        vm.prank(owner);
        cryptoWill.signAlive(willId);

        ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, willId);
        assertEq(w.lastAlive, block.timestamp);
    }

    function test_signAlive_single_doesNotAffectOtherWills() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(owner);
        uint256 id0 = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
        uint256 id1 = cryptoWill.createWill(beneficiary2, tokens, GRACE_PERIOD);
        vm.stopPrank();

        uint256 createTime = block.timestamp;

        vm.warp(block.timestamp + 45 days);

        // Only refresh will 0
        vm.prank(owner);
        cryptoWill.signAlive(id0);

        // Will 0 refreshed
        assertEq(cryptoWill.getWill(owner, id0).lastAlive, block.timestamp);
        // Will 1 unchanged
        assertEq(cryptoWill.getWill(owner, id1).lastAlive, createTime);
    }

    function test_signAlive_single_revert_noWill() public {
        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.WillIdOutOfRange.selector);
        cryptoWill.signAlive(0);
    }

    function test_signAlive_single_revert_notActive() public {
        uint256 willId = _createDefaultWill();
        _approveTokens();

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.executeWill(owner, willId);

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.WillNotActive.selector);
        cryptoWill.signAlive(willId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  signAlive() — refresh ALL active wills
    // ═══════════════════════════════════════════════════════════════════════

    function test_signAlive_all_refreshesAllActiveWills() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(owner);
        uint256 id0 = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
        uint256 id1 = cryptoWill.createWill(beneficiary2, tokens, 60 days);
        vm.stopPrank();

        vm.warp(block.timestamp + 30 days);

        vm.expectEmit(true, false, false, true);
        emit ICryptoWillV2.AliveConfirmed(owner, block.timestamp, type(uint256).max);

        vm.prank(owner);
        cryptoWill.signAlive();

        assertEq(cryptoWill.getWill(owner, id0).lastAlive, block.timestamp);
        assertEq(cryptoWill.getWill(owner, id1).lastAlive, block.timestamp);
    }

    function test_signAlive_all_skipsInactiveWills() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(owner);
        uint256 id0 = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
        uint256 id1 = cryptoWill.createWill(beneficiary2, tokens, GRACE_PERIOD);
        // Revoke will 0
        cryptoWill.revokeWill(id0);
        vm.stopPrank();

        vm.warp(block.timestamp + 30 days);

        vm.prank(owner);
        cryptoWill.signAlive();

        // Will 0 is inactive — should NOT have been refreshed
        assertFalse(cryptoWill.getWill(owner, id0).active);
        // Will 1 is active — should be refreshed
        assertEq(cryptoWill.getWill(owner, id1).lastAlive, block.timestamp);
    }

    function test_signAlive_all_revert_noWills() public {
        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.WillNotFound.selector);
        cryptoWill.signAlive();
    }

    function test_signAlive_all_revert_allInactive() public {
        uint256 willId = _createDefaultWill();

        vm.prank(owner);
        cryptoWill.revokeWill(willId);

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.WillNotActive.selector);
        cryptoWill.signAlive();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  executeWill
    // ═══════════════════════════════════════════════════════════════════════

    function test_executeWill_success() public {
        uint256 willId = _createDefaultWill();
        _approveTokens();

        // Deposit some ETH
        vm.deal(owner, 5 ether);
        vm.prank(owner);
        cryptoWill.depositETH{value: 2 ether}(willId);

        // Advance past grace period
        vm.warp(block.timestamp + GRACE_PERIOD + 1);

        vm.expectEmit(true, true, false, true);
        emit ICryptoWillV2.WillExecuted(owner, beneficiary, 2, willId);

        vm.prank(executor);
        cryptoWill.executeWill(owner, willId);

        // Verify tokens transferred
        assertEq(token1.balanceOf(beneficiary), 1000 ether);
        assertEq(token2.balanceOf(beneficiary), 500 ether);

        // ETH is pull-payment
        assertEq(cryptoWill.pendingETH(beneficiary), 2 ether);

        // Will is now inactive
        ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, willId);
        assertFalse(w.active);
        assertEq(cryptoWill.activeWillCount(owner), 0);
    }

    function test_executeWill_doesNotAffectOtherWills() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(owner);
        uint256 id0 = cryptoWill.createWill(beneficiary, tokens, 30 days);
        uint256 id1 = cryptoWill.createWill(beneficiary2, tokens, GRACE_PERIOD);
        vm.stopPrank();

        vm.prank(owner);
        token1.approve(address(cryptoWill), type(uint256).max);

        // Advance past will 0's grace period but NOT will 1's
        vm.warp(block.timestamp + 31 days);

        vm.prank(executor);
        cryptoWill.executeWill(owner, id0);

        // Will 0 executed
        assertFalse(cryptoWill.getWill(owner, id0).active);
        // Will 1 still active
        assertTrue(cryptoWill.getWill(owner, id1).active);
        assertEq(cryptoWill.activeWillCount(owner), 1);
    }

    function test_executeWill_independentGracePeriods() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(owner);
        cryptoWill.createWill(beneficiary, tokens, 30 days); // id0: short grace
        cryptoWill.createWill(beneficiary2, tokens, 180 days); // id1: long grace
        vm.stopPrank();

        vm.prank(owner);
        token1.approve(address(cryptoWill), type(uint256).max);

        // After 31 days: will 0 expired, will 1 not
        vm.warp(block.timestamp + 31 days);
        cryptoWill.executeWill(owner, 0); // Should succeed

        vm.expectRevert(ICryptoWillV2.GracePeriodNotExpired.selector);
        cryptoWill.executeWill(owner, 1); // Should fail — not expired yet

        // After 181 days total: will 1 should be expired too
        vm.warp(block.timestamp + 150 days);
        cryptoWill.executeWill(owner, 1); // Should succeed now
    }

    function test_executeWill_revert_gracePeriodNotExpired() public {
        uint256 willId = _createDefaultWill();

        vm.warp(block.timestamp + GRACE_PERIOD - 1);

        vm.prank(executor);
        vm.expectRevert(ICryptoWillV2.GracePeriodNotExpired.selector);
        cryptoWill.executeWill(owner, willId);
    }

    function test_executeWill_revert_willNotFound() public {
        vm.prank(executor);
        vm.expectRevert(ICryptoWillV2.WillIdOutOfRange.selector);
        cryptoWill.executeWill(owner, 0);
    }

    function test_executeWill_revert_willNotActive() public {
        uint256 willId = _createDefaultWill();
        _approveTokens();

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.executeWill(owner, willId);

        // Try again — will is inactive
        vm.prank(executor);
        vm.expectRevert(ICryptoWillV2.WillNotActive.selector);
        cryptoWill.executeWill(owner, willId);
    }

    function test_executeWill_revert_willIdOutOfRange() public {
        _createDefaultWill(); // Creates will 0

        vm.prank(executor);
        vm.expectRevert(ICryptoWillV2.WillIdOutOfRange.selector);
        cryptoWill.executeWill(owner, 999);
    }

    function test_executeWill_multipleTokens() public {
        address[] memory tokens = new address[](3);
        tokens[0] = address(token1);
        tokens[1] = address(token2);
        tokens[2] = address(token3);

        vm.prank(owner);
        uint256 willId = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);

        vm.startPrank(owner);
        token1.approve(address(cryptoWill), type(uint256).max);
        token2.approve(address(cryptoWill), type(uint256).max);
        token3.approve(address(cryptoWill), type(uint256).max);
        vm.stopPrank();

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.executeWill(owner, willId);

        assertEq(token1.balanceOf(beneficiary), 1000 ether);
        assertEq(token2.balanceOf(beneficiary), 500 ether);
        assertEq(token3.balanceOf(beneficiary), 250 ether);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  revokeWill
    // ═══════════════════════════════════════════════════════════════════════

    function test_revokeWill_success() public {
        uint256 willId = _createDefaultWill();

        vm.deal(owner, 5 ether);
        vm.prank(owner);
        cryptoWill.depositETH{value: 3 ether}(willId);

        uint256 ownerBalanceBefore = owner.balance;

        vm.expectEmit(true, false, false, true);
        emit ICryptoWillV2.WillRevoked(owner, willId);

        vm.prank(owner);
        cryptoWill.revokeWill(willId);

        // ETH refunded
        assertEq(owner.balance, ownerBalanceBefore + 3 ether);

        // Will inactive
        ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, willId);
        assertFalse(w.active);
        assertEq(cryptoWill.activeWillCount(owner), 0);
    }

    function test_revokeWill_othersUnaffected() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(owner);
        uint256 id0 = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
        uint256 id1 = cryptoWill.createWill(beneficiary2, tokens, GRACE_PERIOD);
        cryptoWill.revokeWill(id0);
        vm.stopPrank();

        assertFalse(cryptoWill.getWill(owner, id0).active);
        assertTrue(cryptoWill.getWill(owner, id1).active);
        assertEq(cryptoWill.activeWillCount(owner), 1);
    }

    function test_revokeWill_revert_noWill() public {
        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.WillIdOutOfRange.selector);
        cryptoWill.revokeWill(0);
    }

    function test_revokeWill_revert_notActive() public {
        uint256 willId = _createDefaultWill();

        vm.prank(owner);
        cryptoWill.revokeWill(willId);

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.WillNotActive.selector);
        cryptoWill.revokeWill(willId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  updateBeneficiary
    // ═══════════════════════════════════════════════════════════════════════

    function test_updateBeneficiary_success() public {
        uint256 willId = _createDefaultWill();

        address newBeneficiary = makeAddr("newBeneficiary");

        vm.expectEmit(true, true, false, true);
        emit ICryptoWillV2.BeneficiaryUpdated(owner, newBeneficiary, willId);

        vm.prank(owner);
        cryptoWill.updateBeneficiary(willId, newBeneficiary);

        assertEq(cryptoWill.getWill(owner, willId).beneficiary, newBeneficiary);
    }

    function test_updateBeneficiary_revert_zero() public {
        uint256 willId = _createDefaultWill();

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.InvalidBeneficiary.selector);
        cryptoWill.updateBeneficiary(willId, address(0));
    }

    function test_updateBeneficiary_revert_self() public {
        uint256 willId = _createDefaultWill();

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.InvalidBeneficiary.selector);
        cryptoWill.updateBeneficiary(willId, owner);
    }

    function test_updateBeneficiary_revert_outOfRange() public {
        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.WillIdOutOfRange.selector);
        cryptoWill.updateBeneficiary(0, beneficiary);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  updateTokens
    // ═══════════════════════════════════════════════════════════════════════

    function test_updateTokens_success() public {
        uint256 willId = _createDefaultWill();

        address[] memory newTokens = new address[](1);
        newTokens[0] = address(token3);

        vm.expectEmit(true, false, false, true);
        emit ICryptoWillV2.TokensUpdated(owner, newTokens, willId);

        vm.prank(owner);
        cryptoWill.updateTokens(willId, newTokens);

        ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, willId);
        assertEq(w.tokens.length, 1);
        assertEq(w.tokens[0], address(token3));
    }

    function test_updateTokens_revert_noTokens() public {
        uint256 willId = _createDefaultWill();
        address[] memory newTokens = new address[](0);

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.NoTokensSpecified.selector);
        cryptoWill.updateTokens(willId, newTokens);
    }

    function test_updateTokens_revert_tooManyTokens() public {
        uint256 willId = _createDefaultWill();
        address[] memory newTokens = new address[](51);
        for (uint256 i = 0; i < 51; i++) {
            newTokens[i] = address(uint160(i + 1));
        }

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.TooManyTokens.selector);
        cryptoWill.updateTokens(willId, newTokens);
    }

    function test_updateTokens_revert_outOfRange() public {
        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.WillIdOutOfRange.selector);
        cryptoWill.updateTokens(0, new address[](1));
    }

    function test_updateTokens_boundary_maxTokens() public {
        uint256 willId = _createDefaultWill();

        address[] memory newTokens = new address[](50);
        for (uint256 i = 0; i < 50; i++) {
            newTokens[i] = address(uint160(i + 1));
        }

        vm.prank(owner);
        cryptoWill.updateTokens(willId, newTokens);

        ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, willId);
        assertEq(w.tokens.length, 50);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  depositETH per will
    // ═══════════════════════════════════════════════════════════════════════

    function test_depositETH_perWill_success() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(owner);
        uint256 id0 = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
        uint256 id1 = cryptoWill.createWill(beneficiary2, tokens, GRACE_PERIOD);
        vm.stopPrank();

        vm.deal(owner, 10 ether);

        vm.prank(owner);
        cryptoWill.depositETH{value: 3 ether}(id0);

        vm.prank(owner);
        cryptoWill.depositETH{value: 1 ether}(id1);

        assertEq(cryptoWill.ethBalances(owner, id0), 3 ether);
        assertEq(cryptoWill.ethBalances(owner, id1), 1 ether);
    }

    function test_depositETH_accumulates() public {
        uint256 willId = _createDefaultWill();
        vm.deal(owner, 10 ether);

        vm.prank(owner);
        cryptoWill.depositETH{value: 2 ether}(willId);
        vm.prank(owner);
        cryptoWill.depositETH{value: 3 ether}(willId);

        assertEq(cryptoWill.ethBalances(owner, willId), 5 ether);
    }

    function test_depositETH_revert_zeroValue() public {
        uint256 willId = _createDefaultWill();

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.ZeroETHDeposit.selector);
        cryptoWill.depositETH{value: 0}(willId);
    }

    function test_depositETH_revert_noWill() public {
        vm.deal(owner, 10 ether);
        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.WillIdOutOfRange.selector);
        cryptoWill.depositETH{value: 1 ether}(0);
    }

    function test_depositETH_revert_notActive() public {
        uint256 willId = _createDefaultWill();

        vm.prank(owner);
        cryptoWill.revokeWill(willId);

        vm.deal(owner, 1 ether);
        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.WillNotActive.selector);
        cryptoWill.depositETH{value: 1 ether}(willId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  ETH claim per will
    // ═══════════════════════════════════════════════════════════════════════

    function test_executeWill_ethClaimPerWill() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(owner);
        uint256 id0 = cryptoWill.createWill(beneficiary, tokens, 30 days);
        uint256 id1 = cryptoWill.createWill(beneficiary2, tokens, 30 days);
        vm.stopPrank();

        vm.deal(owner, 10 ether);
        vm.prank(owner);
        cryptoWill.depositETH{value: 3 ether}(id0);
        vm.prank(owner);
        cryptoWill.depositETH{value: 5 ether}(id1);

        vm.prank(owner);
        token1.approve(address(cryptoWill), type(uint256).max);

        vm.warp(block.timestamp + 31 days);
        cryptoWill.executeWill(owner, id0);
        cryptoWill.executeWill(owner, id1);

        assertEq(cryptoWill.pendingETH(beneficiary), 3 ether);
        assertEq(cryptoWill.pendingETH(beneficiary2), 5 ether);

        vm.prank(beneficiary);
        cryptoWill.claimETH();
        assertEq(beneficiary.balance, 3 ether);

        vm.prank(beneficiary2);
        cryptoWill.claimETH();
        assertEq(beneficiary2.balance, 5 ether);
    }

    function test_claimETH_revert_noPending() public {
        vm.prank(beneficiary);
        vm.expectRevert(ICryptoWillV2.NoETHPending.selector);
        cryptoWill.claimETH();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getActiveWillIds
    // ═══════════════════════════════════════════════════════════════════════

    function test_getActiveWillIds_returnsCorrectSet() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(owner);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);   // 0
        cryptoWill.createWill(beneficiary2, tokens, GRACE_PERIOD);  // 1
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);   // 2

        // Revoke will 1
        cryptoWill.revokeWill(1);
        vm.stopPrank();

        uint256[] memory activeIds = cryptoWill.getActiveWillIds(owner);
        assertEq(activeIds.length, 2);
        assertEq(activeIds[0], 0);
        assertEq(activeIds[1], 2);
    }

    function test_getActiveWillIds_afterExecutionAndRevokes() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(owner);
        cryptoWill.createWill(beneficiary, tokens, 30 days); // 0
        cryptoWill.createWill(beneficiary2, tokens, 30 days); // 1
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD); // 2
        vm.stopPrank();

        vm.prank(owner);
        token1.approve(address(cryptoWill), type(uint256).max);

        // Execute will 0
        vm.warp(block.timestamp + 31 days);
        cryptoWill.executeWill(owner, 0);

        // Revoke will 1
        vm.prank(owner);
        cryptoWill.revokeWill(1);

        uint256[] memory activeIds = cryptoWill.getActiveWillIds(owner);
        assertEq(activeIds.length, 1);
        assertEq(activeIds[0], 2);
    }

    function test_getActiveWillIds_emptyWhenNoWills() public {
        uint256[] memory activeIds = cryptoWill.getActiveWillIds(owner);
        assertEq(activeIds.length, 0);
    }

    function test_getActiveWillIds_emptyAfterAllRevoked() public {
        uint256 willId = _createDefaultWill();

        vm.prank(owner);
        cryptoWill.revokeWill(willId);

        uint256[] memory activeIds = cryptoWill.getActiveWillIds(owner);
        assertEq(activeIds.length, 0);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getWillCount
    // ═══════════════════════════════════════════════════════════════════════

    function test_getWillCount_includesRevokedAndExecuted() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(owner);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
        cryptoWill.createWill(beneficiary2, tokens, GRACE_PERIOD);
        cryptoWill.revokeWill(0);
        vm.stopPrank();

        // willCount is total ever created — not just active
        assertEq(cryptoWill.getWillCount(owner), 2);
        assertEq(cryptoWill.activeWillCount(owner), 1);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  signAliveBySig (EIP-712 gasless check-in) — refreshes ALL
    // ═══════════════════════════════════════════════════════════════════════

    function test_signAliveBySig_refreshesAllActiveWills() public {
        (address signer, uint256 signerPk) = makeAddrAndKey("eip712owner");

        token1.mint(signer, 100 ether);
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(signer);
        uint256 id0 = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
        uint256 id1 = cryptoWill.createWill(beneficiary2, tokens, GRACE_PERIOD);
        vm.stopPrank();

        vm.warp(block.timestamp + 30 days);
        uint256 issuedAt = block.timestamp;

        bytes memory sig = _signAliveProof(signerPk, signer, 0, issuedAt);

        vm.prank(executor);
        cryptoWill.signAliveBySig(signer, 0, issuedAt, sig);

        // Both wills refreshed
        assertEq(cryptoWill.getWill(signer, id0).lastAlive, block.timestamp);
        assertEq(cryptoWill.getWill(signer, id1).lastAlive, block.timestamp);
        assertEq(cryptoWill.aliveNonce(signer), 1);
    }

    function test_signAliveBySig_invalidNonce() public {
        (address signer, uint256 signerPk) = makeAddrAndKey("eip712owner2");
        token1.mint(signer, 100 ether);
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);
        vm.prank(signer);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);

        uint256 issuedAt = block.timestamp;
        bytes memory sig = _signAliveProof(signerPk, signer, 999, issuedAt);

        vm.prank(executor);
        vm.expectRevert(ICryptoWillV2.InvalidNonce.selector);
        cryptoWill.signAliveBySig(signer, 999, issuedAt, sig);
    }

    function test_signAliveBySig_expiredProof() public {
        (address signer, uint256 signerPk) = makeAddrAndKey("eip712owner3");
        token1.mint(signer, 100 ether);
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);
        vm.prank(signer);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);

        uint256 issuedAt = block.timestamp;
        bytes memory sig = _signAliveProof(signerPk, signer, 0, issuedAt);

        vm.warp(issuedAt + 7 days + 1);

        vm.prank(executor);
        vm.expectRevert(ICryptoWillV2.ProofExpired.selector);
        cryptoWill.signAliveBySig(signer, 0, issuedAt, sig);
    }

    function test_signAliveBySig_invalidSig() public {
        (address signer, ) = makeAddrAndKey("eip712owner4");
        (, uint256 wrongPk) = makeAddrAndKey("wrongSigner");

        token1.mint(signer, 100 ether);
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);
        vm.prank(signer);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);

        uint256 issuedAt = block.timestamp;
        bytes memory sig = _signAliveProof(wrongPk, signer, 0, issuedAt);

        vm.prank(executor);
        vm.expectRevert(ICryptoWillV2.InvalidSignature.selector);
        cryptoWill.signAliveBySig(signer, 0, issuedAt, sig);
    }

    function test_signAliveBySig_noWill() public {
        (address signer, uint256 signerPk) = makeAddrAndKey("eip712owner5");
        uint256 issuedAt = block.timestamp;
        bytes memory sig = _signAliveProof(signerPk, signer, 0, issuedAt);

        vm.prank(executor);
        vm.expectRevert(ICryptoWillV2.WillNotFound.selector);
        cryptoWill.signAliveBySig(signer, 0, issuedAt, sig);
    }

    function test_signAliveBySig_incrementsNonce() public {
        (address signer, uint256 signerPk) = makeAddrAndKey("eip712owner6");
        token1.mint(signer, 100 ether);
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);
        vm.prank(signer);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);

        // First proof (nonce 0)
        uint256 issuedAt = block.timestamp;
        bytes memory sig0 = _signAliveProof(signerPk, signer, 0, issuedAt);
        vm.prank(executor);
        cryptoWill.signAliveBySig(signer, 0, issuedAt, sig0);
        assertEq(cryptoWill.aliveNonce(signer), 1);

        // Second proof (nonce 1)
        vm.warp(block.timestamp + 1);
        uint256 issuedAt2 = block.timestamp;
        bytes memory sig1 = _signAliveProof(signerPk, signer, 1, issuedAt2);
        vm.prank(executor);
        cryptoWill.signAliveBySig(signer, 1, issuedAt2, sig1);
        assertEq(cryptoWill.aliveNonce(signer), 2);

        // Replaying nonce 0 should fail
        vm.prank(executor);
        vm.expectRevert(ICryptoWillV2.InvalidNonce.selector);
        cryptoWill.signAliveBySig(signer, 0, issuedAt, sig0);
    }

    function test_signAliveBySig_anyoneCanSubmit() public {
        (address signer, uint256 signerPk) = makeAddrAndKey("eip712owner7");
        token1.mint(signer, 100 ether);
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);
        vm.prank(signer);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);

        uint256 issuedAt = block.timestamp;
        bytes memory sig = _signAliveProof(signerPk, signer, 0, issuedAt);

        address relayer = makeAddr("relayer");
        vm.prank(relayer);
        cryptoWill.signAliveBySig(signer, 0, issuedAt, sig);

        assertEq(cryptoWill.getWill(signer, 0).lastAlive, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Token transfer safety (from V1 — ensure still works)
    // ═══════════════════════════════════════════════════════════════════════

    function test_executeWill_oneRevertingToken_otherTokensStillTransfer() public {
        RevertingERC20 badToken = new RevertingERC20();
        badToken.mint(owner, 100 ether);

        address[] memory tokens = new address[](3);
        tokens[0] = address(token1);
        tokens[1] = address(badToken);
        tokens[2] = address(token2);

        vm.prank(owner);
        uint256 willId = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);

        vm.startPrank(owner);
        token1.approve(address(cryptoWill), type(uint256).max);
        badToken.approve(address(cryptoWill), type(uint256).max);
        token2.approve(address(cryptoWill), type(uint256).max);
        vm.stopPrank();

        vm.warp(block.timestamp + GRACE_PERIOD + 1);

        vm.expectEmit(true, true, true, true);
        emit ICryptoWillV2.TokenTransferFailed(address(badToken), owner, beneficiary, 100 ether);

        vm.prank(executor);
        cryptoWill.executeWill(owner, willId);

        assertEq(token1.balanceOf(beneficiary), 1000 ether);
        assertEq(token2.balanceOf(beneficiary), 500 ether);
        assertEq(badToken.balanceOf(owner), 100 ether);
    }

    function test_executeWill_returnFalseToken_otherTokensStillTransfer() public {
        ReturnFalseERC20 falseToken = new ReturnFalseERC20();
        falseToken.mint(owner, 100 ether);

        address[] memory tokens = new address[](2);
        tokens[0] = address(falseToken);
        tokens[1] = address(token1);

        vm.prank(owner);
        uint256 willId = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);

        vm.startPrank(owner);
        falseToken.approve(address(cryptoWill), type(uint256).max);
        token1.approve(address(cryptoWill), type(uint256).max);
        vm.stopPrank();

        vm.warp(block.timestamp + GRACE_PERIOD + 1);

        vm.expectEmit(true, true, true, true);
        emit ICryptoWillV2.TokenTransferFailed(address(falseToken), owner, beneficiary, 100 ether);

        vm.prank(executor);
        cryptoWill.executeWill(owner, willId);

        assertEq(token1.balanceOf(beneficiary), 1000 ether);
        assertEq(falseToken.balanceOf(owner), 100 ether);
    }

    function test_executeWill_allTokensRevert_willStillExecutes() public {
        RevertingERC20 bad1 = new RevertingERC20();
        RevertingERC20 bad2 = new RevertingERC20();
        bad1.mint(owner, 100 ether);
        bad2.mint(owner, 200 ether);

        address[] memory tokens = new address[](2);
        tokens[0] = address(bad1);
        tokens[1] = address(bad2);

        vm.prank(owner);
        uint256 willId = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);

        vm.startPrank(owner);
        bad1.approve(address(cryptoWill), type(uint256).max);
        bad2.approve(address(cryptoWill), type(uint256).max);
        vm.stopPrank();

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.executeWill(owner, willId);

        assertFalse(cryptoWill.getWill(owner, willId).active);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  ETH pull-payment safety (from V1 — ensure still works)
    // ═══════════════════════════════════════════════════════════════════════

    function test_executeWill_ethStoredAsPending_notPushed() public {
        uint256 willId = _createDefaultWill();
        _approveTokens();

        vm.deal(owner, 5 ether);
        vm.prank(owner);
        cryptoWill.depositETH{value: 3 ether}(willId);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.executeWill(owner, willId);

        assertEq(cryptoWill.pendingETH(beneficiary), 3 ether);
        assertEq(beneficiary.balance, 0);
    }

    function test_executeWill_nonPayableBeneficiary_ethStoredSafely() public {
        NonPayableContract npc = new NonPayableContract();

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(owner);
        uint256 willId = cryptoWill.createWill(address(npc), tokens, GRACE_PERIOD);

        vm.prank(owner);
        token1.approve(address(cryptoWill), type(uint256).max);

        vm.deal(owner, 5 ether);
        vm.prank(owner);
        cryptoWill.depositETH{value: 2 ether}(willId);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.executeWill(owner, willId);

        assertEq(cryptoWill.pendingETH(address(npc)), 2 ether);
        assertEq(token1.balanceOf(address(npc)), 1000 ether);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Full lifecycle: multi-will
    // ═══════════════════════════════════════════════════════════════════════

    function test_fullLifecycle_multipleWills() public {
        address[] memory tokens1 = new address[](1);
        tokens1[0] = address(token1);

        address[] memory tokens2 = new address[](2);
        tokens2[0] = address(token2);
        tokens2[1] = address(token3);

        // Create two wills
        vm.startPrank(owner);
        uint256 id0 = cryptoWill.createWill(beneficiary, tokens1, 30 days);
        uint256 id1 = cryptoWill.createWill(beneficiary2, tokens2, GRACE_PERIOD);
        vm.stopPrank();

        // Approve tokens
        vm.startPrank(owner);
        token1.approve(address(cryptoWill), type(uint256).max);
        token2.approve(address(cryptoWill), type(uint256).max);
        token3.approve(address(cryptoWill), type(uint256).max);
        vm.stopPrank();

        // Deposit ETH into each
        vm.deal(owner, 10 ether);
        vm.prank(owner);
        cryptoWill.depositETH{value: 2 ether}(id0);
        vm.prank(owner);
        cryptoWill.depositETH{value: 4 ether}(id1);

        // Verify active state
        assertEq(cryptoWill.activeWillCount(owner), 2);
        uint256[] memory activeIds = cryptoWill.getActiveWillIds(owner);
        assertEq(activeIds.length, 2);

        // signAlive refreshes both
        vm.warp(block.timestamp + 20 days);
        vm.prank(owner);
        cryptoWill.signAlive();

        // After 31 days from last alive: only will 0 expired
        vm.warp(block.timestamp + 31 days);

        // Execute will 0
        cryptoWill.executeWill(owner, id0);
        assertEq(cryptoWill.activeWillCount(owner), 1);
        assertEq(token1.balanceOf(beneficiary), 1000 ether);
        assertEq(cryptoWill.pendingETH(beneficiary), 2 ether);

        // Will 1 still active
        assertTrue(cryptoWill.getWill(owner, id1).active);
        vm.expectRevert(ICryptoWillV2.GracePeriodNotExpired.selector);
        cryptoWill.executeWill(owner, id1);

        // Beneficiary claims ETH
        vm.prank(beneficiary);
        cryptoWill.claimETH();
        assertEq(beneficiary.balance, 2 ether);

        // Eventually will 1 also expires
        vm.warp(block.timestamp + 60 days);
        cryptoWill.executeWill(owner, id1);
        assertEq(cryptoWill.activeWillCount(owner), 0);
        assertEq(token2.balanceOf(beneficiary2), 500 ether);
        assertEq(token3.balanceOf(beneficiary2), 250 ether);
        assertEq(cryptoWill.pendingETH(beneficiary2), 4 ether);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getWill — views
    // ═══════════════════════════════════════════════════════════════════════

    function test_getWill_returnsCorrectData() public {
        _createDefaultWill();

        ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, 0);

        assertEq(w.owner, owner);
        assertEq(w.beneficiary, beneficiary);
        assertEq(w.tokens.length, 2);
        assertEq(w.tokens[0], address(token1));
        assertEq(w.tokens[1], address(token2));
        assertEq(w.gracePeriod, GRACE_PERIOD);
        assertEq(w.active, true);

        // Non-existent will returns zero struct
        ICryptoWillV2.Will memory empty = cryptoWill.getWill(makeAddr("nobody"), 0);
        assertEq(empty.owner, address(0));
        assertEq(empty.beneficiary, address(0));
        assertEq(empty.tokens.length, 0);
        assertEq(empty.active, false);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  DOMAIN_SEPARATOR — version "2"
    // ═══════════════════════════════════════════════════════════════════════

    function test_domainSeparator_version2() public view {
        bytes32 ds = cryptoWill.DOMAIN_SEPARATOR();
        assertTrue(ds != bytes32(0));
    }
}

/// @dev Helper: contract with no receive() — cannot accept ETH pushes
contract NonPayableContract {
    // Intentionally no receive() or fallback()
}
