import { Chain, TOKEN_CONFIGS } from "@/constants/chains";
import { parseUnits, formatUnits } from "ethers";

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
