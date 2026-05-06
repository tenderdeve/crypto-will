// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ICryptoWill
/// @notice Interface for the CryptoWill dead man's switch contract
interface ICryptoWill {
    // ─── Structs ────────────────────────────────────────────────────────

    struct Will {
        address owner;
        address beneficiary;
        address[] tokens;
        uint256 lastAlive;
        uint256 gracePeriod;
        bool active;
    }

    // ─── Custom Errors ──────────────────────────────────────────────────

    error WillAlreadyExists();
    error WillNotFound();
    error WillNotActive();
    error NotWillOwner();
    error GracePeriodNotExpired();
    error GracePeriodTooShort();
    error InvalidBeneficiary();
    error NoTokensSpecified();
    error TransferFailed();
    error TooManyTokens();
    error ZeroETHDeposit();
    error NoETHPending();

    // ─── Events ─────────────────────────────────────────────────────────

    event WillCreated(address indexed owner, address indexed beneficiary, uint256 gracePeriod);
    event AliveConfirmed(address indexed owner, uint256 timestamp);
    event WillExecuted(address indexed owner, address indexed beneficiary, uint256 tokenCount);
    event WillRevoked(address indexed owner);
    event BeneficiaryUpdated(address indexed owner, address indexed newBeneficiary);
    event ETHDeposited(address indexed owner, uint256 amount);
    /// @notice Emitted when an individual token transfer fails during executeWill (skipped, not reverted)
    event TokenTransferFailed(address indexed token, address indexed owner, address indexed beneficiary, uint256 amount);
    /// @notice Emitted when ETH is made claimable by beneficiary after will execution
    event ETHPendingClaim(address indexed beneficiary, uint256 amount);

    // ─── Functions ──────────────────────────────────────────────────────

    /// @notice Create a new will for the caller
    /// @param beneficiary Address that will receive the assets
    /// @param tokens Array of ERC-20 token addresses to include
    /// @param gracePeriod Time in seconds after last alive signal before will can be executed
    function createWill(address beneficiary, address[] calldata tokens, uint256 gracePeriod) external;

    /// @notice Confirm the caller is still alive, resetting the grace period timer
    function signAlive() external;

    /// @notice Execute a will after the grace period has expired
    /// @param owner Address of the will owner whose will to execute
    function executeWill(address owner) external;

    /// @notice Revoke the caller's will and refund deposited ETH
    function revokeWill() external;

    /// @notice Update the beneficiary of the caller's will
    /// @param newBeneficiary New beneficiary address
    function updateBeneficiary(address newBeneficiary) external;

    /// @notice Deposit ETH into the caller's will
    function depositETH() external payable;

    /// @notice Claim ETH owed to the caller from an executed will (pull-payment)
    function claimETH() external;

    /// @notice Get the will details for an owner
    /// @param owner Address of the will owner
    /// @return The Will struct for the given owner
    function getWill(address owner) external view returns (Will memory);
}
