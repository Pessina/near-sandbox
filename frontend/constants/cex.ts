export const CEX_ENDPOINTS = {
  binance: {
    ticker: "https://api.binance.com/api/v3/ticker/price",
  },
  coingecko: {
    simplePrice: "https://api.coingecko.com/api/v3/simple/price",
  },
} as const;
