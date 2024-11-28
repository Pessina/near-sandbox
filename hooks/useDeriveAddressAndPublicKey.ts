import { useState, useEffect } from "react";
import { Chain } from "../app/constants/chains";
import { getCanonicalizedDerivationPath } from "@/lib/canonicalize";
import { useChains } from "./useChains";

interface DerivedAddressAndPublicKey {
  address: string;
  publicKey: string;
}

export const useDeriveAddressAndPublicKey = (
  accountId: string,
  chain: Chain,
  path: string
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

      let result: DerivedAddressAndPublicKey;

      if (chain === Chain.BNB || chain === Chain.ETH) {
        result = await evm.deriveAddressAndPublicKey(accountId, path);
      } else if (chain === Chain.BTC) {
        result = await btc.deriveAddressAndPublicKey(accountId, path);
      } else if (chain === Chain.OSMOSIS) {
        result = await cosmos.deriveAddressAndPublicKey(accountId, path);
      } else {
        throw new Error(`Unsupported chain: ${chain}`);
      }
      setDerivedAddressAndPublicKey(result);
    };

    deriveAddressAndPublicKey().catch(console.error);
  }, [accountId, btc, chain, cosmos, path, evm]);

  return derivedAddressAndPublicKey;
};
