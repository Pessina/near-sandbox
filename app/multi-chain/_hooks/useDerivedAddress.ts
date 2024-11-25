import { useState, useEffect } from "react";
import { Chain } from "../_constants/chains";
import { getCanonicalizedDerivationPath } from "@/lib/canonicalize";
import { useBTC } from "./useBTC";
import { useCosmos } from "./useCosmos";
import { useEVM } from "./useEVM";

export const useDerivedAddress = (
  accountId: string,
  chain: Chain,
  derivedPath: string
) => {
  const [derivedAddress, setDerivedAddress] = useState("");

  const evm = useEVM();
  const btc = useBTC();
  const cosmos = useCosmos();

  useEffect(() => {
    const getAddress = async () => {
      if (!accountId) {
        setDerivedAddress("");
        return;
      }

      let address = "";
      switch (chain) {
        case Chain.BNB:
        case Chain.ETH:
          address = (
            await evm.deriveAddressAndPublicKey(
              accountId,
              getCanonicalizedDerivationPath({
                chain: 60,
                domain: "",
                meta: {
                  path: derivedPath,
                },
              })
            )
          ).address;
          break;
        case Chain.BTC:
          address = (
            await btc.deriveAddressAndPublicKey(
              accountId,
              getCanonicalizedDerivationPath({
                chain: 0,
                domain: "",
                meta: {
                  path: derivedPath,
                },
              })
            )
          ).address;
          break;
        case Chain.OSMOSIS:
          const { address: cosmosAddress } =
            await cosmos.deriveAddressAndPublicKey(
              accountId,
              getCanonicalizedDerivationPath({
                chain: 118,
                domain: "",
                meta: {
                  path: derivedPath,
                },
              }),
              "osmo"
            );
          address = cosmosAddress;
          break;
      }

      setDerivedAddress(address);
    };

    getAddress();
  }, [accountId, chain, derivedPath]);

  return derivedAddress;
};
