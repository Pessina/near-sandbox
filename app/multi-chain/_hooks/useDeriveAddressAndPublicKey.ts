import { useState, useEffect } from "react";
import { Chain } from "../_constants/chains";
import { getCanonicalizedDerivationPath } from "@/lib/canonicalize";
import { useChains } from "./useChains";

interface DerivedAddressAndPublicKey {
  address: string;
  publicKey: string;
}

const CHAIN_CONFIGS = {
  [Chain.BNB]: { chainId: 60 },
  [Chain.ETH]: { chainId: 60 },
  [Chain.BTC]: { chainId: 0 },
  [Chain.OSMOSIS]: { chainId: 118 },
} as const;

export const useDeriveAddressAndPublicKey = (
  accountId: string,
  chain: Chain,
  derivedPath: string
): DerivedAddressAndPublicKey | null => {
  const [derivedAddressAndPublicKey, setDerivedAddressAndPublicKey] =
    useState<DerivedAddressAndPublicKey | null>(null);

  const { evm, btc, cosmos } = useChains();

  useEffect(() => {
    const deriveAddressAndPublicKey = async () => {
      if (!accountId) {
        setDerivedAddressAndPublicKey(null);
        return;
      }

      const chainConfig = CHAIN_CONFIGS[chain];
      const derivationPath = getCanonicalizedDerivationPath({
        chain: chainConfig.chainId,
        domain: "",
        meta: { path: derivedPath },
      });

      let result: DerivedAddressAndPublicKey;

      if (chain === Chain.BNB || chain === Chain.ETH) {
        result = await evm.deriveAddressAndPublicKey(accountId, derivationPath);
      } else if (chain === Chain.BTC) {
        result = await btc.deriveAddressAndPublicKey(accountId, derivationPath);
      } else if (chain === Chain.OSMOSIS) {
        result = await cosmos.deriveAddressAndPublicKey(
          accountId,
          derivationPath
        );
      } else {
        throw new Error(`Unsupported chain: ${chain}`);
      }
      setDerivedAddressAndPublicKey(result);
    };

    deriveAddressAndPublicKey().catch(console.error);
  }, [accountId, btc, chain, cosmos, derivedPath, evm]);

  return derivedAddressAndPublicKey;
};
