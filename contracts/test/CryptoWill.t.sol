// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {CryptoWill} from "../src/CryptoWill.sol";
import {ICryptoWill} from "../src/interfaces/ICryptoWill.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract CryptoWillTest is Test {
    CryptoWill public cryptoWill;
    MockERC20 public token1;
    MockERC20 public token2;
    MockERC20 public token3;

    address public owner = makeAddr("owner");
    address public beneficiary = makeAddr("beneficiary");
    address public executor = makeAddr("executor");

    uint256 public constant GRACE_PERIOD = 90 days;

    function setUp() public {
        cryptoWill = new CryptoWill();
        token1 = new MockERC20("Token1", "TK1");
        token2 = new MockERC20("Token2", "TK2");
        token3 = new MockERC20("Token3", "TK3");

        // Mint tokens to owner
        token1.mint(owner, 1000 ether);
        token2.mint(owner, 500 ether);
        token3.mint(owner, 250 ether);
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    function _createDefaultWill() internal {
        address[] memory tokens = new address[](2);
        tokens[0] = address(token1);
        tokens[1] = address(token2);

        vm.prank(owner);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
    }

    function _approveTokens() internal {
        vm.startPrank(owner);
        token1.approve(address(cryptoWill), type(uint256).max);
        token2.approve(address(cryptoWill), type(uint256).max);
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  createWill
    // ═══════════════════════════════════════════════════════════════════════

    function test_createWill_success() public {
        address[] memory tokens = new address[](2);
        tokens[0] = address(token1);
        tokens[1] = address(token2);

        vm.expectEmit(true, true, false, true);
        emit ICryptoWill.WillCreated(owner, beneficiary, GRACE_PERIOD);

        vm.prank(owner);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);

        // Verify state
        ICryptoWill.Will memory w = cryptoWill.getWill(owner);
        assertEq(w.owner, owner);
        assertEq(w.beneficiary, beneficiary);
        assertEq(w.tokens.length, 2);
        assertEq(w.tokens[0], address(token1));
        assertEq(w.tokens[1], address(token2));
        assertEq(w.gracePeriod, GRACE_PERIOD);
        assertEq(w.active, true);
        assertEq(w.lastAlive, block.timestamp);
    }

    function test_createWill_revert_alreadyExists() public {
        _createDefaultWill();

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(owner);
        vm.expectRevert(ICryptoWill.WillAlreadyExists.selector);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
    }

    function test_createWill_revert_zeroBeneficiary() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(owner);
        vm.expectRevert(ICryptoWill.InvalidBeneficiary.selector);
        cryptoWill.createWill(address(0), tokens, GRACE_PERIOD);
    }

    function test_createWill_revert_selfBeneficiary() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(owner);
        vm.expectRevert(ICryptoWill.InvalidBeneficiary.selector);
        cryptoWill.createWill(owner, tokens, GRACE_PERIOD);
    }

    function test_createWill_revert_noTokens() public {
        address[] memory tokens = new address[](0);

        vm.prank(owner);
        vm.expectRevert(ICryptoWill.NoTokensSpecified.selector);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
    }

    function test_createWill_revert_tooManyTokens() public {
        address[] memory tokens = new address[](51);
        for (uint256 i = 0; i < 51; i++) {
            tokens[i] = address(uint160(i + 1));
        }

        vm.prank(owner);
        vm.expectRevert(ICryptoWill.TooManyTokens.selector);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
    }

    function test_createWill_revert_gracePeriodTooShort() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(owner);
        vm.expectRevert(ICryptoWill.GracePeriodTooShort.selector);
        cryptoWill.createWill(beneficiary, tokens, 29 days);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  signAlive
    // ═══════════════════════════════════════════════════════════════════════

    function test_signAlive_success() public {
        _createDefaultWill();

        // Advance time
        vm.warp(block.timestamp + 45 days);

        vm.expectEmit(true, false, false, true);
        emit ICryptoWill.AliveConfirmed(owner, block.timestamp);

        vm.prank(owner);
        cryptoWill.signAlive();

        ICryptoWill.Will memory w = cryptoWill.getWill(owner);
        assertEq(w.lastAlive, block.timestamp);
    }

    function test_signAlive_revert_noWill() public {
        vm.prank(owner);
        vm.expectRevert(ICryptoWill.WillNotFound.selector);
        cryptoWill.signAlive();
    }

    function test_signAlive_revert_notActive() public {
        _createDefaultWill();
        _approveTokens();

        // Execute the will to deactivate it
        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.executeWill(owner);

        // Now the will is deleted, so it becomes WillNotFound
        vm.prank(owner);
        vm.expectRevert(ICryptoWill.WillNotFound.selector);
        cryptoWill.signAlive();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  executeWill
    // ═══════════════════════════════════════════════════════════════════════

    function test_executeWill_success() public {
        _createDefaultWill();
        _approveTokens();

        // Deposit some ETH
        vm.deal(owner, 5 ether);
        vm.prank(owner);
        cryptoWill.depositETH{value: 2 ether}();

        // Advance past grace period
        vm.warp(block.timestamp + GRACE_PERIOD + 1);

        vm.expectEmit(true, true, false, true);
        emit ICryptoWill.WillExecuted(owner, beneficiary, 2);

        vm.prank(executor);
        cryptoWill.executeWill(owner);

        // Verify tokens transferred
        assertEq(token1.balanceOf(beneficiary), 1000 ether);
        assertEq(token2.balanceOf(beneficiary), 500 ether);

        // Verify ETH transferred
        assertEq(beneficiary.balance, 2 ether);

        // Verify will deleted
        ICryptoWill.Will memory w = cryptoWill.getWill(owner);
        assertEq(w.owner, address(0));
    }

    function test_executeWill_multipleTokens() public {
        // Create will with 3 tokens
        address[] memory tokens = new address[](3);
        tokens[0] = address(token1);
        tokens[1] = address(token2);
        tokens[2] = address(token3);

        vm.prank(owner);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);

        // Approve all tokens
        vm.startPrank(owner);
        token1.approve(address(cryptoWill), type(uint256).max);
        token2.approve(address(cryptoWill), type(uint256).max);
        token3.approve(address(cryptoWill), type(uint256).max);
        vm.stopPrank();

        // Advance past grace period
        vm.warp(block.timestamp + GRACE_PERIOD + 1);

        vm.prank(executor);
        cryptoWill.executeWill(owner);

        // Verify all tokens transferred
        assertEq(token1.balanceOf(beneficiary), 1000 ether);
        assertEq(token2.balanceOf(beneficiary), 500 ether);
        assertEq(token3.balanceOf(beneficiary), 250 ether);
    }

    function test_executeWill_revert_gracePeriodNotExpired() public {
        _createDefaultWill();

        // Try to execute before grace period
        vm.warp(block.timestamp + GRACE_PERIOD - 1);

        vm.prank(executor);
        vm.expectRevert(ICryptoWill.GracePeriodNotExpired.selector);
        cryptoWill.executeWill(owner);
    }

    function test_executeWill_revert_willNotFound() public {
        vm.prank(executor);
        vm.expectRevert(ICryptoWill.WillNotFound.selector);
        cryptoWill.executeWill(owner);
    }

    function test_executeWill_revert_willNotActive() public {
        _createDefaultWill();
        _approveTokens();

        // Execute first
        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.executeWill(owner);

        // Try to execute again — will is deleted
        vm.prank(executor);
        vm.expectRevert(ICryptoWill.WillNotFound.selector);
        cryptoWill.executeWill(owner);
    }

    function test_executeWill_allowsRecreation() public {
        _createDefaultWill();
        _approveTokens();

        // Execute the will
        vm.warp(block.timestamp + GRACE_PERIOD + 1);
        cryptoWill.executeWill(owner);

        // Re-mint tokens to owner for new will
        token1.mint(owner, 1000 ether);

        // Owner can create a new will after execution
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(owner);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);

        ICryptoWill.Will memory w = cryptoWill.getWill(owner);
        assertEq(w.owner, owner);
        assertEq(w.active, true);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  revokeWill
    // ═══════════════════════════════════════════════════════════════════════

    function test_revokeWill_success() public {
        _createDefaultWill();

        // Deposit ETH first
        vm.deal(owner, 5 ether);
        vm.prank(owner);
        cryptoWill.depositETH{value: 3 ether}();

        uint256 ownerBalanceBefore = owner.balance;

        vm.expectEmit(true, false, false, false);
        emit ICryptoWill.WillRevoked(owner);

        vm.prank(owner);
        cryptoWill.revokeWill();

        // Verify ETH refunded
        assertEq(owner.balance, ownerBalanceBefore + 3 ether);

        // Verify will deleted
        ICryptoWill.Will memory w = cryptoWill.getWill(owner);
        assertEq(w.owner, address(0));
    }

    function test_revokeWill_revert_noWill() public {
        vm.prank(owner);
        vm.expectRevert(ICryptoWill.WillNotFound.selector);
        cryptoWill.revokeWill();
    }

    function test_revokeWill_allowsRecreation() public {
        _createDefaultWill();

        vm.prank(owner);
        cryptoWill.revokeWill();

        // Owner can create a new will after revoke
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(owner);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);

        ICryptoWill.Will memory w = cryptoWill.getWill(owner);
        assertEq(w.owner, owner);
        assertEq(w.active, true);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  updateBeneficiary
    // ═══════════════════════════════════════════════════════════════════════

    function test_updateBeneficiary_success() public {
        _createDefaultWill();

        address newBeneficiary = makeAddr("newBeneficiary");

        vm.expectEmit(true, true, false, false);
        emit ICryptoWill.BeneficiaryUpdated(owner, newBeneficiary);

        vm.prank(owner);
        cryptoWill.updateBeneficiary(newBeneficiary);

        ICryptoWill.Will memory w = cryptoWill.getWill(owner);
        assertEq(w.beneficiary, newBeneficiary);
    }

    function test_updateBeneficiary_revert_zero() public {
        _createDefaultWill();

        vm.prank(owner);
        vm.expectRevert(ICryptoWill.InvalidBeneficiary.selector);
        cryptoWill.updateBeneficiary(address(0));
    }

    function test_updateBeneficiary_revert_self() public {
        _createDefaultWill();

        vm.prank(owner);
        vm.expectRevert(ICryptoWill.InvalidBeneficiary.selector);
        cryptoWill.updateBeneficiary(owner);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  depositETH
    // ═══════════════════════════════════════════════════════════════════════

    function test_depositETH_success() public {
        _createDefaultWill();

        vm.deal(owner, 10 ether);

        vm.expectEmit(true, false, false, true);
        emit ICryptoWill.ETHDeposited(owner, 2 ether);

        vm.prank(owner);
        cryptoWill.depositETH{value: 2 ether}();

        assertEq(cryptoWill.ethBalances(owner), 2 ether);

        // Deposit more
        vm.prank(owner);
        cryptoWill.depositETH{value: 3 ether}();

        assertEq(cryptoWill.ethBalances(owner), 5 ether);
    }

    function test_depositETH_revert_zeroValue() public {
        _createDefaultWill();

        vm.prank(owner);
        vm.expectRevert(ICryptoWill.ZeroETHDeposit.selector);
        cryptoWill.depositETH{value: 0}();
    }

    function test_depositETH_revert_noWill() public {
        vm.deal(owner, 10 ether);

        vm.prank(owner);
        vm.expectRevert(ICryptoWill.WillNotFound.selector);
        cryptoWill.depositETH{value: 1 ether}();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  getWill
    // ═══════════════════════════════════════════════════════════════════════

    function test_getWill_returnsCorrectData() public {
        _createDefaultWill();

        ICryptoWill.Will memory w = cryptoWill.getWill(owner);

        assertEq(w.owner, owner);
        assertEq(w.beneficiary, beneficiary);
        assertEq(w.tokens.length, 2);
        assertEq(w.tokens[0], address(token1));
        assertEq(w.tokens[1], address(token2));
        assertEq(w.gracePeriod, GRACE_PERIOD);
        assertEq(w.active, true);

        // Non-existent will returns zero struct
        ICryptoWill.Will memory empty = cryptoWill.getWill(makeAddr("nobody"));
        assertEq(empty.owner, address(0));
        assertEq(empty.beneficiary, address(0));
        assertEq(empty.tokens.length, 0);
        assertEq(empty.active, false);
    }
}
