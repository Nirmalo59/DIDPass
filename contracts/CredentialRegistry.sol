// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IIssuerRegistry {
    function isApprovedIssuer(address issuerWallet) external view returns (bool);
    function getIssuerDetails(address issuerWallet) external view returns (
        string memory name,
        string memory issuerType,
        string memory logoEmoji,
        bool          isApproved,
        uint256       registeredAt
    );
}

/**
 * @title CredentialRegistry
 * @dev Stores the on-chain record of every issued verifiable credential.
 *
 * The full credential data lives off-chain (MongoDB). Only the keccak256
 * hash of that data is anchored here. This hash is Check #1.
 * The issuer field enables Check #2 (approved issuer).
 * The expiry field enables Check #4.
 */
contract CredentialRegistry {

    IIssuerRegistry public immutable issuerRegistry;

    struct Credential {
        address holder;          // Wallet address of the student/user
        address issuer;          // Wallet address of the institution
        string  credentialType;  // "student_id" | "bank_kyc" | "employee_id"
        string  holderName;      // Human-readable name of the holder
        uint256 issuedAt;        // Unix timestamp of issuance
        uint256 expiry;          // Unix timestamp of expiry  (0 = no expiry)
        bool    exists;
    }

    mapping(bytes32 => Credential)              public credentials;
    mapping(address => bytes32[])               public holderCredentials;
    // holder → credentialType → latest credentialHash
    mapping(address => mapping(string => bytes32)) public latestByType;

    uint256 public totalCredentials;

    event CredentialIssued(
        bytes32 indexed credentialHash,
        address indexed holder,
        address indexed issuer,
        string  credentialType,
        uint256 expiry
    );

    constructor(address _issuerRegistry) {
        require(_issuerRegistry != address(0), "Invalid issuer registry");
        issuerRegistry = IIssuerRegistry(_issuerRegistry);
    }

    // ─── Issuer functions ────────────────────────────────────────────────────

    /**
     * @dev Issue a new verifiable credential on-chain.
     * @param holder          Recipient wallet address
     * @param credentialHash  keccak256 hash of off-chain credential data
     * @param credentialType  "student_id" | "bank_kyc" | etc.
     * @param holderName      Display name of the credential holder
     * @param expiry          Expiry timestamp (pass 0 for no expiry)
     */
    function issueCredential(
        address       holder,
        bytes32       credentialHash,
        string memory credentialType,
        string memory holderName,
        uint256       expiry
    ) external {
        require(
            issuerRegistry.isApprovedIssuer(msg.sender),
            "CredentialRegistry: caller is not an approved issuer"
        );
        require(holder != address(0),               "Invalid holder address");
        require(!credentials[credentialHash].exists, "Hash collision: credential already exists");
        require(expiry == 0 || expiry > block.timestamp, "Expiry must be in the future");

        credentials[credentialHash] = Credential({
            holder:         holder,
            issuer:         msg.sender,
            credentialType: credentialType,
            holderName:     holderName,
            issuedAt:       block.timestamp,
            expiry:         expiry,
            exists:         true
        });

        holderCredentials[holder].push(credentialHash);
        latestByType[holder][credentialType] = credentialHash;
        totalCredentials++;

        emit CredentialIssued(credentialHash, holder, msg.sender, credentialType, expiry);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    function getCredential(bytes32 credentialHash) external view returns (
        address holder,
        address issuer,
        string  memory credentialType,
        string  memory holderName,
        uint256 issuedAt,
        uint256 expiry,
        bool    exists
    ) {
        Credential memory c = credentials[credentialHash];
        return (c.holder, c.issuer, c.credentialType, c.holderName, c.issuedAt, c.expiry, c.exists);
    }

    function getHolderCredentials(address holder) external view returns (bytes32[] memory) {
        return holderCredentials[holder];
    }

    function getLatestByType(address holder, string memory credentialType)
        external view returns (bytes32)
    {
        return latestByType[holder][credentialType];
    }

    function credentialExists(bytes32 credentialHash) external view returns (bool) {
        return credentials[credentialHash].exists;
    }

    /**
     * @dev Returns true if the credential has passed its expiry date.
     *      A credential with expiry == 0 never expires.
     */
    function isExpired(bytes32 credentialHash) external view returns (bool) {
        Credential memory c = credentials[credentialHash];
        if (!c.exists)     return true;   // non-existent → treat as expired
        if (c.expiry == 0) return false;  // no expiry set
        return block.timestamp > c.expiry;
    }
}
