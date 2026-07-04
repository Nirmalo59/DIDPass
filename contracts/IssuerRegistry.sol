// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IssuerRegistry
 * @dev Registry of approved credential issuers (Universities, Banks, etc.)
 * Only the contract owner (DIDPass Admin) can add or revoke issuers.
 * This is Check #2 in the 4-check verification flow.
 */
contract IssuerRegistry {
    address public owner;

    struct Issuer {
        string  name;
        string  issuerType;   // "university" | "bank" | "government" | "other"
        string  logoEmoji;    // e.g. "🏛️", "🏦"
        bool    isApproved;
        uint256 registeredAt;
    }

    mapping(address => Issuer)  public issuers;
    address[]                   public issuerAddresses;

    event IssuerRegistered(address indexed wallet, string name, string issuerType);
    event IssuerRevoked   (address indexed wallet);
    event IssuerReinstated(address indexed wallet);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "IssuerRegistry: caller is not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ─── Admin functions ─────────────────────────────────────────────────────

    /**
     * @dev Register a new approved issuer institution.
     * @param issuerWallet  Wallet address of the institution
     * @param name          Human-readable institution name
     * @param issuerType    "university" | "bank" | "government" | "other"
     * @param logoEmoji     Single emoji for UI display (e.g. "🏛️")
     */
    function registerIssuer(
        address issuerWallet,
        string memory name,
        string memory issuerType,
        string memory logoEmoji
    ) external onlyOwner {
        require(issuerWallet != address(0), "Invalid wallet address");
        require(bytes(name).length > 0,     "Name cannot be empty");

        issuers[issuerWallet] = Issuer({
            name:         name,
            issuerType:   issuerType,
            logoEmoji:    logoEmoji,
            isApproved:   true,
            registeredAt: block.timestamp
        });

        // Append to list only once
        bool exists = false;
        for (uint256 i = 0; i < issuerAddresses.length; i++) {
            if (issuerAddresses[i] == issuerWallet) { exists = true; break; }
        }
        if (!exists) issuerAddresses.push(issuerWallet);

        emit IssuerRegistered(issuerWallet, name, issuerType);
    }

    function revokeIssuer(address issuerWallet) external onlyOwner {
        require(issuers[issuerWallet].registeredAt > 0, "Issuer not found");
        issuers[issuerWallet].isApproved = false;
        emit IssuerRevoked(issuerWallet);
    }

    function reinstateIssuer(address issuerWallet) external onlyOwner {
        require(issuers[issuerWallet].registeredAt > 0, "Issuer not found");
        issuers[issuerWallet].isApproved = true;
        emit IssuerReinstated(issuerWallet);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ─── View functions ───────────────────────────────────────────────────────

    function isApprovedIssuer(address issuerWallet) external view returns (bool) {
        return issuers[issuerWallet].isApproved;
    }

    function getIssuerDetails(address issuerWallet) external view returns (
        string memory name,
        string memory issuerType,
        string memory logoEmoji,
        bool          isApproved,
        uint256       registeredAt
    ) {
        Issuer memory i = issuers[issuerWallet];
        return (i.name, i.issuerType, i.logoEmoji, i.isApproved, i.registeredAt);
    }

    function getAllIssuers() external view returns (address[] memory) {
        return issuerAddresses;
    }

    function getIssuerCount() external view returns (uint256) {
        return issuerAddresses.length;
    }
}
