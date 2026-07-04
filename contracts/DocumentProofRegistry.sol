// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DocumentProofRegistry
 * @dev Anchors SHA-256 hashes of real-world documents (PDFs, certificates,
 * transcripts) on-chain so their integrity can be verified at any time.
 *
 * Architecture role: On-Chain Layer → Document Proof Registry
 * Core Service: Document Hashing & Proof Service
 */
contract DocumentProofRegistry {

    struct DocumentProof {
        bytes32 sha256Hash;       // SHA-256 hash of the original file
        address uploadedBy;       // Wallet that registered this proof
        string  documentType;     // "transcript", "certificate", "kyc_doc", etc.
        string  fileName;         // Original filename (off-chain reference)
        string  ipfsCid;          // Mock IPFS CID for off-chain retrieval
        uint256 registeredAt;
        bool    exists;
    }

    // sha256Hash → DocumentProof
    mapping(bytes32 => DocumentProof) public proofs;
    // wallet → list of document hashes they uploaded
    mapping(address => bytes32[])     public walletDocuments;

    uint256 public totalDocuments;

    event DocumentProofRegistered(
        bytes32 indexed sha256Hash,
        address indexed uploadedBy,
        string  documentType,
        string  ipfsCid,
        uint256 timestamp
    );

    // ─── Write functions ──────────────────────────────────────────────────────

    /**
     * @dev Anchor a document's SHA-256 hash on the blockchain.
     * Once anchored, the document's integrity can be proven forever.
     * @param sha256Hash    The SHA-256 hash of the original file (bytes32)
     * @param documentType  Human-readable type: "transcript", "certificate"
     * @param fileName      Original filename for UI display
     * @param ipfsCid       IPFS Content ID (or mock CID) for retrieval
     */
    function registerDocumentProof(
        bytes32       sha256Hash,
        string memory documentType,
        string memory fileName,
        string memory ipfsCid
    ) external {
        require(sha256Hash != bytes32(0),      "Invalid hash");
        require(!proofs[sha256Hash].exists,    "Document already registered");
        require(bytes(documentType).length > 0, "Type cannot be empty");

        proofs[sha256Hash] = DocumentProof({
            sha256Hash:   sha256Hash,
            uploadedBy:   msg.sender,
            documentType: documentType,
            fileName:     fileName,
            ipfsCid:      ipfsCid,
            registeredAt: block.timestamp,
            exists:       true
        });

        walletDocuments[msg.sender].push(sha256Hash);
        totalDocuments++;

        emit DocumentProofRegistered(sha256Hash, msg.sender, documentType, ipfsCid, block.timestamp);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    function getDocumentProof(bytes32 sha256Hash) external view returns (
        address uploadedBy,
        string  memory documentType,
        string  memory fileName,
        string  memory ipfsCid,
        uint256 registeredAt,
        bool    exists
    ) {
        DocumentProof memory p = proofs[sha256Hash];
        return (p.uploadedBy, p.documentType, p.fileName, p.ipfsCid, p.registeredAt, p.exists);
    }

    /**
     * @dev Verify if a document with the given hash was ever registered.
     * This is the core "Document Integrity Proof" function.
     */
    function verifyDocument(bytes32 sha256Hash) external view returns (bool) {
        return proofs[sha256Hash].exists;
    }

    function getWalletDocuments(address wallet) external view returns (bytes32[] memory) {
        return walletDocuments[wallet];
    }

    function getTotalDocuments() external view returns (uint256) {
        return totalDocuments;
    }
}
