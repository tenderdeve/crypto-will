// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title RevertingERC20
/// @notice ERC20 that always reverts on transferFrom — simulates blacklisted/paused tokens
contract RevertingERC20 is ERC20 {
    constructor() ERC20("RevertToken", "RVT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transferFrom(address, address, uint256) public pure override returns (bool) {
        revert("RevertingERC20: always reverts");
    }
}

/// @title ReturnFalseERC20
/// @notice ERC20 that returns false on transferFrom instead of reverting — non-standard token
contract ReturnFalseERC20 is ERC20 {
    constructor() ERC20("FalseToken", "FLT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transferFrom(address, address, uint256) public pure override returns (bool) {
        return false;
    }
}
