// Packages
import * as fs from "fs";
import * as path from "path";
import { ethers, network } from "hardhat";

// Functions
import { log, verify } from "../../helper-functions";

// Data
import { developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } from "../../helper-hardhat-config";

// Types
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Token1, Token1__factory } from "../../typechain-types";
import { BigNumber } from "ethers";

// ----------

/**
 * Type of the deployed contract that will be stored in deployed-contracts.json file
 *
 * example:
 *  {
 *    "hardhat": {
 *      "contractName": "contractAddress"
 *    }
 *  }
 */
type DeployedContracts = {
  [key: string]: {
    [key: string]: string;
  };
};

/**
 * Deploy Token0 Contract
 *
 * @param chainId the Id of the network we will deploy on it
 * @returns the deployed contract
 */
async function deployToken1(chainId: number) {
  const [deployer]: SignerWithAddress[] = await ethers.getSigners();

  if (developmentChains.includes(network.name)) {
    // Deploy MOCKS if existed
    // You will use chainId to get info of the chain from hardhat-helper-config file
  } else {
    // Do additional thing in case its not a testnet
  }

  // Deploying The Contract
  log(`Deploying contract with the account: ${deployer.address}`);
  const token1Factory: Token1__factory = await ethers.getContractFactory("Token0", deployer);
  log("Deploying Contract...");
  const token1: Token1 = await token1Factory.deploy();
  await token1.deployed();

  log(`Token0 deployed to: ${token1.address}`);
  log("", "separator");

  if (!developmentChains.includes(network.name)) {
    // Verify Contract if it isnt in a development chain
    log("Verifying Contract", "title");
    await token1.deployTransaction.wait(VERIFICATION_BLOCK_CONFIRMATIONS);
    await verify(token1.address, []);
    log("verified successfully");
  }

  // Storing contract address to connect to it later
  log("Storing contract address", "title");
  const parentDir: string = path.resolve(__dirname, "../../");
  const deployedContractsPath: string = path.join(parentDir, "deployed-contracts.json");
  const oldContracts: DeployedContracts = JSON.parse(
    fs.readFileSync(deployedContractsPath, "utf8")
  );

  // Add the contract to the network we are deploying on it
  if (!oldContracts[network.name]) {
    oldContracts[network.name] = {};
  } else oldContracts[network.name].Token1 = token1.address;
  // Save data in our deployed-contracts file
  fs.writeFileSync(deployedContractsPath, JSON.stringify(oldContracts, null, 2));
  log("Stored Succesfully");
  log("", "separator");
  return token1;
}

export default deployToken1;
