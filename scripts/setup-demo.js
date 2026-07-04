const hre = require("hardhat");
const fs  = require("fs");
const path = require("path");
const { PrismaClient } = require("../backend/node_modules/@prisma/client");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../backend/.env") });

// Determine absolute SQLite path
const dbPath = path.resolve(__dirname, "../backend/prisma/didpass.db");
const absoluteDbUrl = `file:${dbPath}`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: absoluteDbUrl
    }
  }
});

async function main() {
  console.log("\n🧪 DIDPass — Setting up Demo Environment & Seeding Data...\n");
  console.log("═".repeat(65));

  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0]; // Admin
  const tuIssuer = accounts[1]; // Tribhuvan University
  const nirmal   = accounts[3]; // Nirmal Shrestha

  // Load contract JSONs to get addresses
  const loadContract = (name) => {
    const filePath = path.join(__dirname, "../backend/src/contracts", `${name}.json`);
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  };

  const didRegDetails = loadContract("DIDRegistry");
  const credRegDetails = loadContract("CredentialRegistry");
  const docRegDetails = loadContract("DocumentProofRegistry");

  const didRegistry = new hre.ethers.Contract(didRegDetails.address, didRegDetails.abi, nirmal);
  const credRegistry = new hre.ethers.Contract(credRegDetails.address, credRegDetails.abi, tuIssuer);
  const docRegistry = new hre.ethers.Contract(docRegDetails.address, docRegDetails.abi, tuIssuer);

  // ─── 0. Seed Issuers into SQLite (required before Documents/Credentials) ──
  console.log("🏛️  Seeding Issuer records into SQLite...");
  await prisma.issuer.upsert({
    where: { walletAddress: tuIssuer.address.toLowerCase() },
    update: { name: "Tribhuvan University", type: "university", logoEmoji: "🏛️", email: "admin@tu.edu.np", website: "https://tu.edu.np", isApproved: true },
    create: { walletAddress: tuIssuer.address.toLowerCase(), name: "Tribhuvan University", type: "university", logoEmoji: "🏛️", email: "admin@tu.edu.np", website: "https://tu.edu.np", isApproved: true },
  });
  await prisma.issuer.upsert({
    where: { walletAddress: accounts[2].address.toLowerCase() },
    update: { name: "Nabil Bank", type: "bank", logoEmoji: "🏦", email: "kyc@nabilbank.com", website: "https://nabilbank.com", isApproved: true },
    create: { walletAddress: accounts[2].address.toLowerCase(), name: "Nabil Bank", type: "bank", logoEmoji: "🏦", email: "kyc@nabilbank.com", website: "https://nabilbank.com", isApproved: true },
  });
  console.log("   ✅ Issuer records seeded into SQLite");

  // ─── 1. Register Nirmal's DID Document on-chain ──────────────────────────
  const didUri = `did:didpass:${nirmal.address.toLowerCase()}`;
  const didDocObj = {
    "@context": ["https://www.w3.org/ns/did/v1"],
    id: didUri,
    verificationMethod: [
      {
        id: `${didUri}#key-1`,
        type: "EcdsaSecp256k1RecoveryMethod2020",
        controller: didUri,
        blockchainAccountId: `eip155:31337:${nirmal.address}`,
      },
    ],
    authentication: [`${didUri}#key-1`],
  };

  const docString = JSON.stringify(didDocObj);
  const didHash = hre.ethers.solidityPackedKeccak256(["string"], [docString]);

  console.log(`📝 Registering Nirmal's DID on-chain (${didUri})...`);
  const txDid = await didRegistry.registerDID(didHash, didUri);
  await txDid.wait();
  console.log("   ✅ DID registered on-chain");

  // Save to SQLite
  await prisma.dIDDocument.upsert({
    where: { walletAddress: nirmal.address.toLowerCase() },
    update: {
      didUri,
      documentHash: didHash,
      publicKey: nirmal.address.toLowerCase(),
      didDocument: docString,
      txHash: txDid.hash,
    },
    create: {
      walletAddress: nirmal.address.toLowerCase(),
      didUri,
      documentHash: didHash,
      publicKey: nirmal.address.toLowerCase(),
      didDocument: docString,
      txHash: txDid.hash,
    },
  });
  console.log("   ✅ DID document saved off-chain in SQLite");

  // ─── 2. Anchor a mock Transcript PDF (Document Proof) ─────────────────────
  const mockTranscriptName = "Nirmal_Shrestha_Transcript_TU.pdf";
  const mockPdfContent = Buffer.from("Tribhuvan University Official Transcript - Nirmal Shrestha - GPA: 3.87");
  
  // Calculate SHA-256
  const crypto = require("crypto");
  const docHash = crypto.createHash("sha256").update(mockPdfContent).digest("hex");
  const docHashBytes32 = "0x" + docHash;
  const mockIpfsCid = "Qm" + crypto.createHash("sha256").update(docHash).digest("hex").slice(0, 44);

  // AES-256-GCM encryption simulation
  const encKey = Buffer.from(process.env.ENCRYPTION_KEY || "4a8f3c1d9b2e7f5a4a8f3c1d9b2e7f5a4a8f3c1d9b2e7f5a4a8f3c1d9b2e7f5a", "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey, iv);
  const encryptedPdf = Buffer.concat([cipher.update(mockPdfContent), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Save encrypted file
  const encryptedPath = path.join(__dirname, "../backend/uploads/encrypted", `${crypto.randomUUID()}.enc`);
  fs.writeFileSync(encryptedPath, encryptedPdf);

  console.log(`🔒 Anchoring mock transcript hash (${docHash}) on-chain...`);
  const txDoc = await docRegistry.registerDocumentProof(
    docHashBytes32,
    "transcript",
    mockTranscriptName,
    mockIpfsCid
  );
  await txDoc.wait();
  console.log("   ✅ Document Proof anchored on-chain");

  // Save to SQLite
  await prisma.document.create({
    data: {
      originalName: mockTranscriptName,
      storedName: path.basename(encryptedPath),
      mimeType: "application/pdf",
      sha256Hash: docHash,
      encryptedPath,
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
      ipfsCid: mockIpfsCid,
      fileSize: mockPdfContent.length,
      documentType: "transcript",
      uploadedBy: tuIssuer.address.toLowerCase(),
      txHash: txDoc.hash,
    },
  });
  console.log("   ✅ Encrypted file & metadata registered off-chain");

  // ─── 3. Issue Student ID Credential ───────────────────────────────────────
  const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year expiry
  const credentialHash = hre.ethers.solidityPackedKeccak256(
    ["address", "address", "string", "uint256"],
    [nirmal.address, tuIssuer.address, "student_id", Date.now()]
  );

  console.log(`🛡️  Issuing Student ID credential on-chain...`);
  const txCred = await credRegistry.issueCredential(
    nirmal.address,
    credentialHash,
    "student_id",
    "Nirmal Shrestha",
    expiry
  );
  await txCred.wait();
  console.log("   ✅ Credential issued on-chain");

  // Save to SQLite
  await prisma.credential.create({
    data: {
      credentialHash,
      holderAddress: nirmal.address.toLowerCase(),
      holderName: "Nirmal Shrestha",
      holderEmail: "nirmal.shrestha@gmail.com",
      issuerAddress: tuIssuer.address.toLowerCase(),
      credentialType: "student_id",
      documentHash: docHash,
      encryptedFilePath: encryptedPath,
      ipfsCid: mockIpfsCid,
      status: "PENDING", // Wait for student to claim
      txHash: txCred.hash,
      expiresAt: new Date(expiry * 1000),
      metadata: JSON.stringify({
        studentId: "TU-2024-CS-001",
        course: "B.Sc. Computer Science",
        semester: "8th Semester",
      }),
    },
  });
  console.log("   ✅ Credential metadata registered off-chain in SQLite");

  console.log("\n" + "═".repeat(65));
  console.log("🎉  DEMO SETUP SEEDING COMPLETED SUCCESSFULLY!");
  console.log("═".repeat(65));
  console.log(`\n👉 Student (Nirmal Shrestha) can now connect wallet and claim credential.`);
  console.log(`👉 Pending Claim Credential Hash: ${credentialHash}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n❌ Seeding demo data failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
