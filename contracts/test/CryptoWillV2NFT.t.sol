// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {CryptoWillV2} from "../src/CryptoWillV2.sol";
import {ICryptoWillV2} from "../src/interfaces/ICryptoWillV2.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockERC721} from "./mocks/MockERC721.sol";
import {MockERC1155} from "./mocks/MockERC1155.sol";
import {RevertingERC721} from "./mocks/RevertingERC721.sol";

contract CryptoWillV2NFTTest is Test {
    CryptoWillV2 public cryptoWill;
    MockERC20 public token1;
    MockERC721 public nft721;
    MockERC721 public nft721b;
    MockERC1155 public nft1155;
    RevertingERC721 public revertNft;

    address public owner = makeAddr("owner");
    address public beneficiary = makeAddr("beneficiary");
    address public executor = makeAddr("executor");

    uint256 public constant GRACE_PERIOD = 90 days;

    function setUp() public {
        cryptoWill = new CryptoWillV2();
        token1 = new MockERC20("Token1", "TK1");
        nft721 = new MockERC721("TestNFT", "TNFT");
        nft721b = new MockERC721("TestNFTB", "TNFTB");
        nft1155 = new MockERC1155();
        revertNft = new RevertingERC721();

        // Mint ERC-20 tokens to owner
        token1.mint(owner, 1000 ether);

        // Mint ERC-721 NFTs to owner
        nft721.mint(owner, 1);
        nft721.mint(owner, 2);
        nft721b.mint(owner, 10);

        // Mint ERC-1155 tokens to owner
        nft1155.mint(owner, 100, 50, "");
        nft1155.mint(owner, 200, 100, "");

        // Mint a reverting NFT to owner
        revertNft.mint(owner, 1);
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    function _makeNFT721(address contractAddr, uint256 tokenId)
        internal
        pure
        returns (ICryptoWillV2.NFTItem memory)
    {
        return ICryptoWillV2.NFTItem({
            contractAddr: contractAddr,
            tokenId: tokenId,
            amount: 1,
            nftType: ICryptoWillV2.NFTType.ERC721
        });
    }

    function _makeNFT1155(address contractAddr, uint256 tokenId, uint256 amount)
        internal
        pure
        returns (ICryptoWillV2.NFTItem memory)
    {
        return ICryptoWillV2.NFTItem({
            contractAddr: contractAddr,
            tokenId: tokenId,
            amount: amount,
            nftType: ICryptoWillV2.NFTType.ERC1155
        });
    }

    function _createWillWithNFTs(
        ICryptoWillV2.NFTItem[] memory nfts
    ) internal returns (uint256) {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(owner);
        return cryptoWill.createWillWithNFTs(beneficiary, tokens, nfts, GRACE_PERIOD);
    }

    function _createNFTOnlyWill(
        ICryptoWillV2.NFTItem[] memory nfts
    ) internal returns (uint256) {
        address[] memory tokens = new address[](0);

        vm.prank(owner);
        return cryptoWill.createWillWithNFTs(beneficiary, tokens, nfts, GRACE_PERIOD);
    }

    function _approveAll() internal {
        vm.startPrank(owner);
        token1.approve(address(cryptoWill), type(uint256).max);
        nft721.setApprovalForAll(address(cryptoWill), true);
        nft721b.setApprovalForAll(address(cryptoWill), true);
        nft1155.setApprovalForAll(address(cryptoWill), true);
        revertNft.setApprovalForAll(address(cryptoWill), true);
        vm.stopPrank();
    }

    // ─── createWillWithNFTs ─────────────────────────────────────────────

    function test_createWillWithNFTs_mixedTokensAndNFTs() public {
        ICryptoWillV2.NFTItem[] memory nfts = new ICryptoWillV2.NFTItem[](2);
        nfts[0] = _makeNFT721(address(nft721), 1);
        nfts[1] = _makeNFT1155(address(nft1155), 100, 25);

        uint256 willId = _createWillWithNFTs(nfts);

        ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, willId);
        assertEq(w.tokens.length, 1);
        assertEq(w.nfts.length, 2);
        assertEq(w.nfts[0].contractAddr, address(nft721));
        assertEq(w.nfts[0].tokenId, 1);
        assertEq(uint8(w.nfts[0].nftType), uint8(ICryptoWillV2.NFTType.ERC721));
        assertEq(w.nfts[1].contractAddr, address(nft1155));
        assertEq(w.nfts[1].tokenId, 100);
        assertEq(w.nfts[1].amount, 25);
        assertEq(uint8(w.nfts[1].nftType), uint8(ICryptoWillV2.NFTType.ERC1155));
    }

    function test_createWillWithNFTs_nftOnly() public {
        ICryptoWillV2.NFTItem[] memory nfts = new ICryptoWillV2.NFTItem[](1);
        nfts[0] = _makeNFT721(address(nft721), 1);

        uint256 willId = _createNFTOnlyWill(nfts);

        ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, willId);
        assertEq(w.tokens.length, 0);
        assertEq(w.nfts.length, 1);
        assertTrue(w.active);
    }

    function test_createWillWithNFTs_revert_noAssetsAtAll() public {
        ICryptoWillV2.NFTItem[] memory nfts = new ICryptoWillV2.NFTItem[](0);
        address[] memory tokens = new address[](0);

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.NoTokensSpecified.selector);
        cryptoWill.createWillWithNFTs(beneficiary, tokens, nfts, GRACE_PERIOD);
    }

    // ─── executeWill — NFT transfers ────────────────────────────────────

    function test_executeWill_erc20AndNFTsBothTransfer() public {
        _approveAll();

        ICryptoWillV2.NFTItem[] memory nfts = new ICryptoWillV2.NFTItem[](2);
        nfts[0] = _makeNFT721(address(nft721), 1);
        nfts[1] = _makeNFT1155(address(nft1155), 100, 25);

        uint256 willId = _createWillWithNFTs(nfts);

        // Warp past grace period
        vm.warp(block.timestamp + GRACE_PERIOD + 1);

        vm.prank(executor);
        cryptoWill.executeWill(owner, willId);

        // Check ERC-20 transferred
        assertGt(token1.balanceOf(beneficiary), 0);

        // Check ERC-721 transferred
        assertEq(nft721.ownerOf(1), beneficiary);

        // Check ERC-1155 transferred
        assertEq(nft1155.balanceOf(beneficiary, 100), 25);
        // Owner still has remaining
        assertEq(nft1155.balanceOf(owner, 100), 25);
    }

    function test_executeWill_revertingNFT_doesNotBlockOthers() public {
        _approveAll();

        ICryptoWillV2.NFTItem[] memory nfts = new ICryptoWillV2.NFTItem[](3);
        nfts[0] = _makeNFT721(address(nft721), 1);
        nfts[1] = _makeNFT721(address(revertNft), 1); // Will revert
        nfts[2] = _makeNFT721(address(nft721b), 10);

        uint256 willId = _createWillWithNFTs(nfts);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);

        vm.prank(executor);
        cryptoWill.executeWill(owner, willId);

        // First and third NFTs should transfer
        assertEq(nft721.ownerOf(1), beneficiary);
        assertEq(nft721b.ownerOf(10), beneficiary);

        // Reverting NFT stays with owner
        assertEq(revertNft.ownerOf(1), owner);
    }

    function test_executeWill_emitsNFTTransferFailed() public {
        _approveAll();

        ICryptoWillV2.NFTItem[] memory nfts = new ICryptoWillV2.NFTItem[](1);
        nfts[0] = _makeNFT721(address(revertNft), 1);

        uint256 willId = _createWillWithNFTs(nfts);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);

        vm.expectEmit(true, false, true, true);
        emit ICryptoWillV2.NFTTransferFailed(address(revertNft), 1, owner, beneficiary);

        vm.prank(executor);
        cryptoWill.executeWill(owner, willId);
    }

    function test_executeWill_erc1155PartialAmount() public {
        _approveAll();

        // Owner has 50 of token 100. Will specifies 30.
        ICryptoWillV2.NFTItem[] memory nfts = new ICryptoWillV2.NFTItem[](1);
        nfts[0] = _makeNFT1155(address(nft1155), 100, 30);

        uint256 willId = _createWillWithNFTs(nfts);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);

        vm.prank(executor);
        cryptoWill.executeWill(owner, willId);

        assertEq(nft1155.balanceOf(beneficiary, 100), 30);
        assertEq(nft1155.balanceOf(owner, 100), 20);
    }

    function test_executeWill_erc1155MultipleTokenIds() public {
        _approveAll();

        ICryptoWillV2.NFTItem[] memory nfts = new ICryptoWillV2.NFTItem[](2);
        nfts[0] = _makeNFT1155(address(nft1155), 100, 10);
        nfts[1] = _makeNFT1155(address(nft1155), 200, 50);

        uint256 willId = _createWillWithNFTs(nfts);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);

        vm.prank(executor);
        cryptoWill.executeWill(owner, willId);

        assertEq(nft1155.balanceOf(beneficiary, 100), 10);
        assertEq(nft1155.balanceOf(beneficiary, 200), 50);
    }

    // ─── Max NFTs boundary ──────────────────────────────────────────────

    function test_createWillWithNFTs_exactly20_succeeds() public {
        ICryptoWillV2.NFTItem[] memory nfts = new ICryptoWillV2.NFTItem[](20);
        for (uint256 i = 0; i < 20; i++) {
            nfts[i] = _makeNFT721(address(nft721), i + 100);
        }

        // Mint all NFTs
        for (uint256 i = 0; i < 20; i++) {
            nft721.mint(owner, i + 100);
        }

        uint256 willId = _createNFTOnlyWill(nfts);

        ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, willId);
        assertEq(w.nfts.length, 20);
    }

    function test_createWillWithNFTs_revert_21NFTs() public {
        ICryptoWillV2.NFTItem[] memory nfts = new ICryptoWillV2.NFTItem[](21);
        for (uint256 i = 0; i < 21; i++) {
            nfts[i] = _makeNFT721(address(nft721), i + 200);
        }

        address[] memory tokens = new address[](0);

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.TooManyNFTs.selector);
        cryptoWill.createWillWithNFTs(beneficiary, tokens, nfts, GRACE_PERIOD);
    }

    // ─── updateNFTs ─────────────────────────────────────────────────────

    function test_updateNFTs_success() public {
        ICryptoWillV2.NFTItem[] memory nfts = new ICryptoWillV2.NFTItem[](1);
        nfts[0] = _makeNFT721(address(nft721), 1);

        uint256 willId = _createWillWithNFTs(nfts);

        // Update to different NFTs
        ICryptoWillV2.NFTItem[] memory newNFTs = new ICryptoWillV2.NFTItem[](2);
        newNFTs[0] = _makeNFT721(address(nft721), 2);
        newNFTs[1] = _makeNFT1155(address(nft1155), 200, 10);

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit ICryptoWillV2.NFTsUpdated(owner, willId);
        cryptoWill.updateNFTs(willId, newNFTs);

        ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, willId);
        assertEq(w.nfts.length, 2);
        assertEq(w.nfts[0].tokenId, 2);
        assertEq(w.nfts[1].tokenId, 200);
    }

    function test_updateNFTs_clearAll() public {
        ICryptoWillV2.NFTItem[] memory nfts = new ICryptoWillV2.NFTItem[](1);
        nfts[0] = _makeNFT721(address(nft721), 1);

        uint256 willId = _createWillWithNFTs(nfts);

        // Clear all NFTs (will still has ERC-20 tokens)
        ICryptoWillV2.NFTItem[] memory empty = new ICryptoWillV2.NFTItem[](0);

        vm.prank(owner);
        cryptoWill.updateNFTs(willId, empty);

        ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, willId);
        assertEq(w.nfts.length, 0);
        assertEq(w.tokens.length, 1); // ERC-20 still intact
    }

    function test_updateNFTs_revert_tooMany() public {
        ICryptoWillV2.NFTItem[] memory nfts = new ICryptoWillV2.NFTItem[](1);
        nfts[0] = _makeNFT721(address(nft721), 1);

        uint256 willId = _createWillWithNFTs(nfts);

        ICryptoWillV2.NFTItem[] memory tooMany = new ICryptoWillV2.NFTItem[](21);
        for (uint256 i = 0; i < 21; i++) {
            tooMany[i] = _makeNFT721(address(nft721), i + 300);
        }

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.TooManyNFTs.selector);
        cryptoWill.updateNFTs(willId, tooMany);
    }

    function test_updateNFTs_revert_notActive() public {
        ICryptoWillV2.NFTItem[] memory nfts = new ICryptoWillV2.NFTItem[](1);
        nfts[0] = _makeNFT721(address(nft721), 1);

        uint256 willId = _createWillWithNFTs(nfts);

        // Revoke the will
        vm.prank(owner);
        cryptoWill.revokeWill(willId);

        ICryptoWillV2.NFTItem[] memory newNFTs = new ICryptoWillV2.NFTItem[](1);
        newNFTs[0] = _makeNFT721(address(nft721), 2);

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.WillNotActive.selector);
        cryptoWill.updateNFTs(willId, newNFTs);
    }

    function test_updateNFTs_revert_clearAllWhenNoTokens() public {
        // Create will with NFTs only (no ERC-20 tokens)
        ICryptoWillV2.NFTItem[] memory nfts = new ICryptoWillV2.NFTItem[](1);
        nfts[0] = _makeNFT721(address(nft721), 1);

        uint256 willId = _createNFTOnlyWill(nfts);

        // Try to clear all NFTs — should revert because will would have zero assets
        ICryptoWillV2.NFTItem[] memory empty = new ICryptoWillV2.NFTItem[](0);

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.NoTokensSpecified.selector);
        cryptoWill.updateNFTs(willId, empty);
    }

    function test_updateNFTs_revert_outOfRange() public {
        ICryptoWillV2.NFTItem[] memory newNFTs = new ICryptoWillV2.NFTItem[](1);
        newNFTs[0] = _makeNFT721(address(nft721), 1);

        vm.prank(owner);
        vm.expectRevert(ICryptoWillV2.WillIdOutOfRange.selector);
        cryptoWill.updateNFTs(999, newNFTs);
    }

    // ─── Approval revocation ────────────────────────────────────────────

    function test_executeWill_ownerRevokesApproval_transferFailsGracefully() public {
        _approveAll();

        ICryptoWillV2.NFTItem[] memory nfts = new ICryptoWillV2.NFTItem[](2);
        nfts[0] = _makeNFT721(address(nft721), 1);
        nfts[1] = _makeNFT721(address(nft721), 2);

        uint256 willId = _createWillWithNFTs(nfts);

        // Owner revokes approval before execution
        vm.prank(owner);
        nft721.setApprovalForAll(address(cryptoWill), false);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);

        // Should still execute without reverting — NFT transfers fail gracefully
        vm.prank(executor);
        cryptoWill.executeWill(owner, willId);

        // NFTs stay with owner since approval was revoked
        assertEq(nft721.ownerOf(1), owner);
        assertEq(nft721.ownerOf(2), owner);

        // Will is still marked as executed (inactive)
        ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, willId);
        assertFalse(w.active);
    }

    function test_executeWill_erc1155_ownerRevokesApproval_failsGracefully() public {
        _approveAll();

        ICryptoWillV2.NFTItem[] memory nfts = new ICryptoWillV2.NFTItem[](1);
        nfts[0] = _makeNFT1155(address(nft1155), 100, 25);

        uint256 willId = _createWillWithNFTs(nfts);

        // Owner revokes ERC-1155 approval
        vm.prank(owner);
        nft1155.setApprovalForAll(address(cryptoWill), false);

        vm.warp(block.timestamp + GRACE_PERIOD + 1);

        vm.prank(executor);
        cryptoWill.executeWill(owner, willId);

        // NFT stays with owner
        assertEq(nft1155.balanceOf(owner, 100), 50);
        assertEq(nft1155.balanceOf(beneficiary, 100), 0);
    }

    // ─── Legacy createWill (no NFTs) ────────────────────────────────────

    function test_legacyCreateWill_hasEmptyNFTs() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(owner);
        uint256 willId = cryptoWill.createWill(beneficiary, tokens, GRACE_PERIOD);

        ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, willId);
        assertEq(w.nfts.length, 0);
        assertEq(w.tokens.length, 1);
        assertTrue(w.active);
    }

    // ─── getWill returns NFTs ───────────────────────────────────────────

    function test_getWill_returnsNFTData() public {
        ICryptoWillV2.NFTItem[] memory nfts = new ICryptoWillV2.NFTItem[](3);
        nfts[0] = _makeNFT721(address(nft721), 1);
        nfts[1] = _makeNFT721(address(nft721), 2);
        nfts[2] = _makeNFT1155(address(nft1155), 100, 50);

        uint256 willId = _createWillWithNFTs(nfts);

        ICryptoWillV2.Will memory w = cryptoWill.getWill(owner, willId);
        assertEq(w.nfts.length, 3);

        // Verify each NFT item
        assertEq(w.nfts[0].contractAddr, address(nft721));
        assertEq(w.nfts[0].tokenId, 1);
        assertEq(w.nfts[0].amount, 1);
        assertEq(uint8(w.nfts[0].nftType), uint8(ICryptoWillV2.NFTType.ERC721));

        assertEq(w.nfts[2].contractAddr, address(nft1155));
        assertEq(w.nfts[2].tokenId, 100);
        assertEq(w.nfts[2].amount, 50);
        assertEq(uint8(w.nfts[2].nftType), uint8(ICryptoWillV2.NFTType.ERC1155));
    }
}
