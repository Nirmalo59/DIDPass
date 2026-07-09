import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Deploying DocumentRegistry...");

  const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
  const documentRegistry = await DocumentRegistry.deploy();

  await documentRegistry.waitForDeployment();
  
  const address = await documentRegistry.getAddress();
  console.log(`DocumentRegistry deployed to: ${address}`);

  // Save the contract address to a file so the backend can easily read it
  const addressFilePath = path.join(__dirname, "../../backend/src/contractAddress.json");
  fs.writeFileSync(addressFilePath, JSON.stringify({ DocumentRegistry: address }, null, 2));
  console.log(`Contract address saved to ${addressFilePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
