// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
import { network, run } from "hardhat";

import deployToken0 from "./deployToken0";
import deployToken1 from "./deployToken1";
import deployCPAMM from "./deployCPAMM";
import { log } from "../../helper-functions";
import { Token0, Token1 } from "../../typechain-types";

// ---------

async function main() {
  await run("compile");
  const chainId = network.config.chainId!;

  log(
    `Deploying into network ${network.name} with chainId: ${chainId}`,
    "title"
  );
  const token0: Token0 = await deployToken0(chainId);
  log(`Deployed Token0 contract successfully`);
  log("", "separator");
  const token1: Token1 = await deployToken1(chainId);
  log(`Deployed Token1 contract successfully`);
  log("", "separator");

  await deployCPAMM(chainId, token0.address, token1.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
