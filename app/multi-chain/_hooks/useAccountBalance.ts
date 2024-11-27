import { useState, useCallback } from "react";
import { Chain } from "../_constants/chains";
import { useChains } from "./useChains";

export const useAccountBalance = (chain: Chain, derivedAddress: string) => {
  const [accountBalance, setAccountBalance] = useState("");

  const { evm, btc, cosmos } = useChains();

  const getAccountBalance = useCallback(async () => {
    let balance = "";
    try {
      switch (chain) {
        case Chain.ETH:
          balance = await evm.getBalance(derivedAddress);
          balance = `${parseFloat(balance).toFixed(8)} ETH`;
          break;
        case Chain.BTC:
          balance = await btc.getBalance(derivedAddress);
          balance = `${balance} BTC`;
          break;
        case Chain.BNB:
          balance = await evm.getBalance(derivedAddress);
          balance = `${parseFloat(balance).toFixed(8)} BNB`;
          break;
        case Chain.OSMOSIS:
          balance = await cosmos.getBalance(derivedAddress);
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
  }, [btc, chain, cosmos, derivedAddress, evm]);

  return { accountBalance, getAccountBalance };
};
