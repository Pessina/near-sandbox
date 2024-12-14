"use client";

import { useState } from "react";
import { Chain } from "@/constants/chains";
import { CEX_ENDPOINTS } from "@/constants/cex";

interface PriceData {
  price: string;
  pair: string;
  timestamp: number;
  provider: string;
}

export function usePrices() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPrices = async (
    fromToken: Chain,
    toToken: Chain
  ): Promise<PriceData[]> => {
    setIsLoading(true);
    setError(null);
    const prices: PriceData[] = [];

    try {
      if (
        (fromToken === Chain.ETH && toToken === Chain.BTC) ||
        (fromToken === Chain.BTC && toToken === Chain.ETH)
      ) {
        try {
          const response = await fetch(
            `${CEX_ENDPOINTS.binance.ticker}?symbol=${fromToken}${toToken}`
          );

          if (response.ok) {
            const data = await response.json();
            prices.push({
              price: data.price,
              pair: `${fromToken}/${toToken}`,
              timestamp: Date.now(),
              provider: "Binance",
            });
          }
        } catch (err) {
          console.warn("Binance price fetch failed:", err);
        }
      }

      try {
        const coinGeckoIds = {
          [Chain.ETH]: "ethereum",
          [Chain.BTC]: "bitcoin",
          [Chain.OSMOSIS]: "osmosis",
        };

        const coinGeckoCurrencies = {
          [Chain.ETH]: "eth",
          [Chain.BTC]: "btc",
          [Chain.OSMOSIS]: "osmo",
        };

        const fromId = coinGeckoIds[fromToken];
        const toCurrency = coinGeckoCurrencies[toToken];

        if (!fromId || !toCurrency) {
          throw new Error("Unsupported token pair for CoinGecko");
        }

        const response = await fetch(
          `${CEX_ENDPOINTS.coingecko.simplePrice}?ids=${fromId}&vs_currencies=${toCurrency}`
        );

        if (response.ok) {
          const data = await response.json();
          prices.push({
            price: data[fromId][toCurrency].toString(),
            pair: `${fromToken}/${toToken}`,
            timestamp: Date.now(),
            provider: "CoinGecko",
          });
        }
      } catch (err) {
        console.warn("CoinGecko price fetch failed:", err);
      }

      if (prices.length === 0) {
        throw new Error("Failed to fetch prices from any provider");
      }

      return prices;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch prices";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getPrices,
    isLoading,
    error,
  };
}
