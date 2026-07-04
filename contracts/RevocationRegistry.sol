// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ICredentialRegistry {
    function getCredential(bytes32 credentialHash) external view returns (
        address holder,
        address issuer,
        string  memory credentialType,
        string  memory holderName,
        uint256 issuedAt,
        uint256 expiry,
        bool    exists
    );
}

/**
 * @title RevocationRegistry
 * @dev Allows issuers to revoke credentials they have previously issued.
 *
 * This contract powers Check #3 in the 4-check verification flow.
 * Only the original issuer of a credential may revoke it.
 * Revocations are permanent and immutable.
 */
contract RevocationRegistry {

    ICredentialRegistry public immutable credentialRegistry;

    struct RevocationRecord {
        bool    revoked;
        address revokedBy;
        uint256 revokedAt;
        string  reason;
    }

    mapping(bytes32 => RevocationRecord) public revocations;
    bytes32[] public revokedList;
    uint256   public totalRevocations;

    event CredentialRevoked(
        bytes32 indexed credentialHash,
        address indexed revokedBy,
        uint256         timestamp,
        string          reason
    );

    constructor(address _credentialRegistry) {
        require(_credentialRegistry != address(0), "Invalid credential registry");
        credentialRegistry = ICredentialRegistry(_credentialRegistry);
    }

    // ─── Issuer functions ────────────────────────────────────────────────────

    /**
     * @dev Revoke a credential.
     * Only the wallet that originally issued the credential may call this.
     * @param credentialHash  The hash of the credential to revoke
     * @param reason          Human-readable reason for revocation (stored on-chain)
     */
    function revokeCredential(bytes32 credentialHash, string memory reason) external {
        (, address issuer,,,,, bool exists) = credentialRegistry.getCredential(credentialHash);

        require(exists,                              "Credential does not exist");
        require(msg.sender == issuer,                "Only original issuer can revoke");
        require(!revocations[credentialHash].revoked, "Already revoked");

        revocations[credentialHash] = RevocationRecord({
            revoked:   true,
            revokedBy: msg.sender,
            revokedAt: block.timestamp,
            reason:    reason
        });

        revokedList.push(credentialHash);
        totalRevocations++;

        emit CredentialRevoked(credentialHash, msg.sender, block.timestamp, reason);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    function isRevoked(bytes32 credentialHash) external view returns (bool) {
        return revocations[credentialHash].revoked;
    }

    function getRevocationDetails(bytes32 credentialHash) external view returns (
        bool    revoked,
        address revokedBy,
        uint256 revokedAt,
        string  memory reason
    ) {
        RevocationRecord memory r = revocations[credentialHash];
        return (r.revoked, r.revokedBy, r.revokedAt, r.reason);
    }

    function getTotalRevocations() external view returns (uint256) {
        return totalRevocations;
    }
}
