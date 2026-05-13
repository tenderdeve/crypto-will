// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title MockERC721
/// @notice Simple ERC-721 token with a public mint function for testing purposes
contract MockERC721 is ERC721 {
    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

    /// @notice Mint an NFT to any address — for testing only
    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }
}
