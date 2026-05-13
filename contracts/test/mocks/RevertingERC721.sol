// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title RevertingERC721
/// @notice ERC-721 that always reverts on transferFrom — simulates a broken/paused NFT contract
contract RevertingERC721 is ERC721 {
    constructor() ERC721("RevertNFT", "RNFT") {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }

    function transferFrom(address, address, uint256) public pure override {
        revert("RevertingERC721: always reverts");
    }
}
