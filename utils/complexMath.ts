import { BigNumber } from "ethers";

export function sqrt(y: BigNumber): BigNumber {
  let z: BigNumber = BigNumber.from(0);
  if (y.gt(3)) {
    z = y;
    let x: BigNumber = y.div(2).add(1);
    while (x.lt(z)) {
      z = x;
      x = y.div(x).add(x).div(2);
    }
  } else if (!y.eq(0)) {
    z.eq(1);
  }

  return z;
}

export function min(x: BigNumber, y: BigNumber): BigNumber {
  return x.lte(y) ? x : y;
}
