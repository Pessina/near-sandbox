// src/hooks/useAccountBalance.ts
import { useState, useCallback } from 'react';
import { getBalance } from "@/app/multi-chain/utils/balance";
import { Chain, chainsConfig } from '../constants/chains';
import { useEnvVariables } from '@/hooks/useEnvVariables';

export const useAccountBalance = (chain: Chain, derivedAddress: string) => {
  const [accountBalance, setAccountBalance] = useState("");
  const { networkId } = useEnvVariables();

  const getAccountBalance = useCallback(async () => {
    let balance = "";
    try {
      switch (chain) {
        case Chain.ETH:
          balance = await getBalance("ETH", chainsConfig.ethereum[networkId].providerUrl, derivedAddress);
          balance = `${parseFloat(balance).toFixed(8)} ETH`;
          break;
        case Chain.BTC:
          balance = await getBalance("BTC", chainsConfig.btc[networkId].rpcEndpoint, derivedAddress);
          balance = `${balance} BTC`;
          break;
        case Chain.BNB:
          balance = await getBalance("BNB", chainsConfig.bsc[networkId].providerUrl, derivedAddress);
          balance = `${parseFloat(balance).toFixed(8)} BNB`;
          break;
        case Chain.COSMOS:
          balance = await getBalance("COSMOS", chainsConfig.cosmos[networkId].restEndpoint, derivedAddress, { denom: "uosmo" });
          balance = `${balance} COSMOS`;
          break;
        default:
          throw new Error('Unsupported chain');
      }
      setAccountBalance(balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setAccountBalance('Error');
    }
  }, [chain, derivedAddress, networkId]);

  return { accountBalance, getAccountBalance };
};