import { Chain, CHAIN_CONFIGS } from "@/constants/chains";
import { parseUnits, formatUnits } from "ethers";

export interface TokenConfig {
  symbol: string;
  decimals: number;
  displaySymbol: string;
}

export const TOKEN_CONFIGS: Record<Chain, TokenConfig> = {
  [Chain.ETH]: {
    symbol: "eth",
    decimals: 18,
    displaySymbol: "ETH",
  },
  //   [Chain.BNB]: {
  //     symbol: "bnb",
  //     decimals: 18,
  //     displaySymbol: "BNB",
  //   },
  [Chain.BTC]: {
    symbol: "btc",
    decimals: 8,
    displaySymbol: "BTC",
  },
  [Chain.OSMOSIS]: {
    symbol: "osmo",
    decimals: 6,
    displaySymbol: "OSMO",
  },
};

export function parseTokenAmount(amount: string, chain: Chain): string {
  const config = TOKEN_CONFIGS[chain];
  if (!config) throw new Error(`Unsupported chain: ${chain}`);
  return parseUnits(amount, config.decimals).toString();
}

export function formatTokenAmount(amount: string, chain: Chain): string {
  const config = TOKEN_CONFIGS[chain];
  if (!config) throw new Error(`Unsupported chain: ${chain}`);
  return formatUnits(amount, config.decimals);
}

export function isValidChain(chain: string): chain is Chain {
  return Object.values(Chain).includes(chain as Chain);
}

export function getChainConfig(chain: Chain) {
  const config = CHAIN_CONFIGS[chain];
  if (!config) throw new Error(`No config found for chain: ${chain}`);
  return config;
}
