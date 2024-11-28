export enum Chain {
  ETH = "ETH",
  BNB = "BNB",
  BTC = "BTC",
  OSMOSIS = "OSMOSIS",
}

export const CHAIN_CONFIGS = {
  [Chain.BNB]: { chainId: 60 },
  [Chain.ETH]: { chainId: 60 },
  [Chain.BTC]: { chainId: 0 },
  [Chain.OSMOSIS]: { chainId: 118 },
} as const;

export const chainsConfig = {
  ethereum: {
    providerUrl:
      "https://sepolia.infura.io/v3/6df51ccaa17f4e078325b5050da5a2dd",
    explorerUrl: "https://sepolia.etherscan.io",
    name: "ETH",
  },
  bsc: {
    providerUrl: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
    explorerUrl: "https://testnet.bscscan.com",
    name: "BNB",
  },
  btc: {
    name: "BTC",
    networkType: "testnet" as const,
    rpcEndpoint: "https://mempool.space/testnet4/api",
    explorerUrl: "https://mempool.space/testnet4",
  },
  osmosis: {
    restEndpoint: "https://lcd.osmotest5.osmosis.zone/",
    chainId: "osmo-test-5",
    explorerUrl: "https://www.mintscan.io/osmosis-testnet",
  },
};
