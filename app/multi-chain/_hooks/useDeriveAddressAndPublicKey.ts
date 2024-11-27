import { useState, useEffect } from "react";
import { Chain } from "../_constants/chains";
import { getCanonicalizedDerivationPath } from "@/lib/canonicalize";
import { useChains } from "./useChains";

export const useDeriveAddressAndPublicKey = (
  accountId: string,
  chain: Chain,
  derivedPath: string
) => {
  const [derivedAddressAndPublicKey, setDerivedAddressAndPublicKey] = useState<{
    address: string;
    publicKey: string;
  } | null>(null);

  const { evm, btc, cosmos } = useChains();

  useEffect(() => {
    const getAddress = async () => {
      if (!accountId) {
        setDerivedAddressAndPublicKey(null);
        return;
      }

      let addressAndPublicKey = { address: "", publicKey: "" };
      switch (chain) {
        case Chain.BNB:
        case Chain.ETH:
          addressAndPublicKey = await evm.deriveAddressAndPublicKey(
            accountId,
            getCanonicalizedDerivationPath({
              chain: 60,
              domain: "",
              meta: {
                path: derivedPath,
              },
            })
          );
          break;
        case Chain.BTC:
          addressAndPublicKey = await btc.deriveAddressAndPublicKey(
            accountId,
            getCanonicalizedDerivationPath({
              chain: 0,
              domain: "",
              meta: {
                path: derivedPath,
              },
            })
          );
          break;
        case Chain.OSMOSIS:
          await cosmos.deriveAddressAndPublicKey(
            accountId,
            getCanonicalizedDerivationPath({
              chain: 118,
              domain: "",
              meta: {
                path: derivedPath,
              },
            })
          );
          break;
      }

      setDerivedAddressAndPublicKey(addressAndPublicKey);
    };

    getAddress();
  }, [accountId, btc, chain, cosmos, derivedPath, evm]);

  return derivedAddressAndPublicKey;
};
