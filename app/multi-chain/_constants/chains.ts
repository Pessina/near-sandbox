// src/constants/chains.ts
export enum Chain {
  ETH = "ETH",
  BNB = "BNB",
  BTC = "BTC",
  OSMOSIS = "OSMOSIS",
}

export const chainsConfig = {
  ethereum: {
    providerUrl:
      "https://sepolia.infura.io/v3/6df51ccaa17f4e078325b5050da5a2dd",
    scanUrl: "https://etherscan.io",
    name: "ETH",
  },
  bsc: {
    providerUrl: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
    scanUrl: "https://testnet.bscscan.com",
    name: "BNB",
  },
  btc: {
    name: "BTC",
    networkType: "testnet" as const,
    rpcEndpoint: "https://mempool.space/testnet4/api",
    scanUrl: "https://mempool.space/testnet4",
  },
  osmosis: {
    restEndpoint: "https://lcd.osmotest5.osmosis.zone/",
    chainId: "osmo-test-5",
  },
};
