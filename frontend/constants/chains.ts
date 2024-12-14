export enum Chain {
  ETH = "ETH",
  // BNB = "BNB",
  BTC = "BTC",
  OSMOSIS = "OSMOSIS",
}

export const CHAINS = {
  [Chain.ETH]: {
    shortName: "ETH",
    name: "Ethereum",
    slip44: 60,
    providerUrl:
      "https://sepolia.infura.io/v3/6df51ccaa17f4e078325b5050da5a2dd",
    explorerUrl: "https://sepolia.etherscan.io",
    testnet: true,
  },
  // [Chain.BNB]: {
  //   shortName: "BNB",
  //   name: "BNB Chain",
  //   slip44: 714,
  //   providerUrl: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
  //   explorerUrl: "https://testnet.bscscan.com",
  //   testnet: true
  // },
  [Chain.BTC]: {
    shortName: "BTC",
    name: "Bitcoin",
    slip44: 0,
    networkType: "testnet" as const,
    rpcEndpoint: "https://mempool.space/testnet4/api",
    explorerUrl: "https://mempool.space/testnet4",
    testnet: true,
  },
  [Chain.OSMOSIS]: {
    shortName: "OSMO",
    name: "Osmosis",
    slip44: 118,
    restEndpoint: "https://lcd.osmotest5.osmosis.zone/",
    chainId: "osmo-test-5",
    explorerUrl: "https://www.mintscan.io/osmosis-testnet",
    testnet: true,
  },
} as const;
