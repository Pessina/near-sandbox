// src/constants/chains.ts
export enum Chain {
  ETH = "ETH",
  BNB = "BNB",
  BTC = "BTC",
  COSMOS = "COSMOS",
}

export const chainsConfig = {
  ethereum: {
    providerUrl: "https://sepolia.infura.io/v3/6df51ccaa17f4e078325b5050da5a2dd",
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
    rpcEndpoint: "https://blockstream.info/testnet/api/",
    explorerUrl: "https://blockstream.info/testnet",
  },
  cosmos: {
    restEndpoint: "https://lcd.osmotest5.osmosis.zone/",
    explorerUrl: "https://www.mintscan.io/osmosis-testnet",
    chainId: "osmo-test-5",
  },
};

