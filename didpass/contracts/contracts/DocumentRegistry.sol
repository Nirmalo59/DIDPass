// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DocumentRegistry
 * @dev A decentralized registry for anchoring and verifying document hashes.
 */
contract DocumentRegistry {
    
    struct Document {
        address issuer;
        uint256 timestamp;
        bool isValid;
        bool exists;
    }
    
    // Mapping from SHA-256 Hash -> Document metadata
    mapping(bytes32 => Document) public documents;
    
    // Events
    event DocumentIssued(bytes32 indexed documentHash, address indexed issuer, uint256 timestamp);
    event DocumentRevoked(bytes32 indexed documentHash, address indexed issuer, uint256 timestamp);
    
    /**
     * @dev Issues a new document by anchoring its hash on the blockchain.
     * @param documentHash The SHA-256 hash of the document.
     */
    function issueDocument(bytes32 documentHash) external {
        require(!documents[documentHash].exists, "Document already exists");
        
        documents[documentHash] = Document({
            issuer: msg.sender,
            timestamp: block.timestamp,
            isValid: true,
            exists: true
        });
        
        emit DocumentIssued(documentHash, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Revokes an existing document. Only the original issuer can revoke it.
     * @param documentHash The SHA-256 hash of the document to revoke.
     */
    function revokeDocument(bytes32 documentHash) external {
        require(documents[documentHash].exists, "Document does not exist");
        require(documents[documentHash].issuer == msg.sender, "Only issuer can revoke");
        require(documents[documentHash].isValid, "Document already revoked");
        
        documents[documentHash].isValid = false;
        
        emit DocumentRevoked(documentHash, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Verifies a document's status.
     * @param documentHash The SHA-256 hash of the document.
     * @return issuer The address of the issuer.
     * @return timestamp The time the document was issued.
     * @return isValid True if the document is valid and not revoked.
     */
    function verifyDocument(bytes32 documentHash) external view returns (address issuer, uint256 timestamp, bool isValid) {
        require(documents[documentHash].exists, "Document not found in registry");
        
        Document memory doc = documents[documentHash];
        return (doc.issuer, doc.timestamp, doc.isValid);
    }
}
