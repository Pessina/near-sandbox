"use client";

import { useState } from "react";
import { Chain } from "@/constants/chains";
import { CEX_ENDPOINTS } from "@/constants/cex";

interface PriceData {
  price: string;
  pair: string;
  timestamp: number;
}

export function usePrices() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPrice = async (
    fromToken: Chain,
    toToken: Chain
  ): Promise<PriceData> => {
    setIsLoading(true);
    setError(null);

    try {
      // Only try Binance API for ETH/BTC pairs since those are the main ones we support
      if (
        (fromToken === Chain.ETH && toToken === Chain.BTC) ||
        (fromToken === Chain.BTC && toToken === Chain.ETH)
      ) {
        const response = await fetch(
          `${CEX_ENDPOINTS.binance.ticker}?symbol=${fromToken}${toToken}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch price data");
        }

        const data = await response.json();

        return {
          price: data.price,
          pair: `${fromToken}/${toToken}`,
          timestamp: Date.now(),
        };
      }
      throw new Error("Using fallback price source");
    } catch (err) {
      try {
        // Fallback to CoinGecko for all pairs
        const response = await fetch(
          `${
            CEX_ENDPOINTS.coingecko.simplePrice
          }?ids=${fromToken.toLowerCase()}&vs_currencies=${toToken.toLowerCase()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch price data");
        }

        const data = await response.json();

        return {
          price:
            data[fromToken.toLowerCase()][toToken.toLowerCase()].toString(),
          pair: `${fromToken}/${toToken}`,
          timestamp: Date.now(),
        };
      } catch (fallbackErr) {
        const error =
          err instanceof Error ? err.message : "Failed to fetch price";
        setError(error);
        throw new Error(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getPrice,
    isLoading,
    error,
  };
}
