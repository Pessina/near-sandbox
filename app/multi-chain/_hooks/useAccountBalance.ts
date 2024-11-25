// src/hooks/useAccountBalance.ts
import { useState, useCallback } from "react";
import { getBalance } from "@/lib/balance";
import { Chain, chainsConfig } from "../_constants/chains";

export const useAccountBalance = (chain: Chain, derivedAddress: string) => {
  const [accountBalance, setAccountBalance] = useState("");

  const getAccountBalance = useCallback(async () => {
    let balance = "";
    try {
      switch (chain) {
        case Chain.ETH:
          balance = await getBalance(
            "ETH",
            chainsConfig.ethereum.providerUrl,
            derivedAddress
          );
          balance = `${parseFloat(balance).toFixed(8)} ETH`;
          break;
        case Chain.BTC:
          balance = await getBalance(
            "BTC",
            chainsConfig.btc.rpcEndpoint,
            derivedAddress
          );
          balance = `${balance} BTC`;
          break;
        case Chain.BNB:
          balance = await getBalance(
            "BNB",
            chainsConfig.bsc.providerUrl,
            derivedAddress
          );
          balance = `${parseFloat(balance).toFixed(8)} BNB`;
          break;
        case Chain.OSMOSIS:
          balance = await getBalance(
            "OSMOSIS",
            chainsConfig.osmosis.restEndpoint,
            derivedAddress,
            { denom: "uosmo" }
          );
          balance = `${balance} OSMO`;
          break;
        default:
          throw new Error("Unsupported chain");
      }
      setAccountBalance(balance);
    } catch (error) {
      console.error("Error fetching balance:", error);
      setAccountBalance("Error");
    }
  }, [chain, derivedAddress]);

  return { accountBalance, getAccountBalance };
};
