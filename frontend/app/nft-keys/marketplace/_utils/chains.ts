import { Chain, CHAINS } from "@/constants/chains";
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
