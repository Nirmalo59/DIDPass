// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DIDRegistry
 * @dev Maps every user's wallet address to their DID (Decentralized Identifier)
 * document hash. The DID document itself lives off-chain; only its SHA-256
 * hash is stored immutably here for integrity verification.
 *
 * Architecture role: On-Chain Layer → DID Registry
 */
contract DIDRegistry {

    struct DIDDocument {
        bytes32 documentHash;   // SHA-256 hash of the off-chain DID JSON document
        string  didUri;         // e.g. "did:didpass:0x1234...abcd"
        uint256 createdAt;
        uint256 updatedAt;
        bool    exists;
    }

    mapping(address => DIDDocument) public dids;
    address[] public registeredWallets;
    uint256   public totalDIDs;

    event DIDRegistered(address indexed wallet, string didUri, bytes32 documentHash);
    event DIDUpdated   (address indexed wallet, bytes32 newDocumentHash);
    event DIDDeactivated(address indexed wallet);

    // ─── Write functions ──────────────────────────────────────────────────────

    /**
     * @dev Register or update the caller's DID document hash.
     * Each wallet self-registers — no admin needed.
     * @param documentHash  keccak256 / SHA-256 hash of the off-chain DID JSON
     * @param didUri        The DID URI string (e.g. "did:didpass:0x...")
     */
    function registerDID(bytes32 documentHash, string memory didUri) external {
        require(documentHash != bytes32(0), "Invalid document hash");
        require(bytes(didUri).length > 0,   "DID URI cannot be empty");

        if (!dids[msg.sender].exists) {
            dids[msg.sender] = DIDDocument({
                documentHash: documentHash,
                didUri:       didUri,
                createdAt:    block.timestamp,
                updatedAt:    block.timestamp,
                exists:       true
            });
            registeredWallets.push(msg.sender);
            totalDIDs++;
            emit DIDRegistered(msg.sender, didUri, documentHash);
        } else {
            dids[msg.sender].documentHash = documentHash;
            dids[msg.sender].updatedAt    = block.timestamp;
            emit DIDUpdated(msg.sender, documentHash);
        }
    }

    // ─── View functions ───────────────────────────────────────────────────────

    function getDID(address wallet) external view returns (
        bytes32 documentHash,
        string  memory didUri,
        uint256 createdAt,
        uint256 updatedAt,
        bool    exists
    ) {
        DIDDocument memory d = dids[wallet];
        return (d.documentHash, d.didUri, d.createdAt, d.updatedAt, d.exists);
    }

    function didExists(address wallet) external view returns (bool) {
        return dids[wallet].exists;
    }

    function getTotalDIDs() external view returns (uint256) {
        return totalDIDs;
    }
}
