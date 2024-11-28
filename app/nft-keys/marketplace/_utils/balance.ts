import { ethers } from "ethers";
import { Chain } from "@/app/constants/chains";
import { Bitcoin } from "multichain-tools";

export function formatBalance(amount: string | number, chain: Chain): string {
  if (!amount) return "0";

  try {
    switch (chain) {
      case Chain.ETH:
      case Chain.BNB:
        return ethers.formatEther(amount.toString());
      case Chain.BTC:
        return Bitcoin.toBTC(Number(amount)).toString();
      case Chain.OSMOSIS:
        const osmoAmount = Number(amount) / 1000000;
        return osmoAmount.toFixed(6);
      default:
        return amount.toString();
    }
  } catch (error) {
    console.error("Error formatting balance:", error);
    return "0";
  }
}

export function parseToMinimalUnits(amount: string, chain: Chain): string {
  if (!amount) return "0";

  try {
    switch (chain) {
      case Chain.ETH:
      case Chain.BNB:
        return ethers.parseEther(amount).toString();
      case Chain.BTC:
        return Bitcoin.toSatoshi(Number(amount)).toString();
      case Chain.OSMOSIS:
        return (Number(amount) * 1000000).toString();
      default:
        return amount;
    }
  } catch (error) {
    console.error("Error parsing to minimal units:", error);
    return "0";
  }
}
