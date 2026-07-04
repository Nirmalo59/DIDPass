// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AuditHashLedger
 * @dev Immutable, append-only audit trail for all critical platform actions.
 * Every significant event (credential issued, login verified, doc uploaded,
 * credential revoked) is hashed and written here.
 *
 * Architecture role: On-Chain Layer → Audit Hash Ledger
 * Core Service: Audit & Monitoring
 */
contract AuditHashLedger {

    enum ActionType {
        CREDENTIAL_ISSUED,      // 0
        CREDENTIAL_VERIFIED,    // 1
        CREDENTIAL_REVOKED,     // 2
        LOGIN_SUCCESS,          // 3
        LOGIN_FAILED,           // 4
        DOCUMENT_UPLOADED,      // 5
        DID_REGISTERED,         // 6
        ISSUER_REGISTERED       // 7
    }

    struct AuditEntry {
        bytes32    eventHash;    // keccak256 of the full event data
        ActionType actionType;
        address    actor;        // Wallet address of the actor
        uint256    timestamp;
        string     metadata;     // JSON string of additional context
    }

    AuditEntry[] public auditLog;
    uint256      public totalEntries;

    // actor → list of their event hashes
    mapping(address => bytes32[]) public actorEvents;

    event AuditEventLogged(
        bytes32    indexed eventHash,
        ActionType indexed actionType,
        address    indexed actor,
        uint256            timestamp
    );

    // ─── Write functions ──────────────────────────────────────────────────────

    /**
     * @dev Write an audit event to the immutable ledger.
     * Called by the backend for every significant platform action.
     * @param eventHash   keccak256 hash of (actionType + actor + timestamp + metadata)
     * @param actionType  Enum value of the action
     * @param actor       Wallet address of the user/issuer/admin performing the action
     * @param metadata    JSON string with extra context (credential type, issuer name, etc.)
     */
    function logEvent(
        bytes32    eventHash,
        ActionType actionType,
        address    actor,
        string memory metadata
    ) external {
        require(eventHash != bytes32(0), "Invalid event hash");

        AuditEntry memory entry = AuditEntry({
            eventHash:  eventHash,
            actionType: actionType,
            actor:      actor,
            timestamp:  block.timestamp,
            metadata:   metadata
        });

        auditLog.push(entry);
        actorEvents[actor].push(eventHash);
        totalEntries++;

        emit AuditEventLogged(eventHash, actionType, actor, block.timestamp);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    function getEntry(uint256 index) external view returns (
        bytes32    eventHash,
        ActionType actionType,
        address    actor,
        uint256    timestamp,
        string     memory metadata
    ) {
        AuditEntry memory e = auditLog[index];
        return (e.eventHash, e.actionType, e.actor, e.timestamp, e.metadata);
    }

    function getActorEvents(address actor) external view returns (bytes32[] memory) {
        return actorEvents[actor];
    }

    function getTotalEntries() external view returns (uint256) {
        return totalEntries;
    }

    function getRecentEntries(uint256 count) external view returns (AuditEntry[] memory) {
        uint256 len    = auditLog.length;
        uint256 start  = len > count ? len - count : 0;
        uint256 size   = len - start;
        AuditEntry[] memory result = new AuditEntry[](size);
        for (uint256 i = 0; i < size; i++) {
            result[i] = auditLog[start + i];
        }
        return result;
    }
}
