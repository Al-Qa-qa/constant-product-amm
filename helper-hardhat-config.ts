import { ethers, BigNumber } from "ethers";

type NetworkConfigItem = {
  name: string;
};

type NetworkConfigMap = {
  [chainId: string]: NetworkConfigItem;
};

export const networkConfig: NetworkConfigMap = {
  default: {
    name: "hardhat",
  },
  31337: {
    name: "localhost",
  },
  1: {
    name: "mainnet",
  },
  11155111: {
    name: "sepolia",
  },
  137: {
    name: "polygon",
  },
};

export const ADDRESS_ZERO = ethers.constants.AddressZero;

export const MINTED_AMOUNT_PAIR_1: BigNumber = ethers.utils.parseUnits("100");
export const MINTED_AMOUNT_PAIR_2: BigNumber = ethers.utils.parseUnits("50");
export const SWAPPED_AMOUNT: BigNumber = ethers.utils.parseUnits("10");

export const developmentChains: string[] = ["hardhat", "localhost"];
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6;
