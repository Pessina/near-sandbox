import { Chain, chainsConfig } from "../constants/chains";

export const getExplorerUrl = (chain: Chain, txHash: string): string => {
  switch (chain) {
    case Chain.ETH:
      return `${chainsConfig.ethereum.scanUrl}/tx/${txHash}`;
    case Chain.BTC:
      return `${chainsConfig.btc.scanUrl}/tx/${txHash}`;
    case Chain.BNB:
      return `${chainsConfig.bsc.scanUrl}/tx/${txHash}`;
    case Chain.COSMOS:
      return `${chainsConfig.cosmos.scanUrl}/txs/${txHash}`;
    default:
      return "";
  }
};