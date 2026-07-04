-- CreateTable
CREATE TABLE "issuers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "logoEmoji" TEXT NOT NULL DEFAULT '🏛️',
    "email" TEXT,
    "website" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "credentialHash" TEXT NOT NULL,
    "holderAddress" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "holderEmail" TEXT,
    "issuerAddress" TEXT NOT NULL,
    "credentialType" TEXT NOT NULL,
    "documentHash" TEXT,
    "encryptedFilePath" TEXT,
    "ipfsCid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "claimedAt" DATETIME,
    "metadata" TEXT,
    CONSTRAINT "credentials_issuerAddress_fkey" FOREIGN KEY ("issuerAddress") REFERENCES "issuers" ("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sha256Hash" TEXT NOT NULL,
    "encryptedPath" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "ipfsCid" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "documentType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "txHash" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documents_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "issuers" ("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "did_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT NOT NULL,
    "didUri" TEXT NOT NULL,
    "documentHash" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "didDocument" TEXT NOT NULL,
    "txHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventHash" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "txHash" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "nonces" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nonce" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "issuers_walletAddress_key" ON "issuers"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_credentialHash_key" ON "credentials"("credentialHash");

-- CreateIndex
CREATE INDEX "credentials_holderAddress_idx" ON "credentials"("holderAddress");

-- CreateIndex
CREATE INDEX "credentials_issuerAddress_idx" ON "credentials"("issuerAddress");

-- CreateIndex
CREATE INDEX "credentials_credentialType_idx" ON "credentials"("credentialType");

-- CreateIndex
CREATE UNIQUE INDEX "documents_sha256Hash_key" ON "documents"("sha256Hash");

-- CreateIndex
CREATE INDEX "documents_uploadedBy_idx" ON "documents"("uploadedBy");

-- CreateIndex
CREATE UNIQUE INDEX "did_documents_walletAddress_key" ON "did_documents"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "did_documents_didUri_key" ON "did_documents"("didUri");

-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_eventHash_key" ON "audit_logs"("eventHash");

-- CreateIndex
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs"("actor");

-- CreateIndex
CREATE INDEX "audit_logs_actionType_idx" ON "audit_logs"("actionType");

-- CreateIndex
CREATE UNIQUE INDEX "nonces_nonce_key" ON "nonces"("nonce");

-- CreateIndex
CREATE INDEX "nonces_wallet_idx" ON "nonces"("wallet");
