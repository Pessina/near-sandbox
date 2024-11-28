import type { NFT } from "@/app/nft-keys/_contract/NFTKeysContract/types";

export type NFTWithPrice = NFT & {
  price?: string;
  token?: string;
  path?: string;
};

export type FormData = {
  tokenId: string;
  path: string;
  token: string;
  saleConditions: {
    token: string;
    amount: string;
  };
};

export const SUPPORTED_TOKENS = [
  { id: "near", name: "NEAR" },
  { id: "btc", name: "Bitcoin" },
  { id: "eth", name: "Ethereum" },
  { id: "usdt", name: "USDT" },
  { id: "usdc", name: "USDC" },
];
