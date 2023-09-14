import { ethers, network } from "hardhat";
import jsonContracts from "../deployed-contracts.json";
import { CPAMM, Token0, Token1 } from "../typechain-types";
import {
  MINTED_AMOUNT_PAIR_1,
  MINTED_AMOUNT_PAIR_2,
  SWAPPED_AMOUNT,
} from "../helper-hardhat-config";
import logContractData from "../utils/logContractData";
import { BigNumber } from "ethers";
import { sqrt } from "../utils/complexMath";
// ---

async function removeLiquidity() {
  const [liquidityProvider] = await ethers.getSigners();
  const networkName: string = network.name;
  const contracts = Object(jsonContracts);
  if (!contracts[networkName].CPAMM) {
    throw new Error("Contract is not deployed yet");
  }
  if (networkName === "hardhat") {
    throw new Error("Can't run scripts to hardhat network deployed contract");
  }
  const cpamm: CPAMM = await ethers.getContractAt(
    "CPAMM",
    contracts[networkName].CPAMM,
    liquidityProvider
  );

  const token0: Token0 = await ethers.getContractAt(
    "Token0",
    contracts[networkName].Token0,
    liquidityProvider
  );
  const token1: Token1 = await ethers.getContractAt(
    "Token1",
    contracts[networkName].Token1,
    liquidityProvider
  );

  try {
    // Remove liquidity

    await logContractData(liquidityProvider, cpamm, token0, token1);

    const shares: BigNumber = sqrt(
      MINTED_AMOUNT_PAIR_1.mul(MINTED_AMOUNT_PAIR_2)
    );

    await cpamm.connect(liquidityProvider).removeLiquidity(shares);

    await logContractData(liquidityProvider, cpamm, token0, token1);
  } catch (err) {
    console.log(err);
    console.log("----------------------");
    throw new Error(`Failed to remove liquidity`);
  }

  return cpamm;
}

removeLiquidity()
  .then((cpamm) => {
    console.log(`Liquidity Removed Successfully`);
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
