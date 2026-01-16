const hre = require("hardhat");

async function main() {
  console.log("Deploying Cid contract...");

  // 1. Get the Contract Factory
  // This looks for "contract Cid" inside your Solidity files
  const Cid = await hre.ethers.getContractFactory("Cid");

  // 2. Deploy the Contract
  const cidContract = await Cid.deploy();

  // 3. Wait for the transaction to be mined
  await cidContract.waitForDeployment();

  // 4. Print the address
  console.log("Cid contract deployed to:", await cidContract.getAddress());
}

// Handle errors
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});