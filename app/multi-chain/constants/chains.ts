// src/constants/chains.ts
export enum Chain {
  ETH = "ETH",
  BNB = "BNB",
  BTC = "BTC",
  COSMOS = "COSMOS",
}

export const chainsConfig = {
  ethereum: {
    testnet: {
      providerUrl: "https://sepolia.infura.io/v3/6df51ccaa17f4e078325b5050da5a2dd",
      explorerUrl: "https://sepolia.etherscan.io",
      name: "ETH",
    },
    mainnet: {
      providerUrl: "", // Add mainnet provider URL
      explorerUrl: "https://etherscan.io",
      name: "ETH",
    },
  },
  bsc: {
    testnet: {
      providerUrl: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
      explorerUrl: "https://testnet.bscscan.com",
      name: "BNB",
    },
    mainnet: {
      providerUrl: "", // Add mainnet provider URL
      explorerUrl: "https://bscscan.com",
      name: "BNB",
    },
  },
  btc: {
    testnet: {
      name: "BTC",
      networkType: "testnet" as const,
      rpcEndpoint: "https://blockstream.info/testnet/api/",
      explorerUrl: "https://blockstream.info/testnet",
    },
    mainnet: {
      name: "BTC",
      networkType: "mainnet" as const,
      rpcEndpoint: "https://blockstream.info/api/",
      explorerUrl: "https://blockstream.info",
    },
  },
  cosmos: {
    testnet: {
      restEndpoint: "https://lcd.osmotest5.osmosis.zone/",
      explorerUrl: "https://www.mintscan.io/osmosis-testnet",
      chainId: "osmo-test-5",
    },
    mainnet: {
      restEndpoint: "", // Add mainnet REST endpoint
      explorerUrl: "https://www.mintscan.io/osmosis",
      chainId: "", // Add mainnet chain ID
    },
  },
};
