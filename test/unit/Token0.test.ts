import { expect, assert } from "chai";
import { ethers, network } from "hardhat";
import { Token0, Token0__factory } from "../../typechain-types";

// Function
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

// Data
import {
  ADDRESS_ZERO,
  MINTED_AMOUNT_PAIR_1,
  developmentChains,
} from "../../helper-hardhat-config";

// Types
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction, ContractReceipt } from "ethers/src.ts/ethers";
import { BigNumber } from "ethers";

// ------------

describe("Token0", function () {
  beforeEach(async () => {
    if (!developmentChains.includes(network.name)) {
      throw new Error(
        "You need to be on a development chain to run unit tests"
      );
    }
  });

  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  type DeployFixture = {
    deployer: SignerWithAddress;
    token0: Token0;
  };
  async function deployTokenFixture(): Promise<DeployFixture> {
    const [deployer]: SignerWithAddress[] = await ethers.getSigners();

    const token0Factory: Token0__factory = await ethers.getContractFactory(
      "Token0",
      deployer
    );
    const token0: Token0 = await token0Factory.deploy();
    await token0.deployed();

    return { deployer, token0 };
  }

  describe("#mint", function () {
    it("should increase the balance of the user when minting", async function () {
      const { deployer, token0 } = await loadFixture(deployTokenFixture);

      await token0.mint(MINTED_AMOUNT_PAIR_1);

      const minterHoldings: BigNumber = await token0.balanceOf(
        deployer.address
      );

      assert.equal(minterHoldings.toString(), MINTED_AMOUNT_PAIR_1.toString());
    });
  });
});
