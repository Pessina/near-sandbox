import { Chain, chainsConfig } from "../constants/chains";
import { useCallback } from 'react';
import { useEnvVariables } from '@/hooks/useEnvVariables';

export const useExplorerUrl = () => {
  const { networkId } = useEnvVariables();
  
  const getExplorerUrl = useCallback((chain: Chain, txHash: string): string => {
    switch (chain) {
      case Chain.ETH:
        return `${chainsConfig.ethereum[networkId].explorerUrl}/tx/${txHash}`;
      case Chain.BTC:
        return `${chainsConfig.btc[networkId].explorerUrl}/tx/${txHash}`;
      case Chain.BNB:
        return `${chainsConfig.bsc[networkId].explorerUrl}/tx/${txHash}`;
      case Chain.COSMOS:
        return `${chainsConfig.cosmos[networkId].explorerUrl}/txs/${txHash}`;
      default:
        return "";
    }
  }, [networkId]);

  return { getExplorerUrl };
};