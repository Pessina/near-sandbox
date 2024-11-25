// src/hooks/useDerivedAddress.ts
import { useState, useEffect } from "react";
import {
  fetchDerivedBTCAddressAndPublicKey,
  fetchDerivedEVMAddress,
  fetchDerivedCosmosAddressAndPublicKey,
} from "multichain-tools";
import { Chain } from "../_constants/chains";
import { getCanonicalizedDerivationPath } from "@/lib/canonicalize";

export const useDerivedAddress = (
  accountId: string,
  chain: Chain,
  derivedPath: string
) => {
  const [derivedAddress, setDerivedAddress] = useState("");

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
          address = await fetchDerivedEVMAddress({
            signerId: accountId,
            path: getCanonicalizedDerivationPath({
              chain: 60,
              domain: "",
              meta: {
                path: derivedPath,
              },
            }),
            nearNetworkId: "testnet",
            multichainContractId:
              process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
          });
          break;
        case Chain.BTC:
          address = (
            await fetchDerivedBTCAddressAndPublicKey({
              signerId: accountId,
              path: getCanonicalizedDerivationPath({
                chain: 0,
                domain: "",
                meta: {
                  path: derivedPath,
                },
              }),
              btcNetworkId: "testnet",
              nearNetworkId: "testnet",
              multichainContractId:
                process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
            })
          ).address;
          break;
        case Chain.OSMOSIS:
          const { address: cosmosAddress } =
            await fetchDerivedCosmosAddressAndPublicKey({
              signerId: accountId,
              path: getCanonicalizedDerivationPath({
                chain: 118,
                domain: "",
                meta: {
                  path: derivedPath,
                },
              }),
              nearNetworkId: "testnet",
              multichainContractId:
                process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
              prefix: "osmo",
            });
          address = cosmosAddress;
          break;
      }

      setDerivedAddress(address);
    };

    getAddress();
  }, [accountId, chain, derivedPath]);

  return derivedAddress;
};
