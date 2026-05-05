// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {CryptoWill} from "../src/CryptoWill.sol";
import {ICryptoWill} from "../src/interfaces/ICryptoWill.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract CryptoWillFuzzTest is Test {
    CryptoWill public cryptoWill;
    MockERC20 public token1;

    address public owner = makeAddr("owner");
    address public beneficiary = makeAddr("beneficiary");

    uint256 public constant GRACE_PERIOD = 90 days;

    function setUp() public {
        cryptoWill = new CryptoWill();
        token1 = new MockERC20("Token1", "TK1");
        token1.mint(owner, 1000 ether);
    }

    /// @notice Fuzz: executeWill only succeeds when timePassed >= gracePeriod
    function testFuzz_gracePeriodBoundary(uint256 timePassed) public {
        // Bound timePassed to reasonable range to avoid overflow
        timePassed = bound(timePassed, 0, 365 days * 10);

        // Setup will
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(owner);
        cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);

        // Approve tokens
        vm.prank(owner);
        token1.approve(address(cryptoWill), type(uint256).max);

        // Warp time
        vm.warp(block.timestamp + timePassed);

        if (timePassed < GRACE_PERIOD) {
            // Should revert — grace period not expired
            vm.expectRevert(ICryptoWill.GracePeriodNotExpired.selector);
            cryptoWill.executeWill(owner);
        } else {
            // Should succeed — grace period expired
            cryptoWill.executeWill(owner);
            assertEq(token1.balanceOf(beneficiary), 1000 ether);
        }
    }

    /// @notice Fuzz: any grace period >= 30 days should be accepted
    function testFuzz_createWill_validGracePeriod(uint256 gracePeriod) public {
        // Bound to avoid overflow but test wide range
        gracePeriod = bound(gracePeriod, 0, 365 days * 100);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        if (gracePeriod < 30 days) {
            // Should revert — grace period too short
            vm.prank(owner);
            vm.expectRevert(ICryptoWill.GracePeriodTooShort.selector);
            cryptoWill.createWill(beneficiary, tokens, gracePeriod);
        } else {
            // Should succeed
            vm.prank(owner);
            cryptoWill.createWill(beneficiary, tokens, gracePeriod);

            ICryptoWill.Will memory w = cryptoWill.getWill(owner);
            assertEq(w.gracePeriod, gracePeriod);
            assertEq(w.active, true);
        }
    }
}
