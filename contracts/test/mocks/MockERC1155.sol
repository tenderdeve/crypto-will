// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

/// @title MockERC1155
/// @notice Simple ERC-1155 token with a public mint function for testing purposes
contract MockERC1155 is ERC1155 {
    constructor() ERC1155("https://example.com/api/{id}.json") {}

    /// @notice Mint tokens to any address — for testing only
    function mint(address to, uint256 id, uint256 amount, bytes memory data) external {
        _mint(to, id, amount, data);
    }
}
