import { useState, useCallback } from "react";
import { Chain } from "../app/constants/chains";
import { useChains } from "@/hooks/useChains";

export const useAccountBalance = (chain: Chain, address: string) => {
  const [accountBalance, setAccountBalance] = useState("");

  const { evm, btc, cosmos } = useChains();

  const getAccountBalance = useCallback(async () => {
    if (!address) {
      setAccountBalance("");
      return;
    }

    let balance = "";
    try {
      switch (chain) {
        case Chain.ETH:
          balance = await evm.getBalance(address);
          balance = `${parseFloat(balance).toFixed(8)} ETH`;
          break;
        case Chain.BTC:
          balance = await btc.getBalance(address);
          balance = `${balance} BTC`;
          break;
        case Chain.BNB:
          balance = await evm.getBalance(address);
          balance = `${parseFloat(balance).toFixed(8)} BNB`;
          break;
        case Chain.OSMOSIS:
          balance = await cosmos.getBalance(address);
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
  }, [btc, chain, cosmos, address, evm]);

  return { accountBalance, getAccountBalance };
};
