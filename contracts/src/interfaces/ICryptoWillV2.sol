// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ICryptoWillV2
/// @notice Interface for the CryptoWillV2 multi-will dead man's switch contract
interface ICryptoWillV2 {
    // ─── Enums ──────────────────────────────────────────────────────────

    enum NFTType { ERC721, ERC1155 }

    // ─── Structs ────────────────────────────────────────────────────────

    struct NFTItem {
        address contractAddr;   // NFT contract address
        uint256 tokenId;        // Token ID
        uint256 amount;         // ERC-1155 quantity (1 for ERC-721)
        NFTType nftType;        // ERC721 or ERC1155
    }

    struct Will {
        address owner;
        address beneficiary;
        address[] tokens;
        NFTItem[] nfts;
        uint256 lastAlive;
        uint256 gracePeriod;
        bool active;
    }

    // ─── Custom Errors ──────────────────────────────────────────────────

    error WillNotFound();
    error WillNotActive();
    error NotWillOwner();
    error GracePeriodNotExpired();
    error GracePeriodTooShort();
    error InvalidBeneficiary();
    error NoTokensSpecified();
    error TransferFailed();
    error TooManyTokens();
    error TooManyNFTs();
    error ZeroETHDeposit();
    error NoETHPending();
    error InvalidNonce();
    error ProofExpired();
    error InvalidSignature();
    error TooManyWills();
    error WillIdOutOfRange();

    // ─── Events ─────────────────────────────────────────────────────────

    event WillCreated(address indexed owner, address indexed beneficiary, uint256 gracePeriod, uint256 willId);
    event AliveConfirmed(address indexed owner, uint256 timestamp, uint256 willId);
    event WillExecuted(address indexed owner, address indexed beneficiary, uint256 tokenCount, uint256 willId);
    event WillRevoked(address indexed owner, uint256 willId);
    event BeneficiaryUpdated(address indexed owner, address indexed newBeneficiary, uint256 willId);
    event ETHDeposited(address indexed owner, uint256 amount, uint256 willId);
    event TokensUpdated(address indexed owner, address[] newTokens, uint256 willId);
    event NFTsUpdated(address indexed owner, uint256 willId);
    event TokenTransferFailed(address indexed token, address indexed owner, address indexed beneficiary, uint256 amount);
    event NFTTransferFailed(address indexed contractAddr, uint256 tokenId, address indexed owner, address indexed beneficiary);
    event ETHPendingClaim(address indexed beneficiary, uint256 amount);
    event ETHClaimed(address indexed beneficiary, uint256 amount);

    // ─── Functions ──────────────────────────────────────────────────────

    /// @notice Create a new will for the caller
    /// @param beneficiary Address that will receive the assets
    /// @param tokens Array of ERC-20 token addresses to include
    /// @param gracePeriod Time in seconds after last alive signal before will can be executed
    /// @return willId The auto-incremented ID for the new will
    function createWill(address beneficiary, address[] calldata tokens, uint256 gracePeriod)
        external
        returns (uint256 willId);

    /// @notice Confirm the caller is still alive, resetting the grace period timer for a single will
    /// @param willId The ID of the will to refresh
    function signAlive(uint256 willId) external;

    /// @notice Confirm the caller is still alive, resetting the grace period timer for ALL active wills
    function signAlive() external;

    /// @notice Confirm alive via EIP-712 signature (gasless for will owner) — refreshes all active wills
    /// @param owner The will owner who signed the proof
    /// @param nonce Must match current aliveNonce for the owner
    /// @param issuedAt Timestamp when the proof was created (must be < 7 days old)
    /// @param signature EIP-712 signature from the owner
    function signAliveBySig(address owner, uint256 nonce, uint256 issuedAt, bytes calldata signature) external;

    /// @notice Execute a will after the grace period has expired
    /// @param owner Address of the will owner whose will to execute
    /// @param willId The ID of the will to execute
    function executeWill(address owner, uint256 willId) external;

    /// @notice Revoke one of the caller's wills and refund deposited ETH for that will
    /// @param willId The ID of the will to revoke
    function revokeWill(uint256 willId) external;

    /// @notice Update the beneficiary of one of the caller's wills
    /// @param willId The ID of the will to update
    /// @param newBeneficiary New beneficiary address
    function updateBeneficiary(uint256 willId, address newBeneficiary) external;

    /// @notice Replace the token list for one of the caller's wills
    /// @param willId The ID of the will to update
    /// @param newTokens New array of ERC-20 token addresses (must be pre-approved separately)
    function updateTokens(uint256 willId, address[] calldata newTokens) external;

    /// @notice Replace the NFT list for one of the caller's wills
    /// @param willId The ID of the will to update
    /// @param newNFTs New array of NFT items (must be pre-approved via setApprovalForAll)
    function updateNFTs(uint256 willId, NFTItem[] calldata newNFTs) external;

    /// @notice Deposit ETH into a specific will
    /// @param willId The ID of the will to deposit into
    function depositETH(uint256 willId) external payable;

    /// @notice Claim ETH owed to the caller from executed wills (pull-payment)
    function claimETH() external;

    /// @notice Get the will details for an owner's specific will
    /// @param owner Address of the will owner
    /// @param willId The ID of the will
    /// @return The Will struct for the given owner and willId
    function getWill(address owner, uint256 willId) external view returns (Will memory);

    /// @notice Get the total number of wills created by an owner (including revoked/executed)
    /// @param owner Address of the will owner
    /// @return The total will count
    function getWillCount(address owner) external view returns (uint256);

    /// @notice Get the IDs of all active wills for an owner
    /// @param owner Address of the will owner
    /// @return Array of active will IDs
    function getActiveWillIds(address owner) external view returns (uint256[] memory);
}
