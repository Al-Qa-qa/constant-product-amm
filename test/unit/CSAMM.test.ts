import { expect, assert } from "chai";
import { ethers, network } from "hardhat";
import {
  CPAMM,
  CPAMM__factory,
  Token0,
  Token0__factory,
  Token1,
  Token1__factory,
} from "../../typechain-types";

// Function
import { sqrt, min } from "../../utils/complexMath";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

// Data
import {
  ADDRESS_ZERO,
  MINTED_AMOUNT_PAIR_1,
  MINTED_AMOUNT_PAIR_2,
  SWAPPED_AMOUNT,
  developmentChains,
} from "../../helper-hardhat-config";

// Types
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction, ContractReceipt } from "ethers/src.ts/ethers";
import { BigNumber } from "ethers";

// ------------

describe("CPAMM", function () {
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
    cpamm: CPAMM;
    token0: Token0;
    token1: Token1;
  };
  async function deployCPAMMFixture(): Promise<DeployFixture> {
    const [deployer]: SignerWithAddress[] = await ethers.getSigners();

    const token0Factory: Token0__factory = await ethers.getContractFactory(
      "Token0",
      deployer
    );

    const token0: Token0 = await token0Factory.deploy();
    await token0.deployed();

    const token1Factory: Token1__factory = await ethers.getContractFactory(
      "Token0",
      deployer
    );
    const token1: Token1 = await token1Factory.deploy();
    await token1.deployed();

    const cpammFactory: CPAMM__factory = await ethers.getContractFactory(
      "CPAMM",
      deployer
    );
    const cpamm: CPAMM = await cpammFactory.deploy(
      token0.address,
      token1.address
    );
    await cpamm.deployed();
    return { deployer, cpamm, token0, token1 };
  }

  // async function increaseTime(amount: number) {
  //   await ethers.provider.send("evm_increaseTime", [amount]);
  //   await ethers.provider.send("evm_mine", []);
  // }

  async function mintToken(
    token: Token0 | Token1,
    minter: SignerWithAddress,
    isToken0: boolean
  ) {
    const mintedAmount: BigNumber = isToken0
      ? MINTED_AMOUNT_PAIR_1
      : MINTED_AMOUNT_PAIR_2;
    await token.connect(minter).mint(mintedAmount);
    return token;
  }

  async function approveToken(
    cpamm: CPAMM,
    token: Token0 | Token1,
    signer: SignerWithAddress
  ) {
    const userBalance: BigNumber = await token.balanceOf(signer.address);
    await token.connect(signer).approve(cpamm.address, userBalance);
  }

  async function addLiquidity(
    liquidityProvider: SignerWithAddress,
    token0: Token0,
    token1: Token1,
    cpamm: CPAMM
  ) {
    await token0.connect(liquidityProvider).mint(MINTED_AMOUNT_PAIR_1);
    await token0
      .connect(liquidityProvider)
      .approve(cpamm.address, MINTED_AMOUNT_PAIR_1);
    await token1.connect(liquidityProvider).mint(MINTED_AMOUNT_PAIR_2);
    await token1
      .connect(liquidityProvider)
      .approve(cpamm.address, MINTED_AMOUNT_PAIR_2);

    await cpamm
      .connect(liquidityProvider)
      .addLiquidity(MINTED_AMOUNT_PAIR_1, MINTED_AMOUNT_PAIR_2);
  }

  async function logPoolInfo(cpamm: CPAMM) {
    const reserve0: BigNumber = await cpamm.getReserve0();
    const reserve1: BigNumber = await cpamm.getReserve1();
    const totalSupply: BigNumber = await cpamm.getTotalSupply();

    console.log(`Reserve0: ${ethers.utils.formatUnits(reserve0)} CS0`);
    console.log(`Reserve1: ${ethers.utils.formatUnits(reserve1)} CS1`);
    console.log(`TotalSupply: ${ethers.utils.formatUnits(totalSupply)}`);
  }

  function getAmountOut(
    amountIn: BigNumber,
    resIn: BigNumber,
    resOut: BigNumber
  ) {
    const amountInWithFee: BigNumber = amountIn.mul(995).div(1000);
    return amountInWithFee.mul(resOut).div(resIn.add(amountInWithFee));
  }

  describe("Constructor", function () {
    it("should initialize the first token address successfully", async function () {
      const { cpamm, token0 } = await loadFixture(deployCPAMMFixture);

      const token0Address = await cpamm.getToken0Address();

      assert.equal(token0Address, token0.address);
    });

    it("should initialize the second token address successfully", async function () {
      const { cpamm, token1 } = await loadFixture(deployCPAMMFixture);

      const token1Address = await cpamm.getToken1Address();

      assert.equal(token1Address, token1.address);
    });
  });

  describe("#addLiquidity", function () {
    it("should emit `LiquidityAdded` event on successful adding liquidity", async function () {
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await mintToken(token0, deployer, true);
      await mintToken(token1, deployer, false);

      await approveToken(cpamm, token0, deployer);
      await approveToken(cpamm, token1, deployer);

      await expect(
        cpamm.addLiquidity(MINTED_AMOUNT_PAIR_1, MINTED_AMOUNT_PAIR_2)
      )
        .to.emit(cpamm, "LiquidityAdded")
        .withArgs(deployer.address, MINTED_AMOUNT_PAIR_1, MINTED_AMOUNT_PAIR_2);
    });

    it("should transfer tokens from the `provider` to out `contract`", async function () {
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await mintToken(token0, deployer, true);
      await mintToken(token1, deployer, false);

      await approveToken(cpamm, token0, deployer);
      await approveToken(cpamm, token1, deployer);

      await cpamm.addLiquidity(MINTED_AMOUNT_PAIR_1, MINTED_AMOUNT_PAIR_2);

      const cpammToken0Balance: BigNumber = await token0.balanceOf(
        cpamm.address
      );
      const cpammToken1Balance: BigNumber = await token1.balanceOf(
        cpamm.address
      );

      assert.equal(
        cpammToken0Balance.toString(),
        MINTED_AMOUNT_PAIR_1.toString()
      );
      assert.equal(
        cpammToken1Balance.toString(),
        MINTED_AMOUNT_PAIR_2.toString()
      );
    });

    it("mint new tokens to the `provider` into our contract", async function () {
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await mintToken(token0, deployer, true);
      await mintToken(token1, deployer, false);

      await approveToken(cpamm, token0, deployer);
      await approveToken(cpamm, token1, deployer);

      await cpamm.addLiquidity(MINTED_AMOUNT_PAIR_1, MINTED_AMOUNT_PAIR_2);

      const providerBalance: BigNumber = await cpamm.balanceOf(
        deployer.address
      );
      const sqrtTokensProduct = sqrt(
        MINTED_AMOUNT_PAIR_1.mul(MINTED_AMOUNT_PAIR_2)
      );

      assert.equal(providerBalance.toString(), sqrtTokensProduct.toString());
    });

    it("update `reserve0` and `reserve1` values", async function () {
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await mintToken(token0, deployer, true);
      await mintToken(token1, deployer, false);

      await approveToken(cpamm, token0, deployer);
      await approveToken(cpamm, token1, deployer);

      await cpamm.addLiquidity(MINTED_AMOUNT_PAIR_1, MINTED_AMOUNT_PAIR_2);

      const reserve0: BigNumber = await cpamm.getReserve0();
      const reserve1: BigNumber = await cpamm.getReserve1();

      assert.equal(reserve0.toString(), MINTED_AMOUNT_PAIR_1.toString());
      assert.equal(reserve1.toString(), MINTED_AMOUNT_PAIR_2.toString());
    });

    it("should increases the `totalSupply` of the contract", async function () {
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await mintToken(token0, deployer, true);
      await mintToken(token1, deployer, false);

      await approveToken(cpamm, token0, deployer);
      await approveToken(cpamm, token1, deployer);

      await cpamm.addLiquidity(MINTED_AMOUNT_PAIR_1, MINTED_AMOUNT_PAIR_2);

      const totalSupply: BigNumber = await cpamm.getTotalSupply();

      const sqrtTokensProduct = sqrt(
        MINTED_AMOUNT_PAIR_1.mul(MINTED_AMOUNT_PAIR_2)
      );

      assert.equal(totalSupply.toString(), sqrtTokensProduct.toString());
    });

    it("should make `shares` differes from the the amount added if there is a `pool` already and some swaps occuars", async function () {
      const [, swapper, provider2]: SignerWithAddress[] =
        await ethers.getSigners();
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await addLiquidity(deployer, token0, token1, cpamm);

      await mintToken(token0, swapper, true);
      await approveToken(cpamm, token0, swapper);

      await cpamm.connect(swapper).swap(token0.address, SWAPPED_AMOUNT);

      const reserve0: BigNumber = await cpamm.getReserve0();
      const reserve1: BigNumber = await cpamm.getReserve1();
      const totalSupply: BigNumber = await cpamm.getTotalSupply();

      /*
        We can't add liquidity with the same constant variable we used as the price changed after swap occuars.
        The ration of the liquidity should equal the ration of the reserved tokens.

        dx / dy = x / y
      */

      const amount0: BigNumber = MINTED_AMOUNT_PAIR_1;
      const amount1: BigNumber = amount0.mul(reserve1).div(reserve0);

      await mintToken(token0, provider2, true);
      await mintToken(token1, provider2, false);

      await approveToken(cpamm, token0, provider2);
      await approveToken(cpamm, token1, provider2);

      await cpamm.connect(provider2).addLiquidity(amount0, amount1);

      const provider2Shares: BigNumber = await cpamm.balanceOf(
        provider2.address
      );

      const calculatedShares = min(
        amount0.mul(totalSupply).div(reserve0),
        amount1.mul(totalSupply).div(reserve1)
      );

      assert.equal(provider2Shares.toString(), calculatedShares.toString());
    });

    it("reverts it the amount of shares is equal to `zero`", async function () {
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await mintToken(token0, deployer, true);
      await mintToken(token1, deployer, false);

      await approveToken(cpamm, token0, deployer);
      await approveToken(cpamm, token1, deployer);

      await expect(cpamm.addLiquidity(0, 0))
        .to.be.revertedWithCustomError(cpamm, "CPAMM__SharesEqualZero")
        .withArgs(0);
    });

    it("reverts if the tokens will lead to change in price`", async function () {
      const [, swapper, provider2]: SignerWithAddress[] =
        await ethers.getSigners();
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await addLiquidity(deployer, token0, token1, cpamm);

      await mintToken(token0, swapper, true);
      await approveToken(cpamm, token0, swapper);

      await cpamm.connect(swapper).swap(token0.address, SWAPPED_AMOUNT);

      const reserve0: BigNumber = await cpamm.getReserve0();
      const reserve1: BigNumber = await cpamm.getReserve1();
      const totalSupply: BigNumber = await cpamm.getTotalSupply();

      /*
        We can't add liquidity with the same constant variable we used as the price changed after swap occuars.
        The ration of the liquidity should equal the ration of the reserved tokens.

        dx / dy = x / y
      */

      const amount0ChangePrice: BigNumber = MINTED_AMOUNT_PAIR_1;
      const amount1ChangePrice: BigNumber = MINTED_AMOUNT_PAIR_2;

      await mintToken(token0, provider2, true);
      await mintToken(token1, provider2, false);

      await approveToken(cpamm, token0, provider2);
      await approveToken(cpamm, token1, provider2);

      await expect(
        cpamm
          .connect(provider2)
          .addLiquidity(amount0ChangePrice, amount1ChangePrice)
      )
        .to.be.revertedWithCustomError(cpamm, "CPAMM__PriceWillChange")
        .withArgs(amount0ChangePrice, amount1ChangePrice);
    });
  });

  describe("#swap", function () {
    it("should emit `Swapped` event on successful swapping", async function () {
      const [, swapper]: SignerWithAddress[] = await ethers.getSigners();
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await addLiquidity(deployer, token0, token1, cpamm);

      await mintToken(token0, swapper, true);
      await approveToken(cpamm, token0, swapper);

      await expect(cpamm.connect(swapper).swap(token0.address, SWAPPED_AMOUNT))
        .to.emit(cpamm, "Swapped")
        .withArgs(
          swapper.address,
          token0.address,
          SWAPPED_AMOUNT,
          token1.address,
          getAmountOut(
            SWAPPED_AMOUNT,
            MINTED_AMOUNT_PAIR_1,
            MINTED_AMOUNT_PAIR_2
          )
        );
    });

    it("should increase pool `tokenIn` balance and decrease amount of `tokenOut`", async function () {
      const [, swapper]: SignerWithAddress[] = await ethers.getSigners();
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await addLiquidity(deployer, token0, token1, cpamm);

      await mintToken(token0, swapper, true);
      await approveToken(cpamm, token0, swapper);

      await cpamm.connect(swapper).swap(token0.address, SWAPPED_AMOUNT);

      const poolToken0Balance: BigNumber = await token0.balanceOf(
        cpamm.address
      );
      const poolToken1Balance: BigNumber = await token1.balanceOf(
        cpamm.address
      );

      const amountOut: BigNumber = getAmountOut(
        SWAPPED_AMOUNT,
        MINTED_AMOUNT_PAIR_1,
        MINTED_AMOUNT_PAIR_2
      );

      assert.equal(
        poolToken0Balance.toString(),
        MINTED_AMOUNT_PAIR_1.add(SWAPPED_AMOUNT).toString()
      );
      assert.equal(
        poolToken1Balance.toString(),
        MINTED_AMOUNT_PAIR_2.sub(amountOut).toString()
      );
    });

    it("should increase `reserve0` and `reserve1` correctly", async function () {
      const [, swapper]: SignerWithAddress[] = await ethers.getSigners();
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await addLiquidity(deployer, token0, token1, cpamm);

      await mintToken(token0, swapper, true);
      await approveToken(cpamm, token0, swapper);

      await cpamm.connect(swapper).swap(token0.address, SWAPPED_AMOUNT);

      const poolRes0Balance: BigNumber = await cpamm.getReserve0();
      const poolRes1Balance: BigNumber = await cpamm.getReserve1();

      const cpammToken0Balance: BigNumber = await token0.balanceOf(
        cpamm.address
      );
      const cpammToken1Balance: BigNumber = await token1.balanceOf(
        cpamm.address
      );

      assert.equal(poolRes0Balance.toString(), cpammToken0Balance.toString());
      assert.equal(poolRes1Balance.toString(), cpammToken1Balance.toString());
    });

    it("should transfer tokens to the `swapper` - platform fees", async function () {
      const [, swapper]: SignerWithAddress[] = await ethers.getSigners();
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await addLiquidity(deployer, token0, token1, cpamm);

      await mintToken(token0, swapper, true);
      await approveToken(cpamm, token0, swapper);

      await cpamm.connect(swapper).swap(token0.address, SWAPPED_AMOUNT);

      const swapperToken0Balance: BigNumber = await token0.balanceOf(
        swapper.address
      );
      const swapperToken1Balance: BigNumber = await token1.balanceOf(
        swapper.address
      );

      const amountOut: BigNumber = getAmountOut(
        SWAPPED_AMOUNT,
        MINTED_AMOUNT_PAIR_1,
        MINTED_AMOUNT_PAIR_2
      );

      assert.equal(
        swapperToken0Balance.toString(),
        MINTED_AMOUNT_PAIR_1.sub(SWAPPED_AMOUNT).toString()
      );
      assert.equal(swapperToken1Balance.toString(), amountOut.toString());
    });

    it("should made the same functionality if the swapped token is the other pair", async function () {
      const [, swapper]: SignerWithAddress[] = await ethers.getSigners();
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await addLiquidity(deployer, token0, token1, cpamm);

      await mintToken(token1, swapper, false);
      await approveToken(cpamm, token1, swapper);

      await expect(cpamm.connect(swapper).swap(token1.address, SWAPPED_AMOUNT))
        .to.emit(cpamm, "Swapped")
        .withArgs(
          swapper.address,
          token1.address,
          SWAPPED_AMOUNT,
          token0.address,
          getAmountOut(
            SWAPPED_AMOUNT,
            MINTED_AMOUNT_PAIR_2,
            MINTED_AMOUNT_PAIR_1
          )
        );
    });

    it("should change the exchange of the pair if the reserve ration is not 1: 1", async function () {
      const [, swapper, swapper2]: SignerWithAddress[] =
        await ethers.getSigners();
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await addLiquidity(deployer, token0, token1, cpamm);

      await mintToken(token0, swapper, true);
      await approveToken(cpamm, token0, swapper);

      await cpamm.connect(swapper).swap(token0.address, SWAPPED_AMOUNT);

      const reserve0BeforeSwap2: BigNumber = await cpamm.getReserve0();
      const reserve1BeforeSwap2: BigNumber = await cpamm.getReserve1();

      // Ratio changed and not becomes 1 : 1 it became 11 : 9

      await mintToken(token0, swapper2, true);
      await approveToken(cpamm, token0, swapper2);

      await cpamm.connect(swapper2).swap(token0.address, SWAPPED_AMOUNT);

      const swapper2Token1Balance: BigNumber = await token1.balanceOf(
        swapper2.address
      );

      // - getting the amountOut received by the second swapper
      const swapper2AmountOut: BigNumber = getAmountOut(
        SWAPPED_AMOUNT,
        reserve0BeforeSwap2,
        reserve1BeforeSwap2
      );

      assert.equal(
        swapper2Token1Balance.toString(),
        swapper2AmountOut.toString()
      );
    });

    it("reverts if the swappedToken address is not valid", async function () {
      const [, swapper]: SignerWithAddress[] = await ethers.getSigners();
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await addLiquidity(deployer, token0, token1, cpamm);

      await mintToken(token0, swapper, true);
      await approveToken(cpamm, token0, swapper);

      const invalidTokenAddress: string = ADDRESS_ZERO;

      await expect(
        cpamm.connect(swapper).swap(invalidTokenAddress, SWAPPED_AMOUNT)
      )
        .to.be.revertedWithCustomError(cpamm, "CPAMM__InvalidToken")
        .withArgs(invalidTokenAddress);
    });

    it("reverts if the swappedToken amount equals zero", async function () {
      const [, swapper]: SignerWithAddress[] = await ethers.getSigners();
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await addLiquidity(deployer, token0, token1, cpamm);

      await mintToken(token0, swapper, true);
      await approveToken(cpamm, token0, swapper);

      await expect(
        cpamm.connect(swapper).swap(token0.address, 0)
      ).to.be.revertedWithCustomError(cpamm, "CPAMM__InputAmountEqualZero");
    });
  });

  describe("#removeLiquidity", function () {
    it("should emit `LiquidityRemoved` event on successful removing liquidity", async function () {
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await addLiquidity(deployer, token0, token1, cpamm);

      // we will all tokens from the pool
      const removedShares: BigNumber = await cpamm.balanceOf(deployer.address);

      await expect(cpamm.removeLiquidity(removedShares))
        .to.emit(cpamm, "LiquidityRemoved")
        .withArgs(deployer.address, MINTED_AMOUNT_PAIR_1, MINTED_AMOUNT_PAIR_2);
    });

    it("should remove decrease the `totalSupply` of the contract", async function () {
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await addLiquidity(deployer, token0, token1, cpamm);

      // we will all tokens from the pool
      const removedShares: BigNumber = await cpamm.balanceOf(deployer.address);

      await cpamm.removeLiquidity(removedShares);

      const totalSupply: BigNumber = await cpamm.getTotalSupply();

      assert.equal(totalSupply.toString(), "0");
    });

    it("should remove the balance from the provider", async function () {
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await addLiquidity(deployer, token0, token1, cpamm);

      // we will all tokens from the pool
      const removedShares: BigNumber = await cpamm.balanceOf(deployer.address);

      await cpamm.removeLiquidity(removedShares);

      const providerBalance: BigNumber = await cpamm.balanceOf(
        deployer.address
      );

      assert.equal(providerBalance.toString(), "0");
    });

    it("should decrease `reserve0` and `reserve1`", async function () {
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await addLiquidity(deployer, token0, token1, cpamm);

      // we will all tokens from the pool
      const removedShares: BigNumber = await cpamm.balanceOf(deployer.address);

      await cpamm.removeLiquidity(removedShares);

      const reserve0: BigNumber = await cpamm.getReserve0();
      const reserve1: BigNumber = await cpamm.getReserve1();

      assert.equal(reserve0.toString(), "0");
      assert.equal(reserve1.toString(), "0");
    });

    it("should transfer tokens to the provider address", async function () {
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      await addLiquidity(deployer, token0, token1, cpamm);

      const providerToken0BalanceBeforeRemovingLiquidity: BigNumber =
        await token0.balanceOf(deployer.address);
      const providerToken1BalanceBeforeRemovingLiquidity: BigNumber =
        await token1.balanceOf(deployer.address);

      // we will all tokens from the pool
      const removedShares: BigNumber = await cpamm.balanceOf(deployer.address);

      await cpamm.removeLiquidity(removedShares);

      const providerToken0BalanceAfterRemovingLiquidity: BigNumber =
        await token0.balanceOf(deployer.address);
      const providerToken1BalanceAfterRemovingLiquidity: BigNumber =
        await token1.balanceOf(deployer.address);

      assert.equal(
        providerToken0BalanceAfterRemovingLiquidity.toString(),
        providerToken0BalanceBeforeRemovingLiquidity
          .add(MINTED_AMOUNT_PAIR_1)
          .toString()
      );
      assert.equal(
        providerToken1BalanceAfterRemovingLiquidity.toString(),
        providerToken1BalanceBeforeRemovingLiquidity
          .add(MINTED_AMOUNT_PAIR_2)
          .toString()
      );
    });

    it("reverts if there is no shares to remove", async function () {
      const { deployer, cpamm, token0, token1 } = await loadFixture(
        deployCPAMMFixture
      );

      // we will all tokens from the pool
      const removedShares: BigNumber = await cpamm.balanceOf(deployer.address);

      await expect(cpamm.removeLiquidity(removedShares))
        .to.be.revertedWithCustomError(cpamm, "CPAMM__SharesEqualZero")
        .withArgs(0);
    });
  });
});
