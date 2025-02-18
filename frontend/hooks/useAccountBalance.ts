"use client";

import { useState, useCallback } from "react";
import { Chain } from "../constants/chains";
import { useChains } from "@/hooks/useChains";

export const useAccountBalance = (chain: Chain, address: string) => {
  const [accountBalance, setAccountBalance] = useState("");

  const { evm, btc, cosmos } = useChains();

  const getAccountBalance = useCallback(async () => {
    if (!address) {
      setAccountBalance("");
      return;
    }
    let formattedBalance = "";
    try {
      switch (chain) {
        case Chain.ETH:
          const { balance: ethBalance, decimals: ethDecimals } =
            await evm.getBalance(address);
          formattedBalance = `${(
            Number(ethBalance) / Math.pow(10, ethDecimals)
          ).toFixed(6)} ETH`;
          break;
        case Chain.BTC:
          const { balance: btcBalance, decimals: btcDecimals } =
            await btc.getBalance(address);
          formattedBalance = `${(
            Number(btcBalance) / Math.pow(10, btcDecimals)
          ).toFixed(6)} BTC`;
          break;
        case Chain.OSMOSIS:
          const { balance: osmoBalance, decimals: osmoDecimals } =
            await cosmos.getBalance(address);
          formattedBalance = `${(
            Number(osmoBalance) / Math.pow(10, osmoDecimals)
          ).toFixed(6)} OSMO`;
          break;
        default:
          throw new Error("Unsupported chain");
      }
      setAccountBalance(formattedBalance);
    } catch (error) {
      console.error("Error fetching balance:", error);
      setAccountBalance("Error");
    }
  }, [btc, chain, cosmos, address, evm]);

  return { accountBalance, getAccountBalance };
};
