export type NFT = {
  token_id: string;
  owner_id: string;
  metadata: {
    title: string;
    description: string;
    media: string;
  };
  price?: string;
  token?: string;
};

export type FormData = {
  tokenId: string;
  price: string;
  token: string;
};

export const SUPPORTED_TOKENS = [
  { id: "near", name: "NEAR" },
  { id: "btc", name: "Bitcoin" },
  { id: "eth", name: "Ethereum" },
  { id: "usdt", name: "USDT" },
  { id: "usdc", name: "USDC" },
];
