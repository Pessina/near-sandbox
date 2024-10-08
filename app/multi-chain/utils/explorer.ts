import { Chain, chainsConfig } from "../constants/chains";

export const getExplorerUrl = (chain: Chain, txHash: string): string => {
  switch (chain) {
    case Chain.ETH:
      return `${chainsConfig.ethereum.explorerUrl}/tx/${txHash}`;
    case Chain.BTC:
      return `${chainsConfig.btc.explorerUrl}/tx/${txHash}`;
    case Chain.BNB:
      return `${chainsConfig.bsc.explorerUrl}/tx/${txHash}`;
    case Chain.COSMOS:
      return `${chainsConfig.cosmos.explorerUrl}/txs/${txHash}`;
    default:
      return "";
  }
};