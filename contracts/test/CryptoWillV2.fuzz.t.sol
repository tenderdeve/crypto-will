// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {CryptoWillV2} from "../src/CryptoWillV2.sol";
import {ICryptoWillV2} from "../src/interfaces/ICryptoWillV2.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract CryptoWillV2FuzzTest is Test {
    CryptoWillV2 public cryptoWill;
    MockERC20 public token1;

    address public owner = makeAddr("owner");
    address public beneficiary = makeAddr("beneficiary");

    uint256 public constant GRACE_PERIOD = 90 days;

    function setUp() public {
        cryptoWill = new CryptoWillV2();
        token1 = new MockERC20("Token1", "TK1");
        token1.mint(owner, 1000 ether);
    }

    /// @notice Fuzz: executeWill only succeeds when timePassed >= gracePeriod
    function testFuzz_gracePeriodBoundary(uint256 timePassed) public {
        timePassed = bound(timePassed, 0, 365 days * 10);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(owner);
        uint256 willId = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);

        vm.prank(owner);
        token1.approve(address(cryptoWill), type(uint256).max);

        vm.warp(block.timestamp + timePassed);

        if (timePassed < GRACE_PERIOD) {
            vm.expectRevert(ICryptoWillV2.GracePeriodNotExpired.selector);
            cryptoWill.executeWill(owner, willId);
        } else {
            cryptoWill.executeWill(owner, willId);
            assertEq(token1.balanceOf(beneficiary), 1000 ether);
        }
    }

    /// @notice Fuzz: any grace period >= 30 days should be accepted
    function testFuzz_createWill_validGracePeriod(uint256 gracePeriod) public {
        gracePeriod = bound(gracePeriod, 0, 365 days * 100);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        if (gracePeriod < 30 days) {
            vm.prank(owner);
            vm.expectRevert(ICryptoWillV2.GracePeriodTooShort.selector);
            cryptoWill.createWill(beneficiary, tokens, gracePeriod);
        } else {
            vm.prank(owner);
            uint256 willId = cryptoWill.createWill(beneficiary, tokens, gracePeriod);

            ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, willId);
            assertEq(w.gracePeriod, gracePeriod);
            assertEq(w.active, true);
        }
    }

    /// @notice Fuzz: willId bounds — accessing out of range should revert
    function testFuzz_willIdBounds(uint256 willId) public {
        // Create a single will (willCount will be 1)
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(owner);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);

        if (willId >= cryptoWill.willCount(owner)) {
            vm.prank(owner);
            vm.expectRevert(ICryptoWillV2.WillIdOutOfRange.selector);
            cryptoWill.signAlive(willId);
        } else {
            // willId == 0 should work
            vm.prank(owner);
            cryptoWill.signAlive(willId);
        }
    }

    /// @notice Fuzz: concurrent creates from same owner
    function testFuzz_concurrentCreates(uint8 count) public {
        // Limit to max 10 active wills
        uint256 createCount = bound(uint256(count), 1, 10);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(owner);
        for (uint256 i = 0; i < createCount; i++) {
            uint256 willId = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
            assertEq(willId, i);
        }
        vm.stopPrank();

        assertEq(cryptoWill.willCount(owner), createCount);
        assertEq(cryptoWill.activeWillCount(owner), createCount);

        // Verify each will
        for (uint256 i = 0; i < createCount; i++) {
            ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, i);
            assertEq(w.owner, owner);
            assertEq(w.active, true);
        }

        // getActiveWillIds should return all
        uint256[] memory activeIds = cryptoWill.getActiveWillIds(owner);
        assertEq(activeIds.length, createCount);
    }

    /// @notice Fuzz: signAlive(willId) with valid willId refreshes only that will
    function testFuzz_signAlive_single(uint8 createCount, uint8 refreshIndex) public {
        uint256 total = bound(uint256(createCount), 2, 10);
        uint256 refreshId = bound(uint256(refreshIndex), 0, total - 1);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        uint256 createTime = block.timestamp;

        vm.startPrank(owner);
        for (uint256 i = 0; i < total; i++) {
            cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
        }
        vm.stopPrank();

        vm.warp(block.timestamp + 45 days);
        uint256 refreshTime = block.timestamp;

        vm.prank(owner);
        cryptoWill.signAlive(refreshId);

        // Only the refreshed will should have the new timestamp
        for (uint256 i = 0; i < total; i++) {
            ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, i);
            if (i == refreshId) {
                assertEq(w.lastAlive, refreshTime);
            } else {
                assertEq(w.lastAlive, createTime);
            }
        }
    }

    /// @notice Fuzz: ETH deposits per will — depositing into one doesn't affect another
    function testFuzz_ethDeposits_perWill(uint128 amount0, uint128 amount1) public {
        // Bound to avoid overflow
        uint256 a0 = bound(uint256(amount0), 1, 100 ether);
        uint256 a1 = bound(uint256(amount1), 1, 100 ether);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(owner);
        uint256 id0 = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);
        uint256 id1 = cryptoWill.createWill(makeAddr("ben2"), tokens, GRACE_PERIOD);
        vm.stopPrank();

        vm.deal(owner, a0 + a1);

        vm.prank(owner);
        cryptoWill.depositETH{value: a0}(id0);
        vm.prank(owner);
        cryptoWill.depositETH{value: a1}(id1);

        assertEq(cryptoWill.ethBalances(owner, id0), a0);
        assertEq(cryptoWill.ethBalances(owner, id1), a1);
    }
}
