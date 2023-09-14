import { expect, assert } from "chai";
import { ethers, network } from "hardhat";
import { Token1, Token1__factory } from "../../typechain-types";

// Function
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

// Data
import {
  ADDRESS_ZERO,
  developmentChains,
  MINTED_AMOUNT_PAIR_2,
} from "../../helper-hardhat-config";

// Types
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction, ContractReceipt } from "ethers/src.ts/ethers";
import { BigNumber } from "ethers";

// ------------

describe("Token1", function () {
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
    token1: Token1;
  };
  async function deployTokenFixture(): Promise<DeployFixture> {
    const [deployer]: SignerWithAddress[] = await ethers.getSigners();

    const token1Factory: Token1__factory = await ethers.getContractFactory(
      "Token1",
      deployer
    );
    const token1: Token1 = await token1Factory.deploy();
    await token1.deployed();

    return { deployer, token1 };
  }

  describe("#mint", function () {
    it("should increase the balance of the user when minting", async function () {
      const { deployer, token1 } = await loadFixture(deployTokenFixture);

      await token1.mint(MINTED_AMOUNT_PAIR_2);

      const minterHoldings: BigNumber = await token1.balanceOf(
        deployer.address
      );

      assert.equal(minterHoldings.toString(), MINTED_AMOUNT_PAIR_2.toString());
    });
  });
});
