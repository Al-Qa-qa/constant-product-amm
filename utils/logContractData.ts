import { network, ethers } from "hardhat";
import { CPAMM, Token0, Token1 } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

async function logContractData(
  caller: SignerWithAddress,
  cpamm: CPAMM,
  token0: Token0,
  token1: Token1
) {
  const cpammToken0Balance: BigNumber = await token0.balanceOf(cpamm.address);
  const cpammToken1Balance: BigNumber = await token1.balanceOf(cpamm.address);

  const callerToken0Balance: BigNumber = await token0.balanceOf(caller.address);
  const callerToken1Balance: BigNumber = await token1.balanceOf(caller.address);

  // const shares: BigNumber = await cpamm.balanceOf(caller.address);
  const reserve0: BigNumber = await cpamm.getReserve0();
  const reserve1: BigNumber = await cpamm.getReserve1();
  const totalSupply: BigNumber = await cpamm.getTotalSupply();

  console.log("------------------------------");
  console.log(
    "CPAMM token0 balance:",
    ethers.utils.formatUnits(cpammToken0Balance)
  );
  console.log(
    "CPAMM token1 balance:",
    ethers.utils.formatUnits(cpammToken1Balance)
  );
  console.log(
    "Caller token0 balance:",
    ethers.utils.formatUnits(callerToken0Balance)
  );
  console.log(
    "Caller token1 balance:",
    ethers.utils.formatUnits(callerToken1Balance)
  );
  // console.log("Caller Shares:", ethers.utils.formatUnits(shares));
  console.log("reserve0:", ethers.utils.formatUnits(reserve0));
  console.log("reserve1:", ethers.utils.formatUnits(reserve1));
  console.log("totalSupply", ethers.utils.formatUnits(totalSupply));
  console.log("------------------------------");
}

export default logContractData;
