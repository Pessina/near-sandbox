// src/hooks/useDerivedAddress.ts
import { useState, useEffect } from "react";
import {
  fetchDerivedBTCAddressAndPublicKey,
  fetchDerivedEVMAddress,
  fetchDerivedCosmosAddressAndPublicKey,
} from "multichain-tools";
import { Chain } from "../constants/chains";

export const useDerivedAddress = (
  account: any,
  chain: Chain,
  derivedPath: string
) => {
  const [derivedAddress, setDerivedAddress] = useState("");

  useEffect(() => {
    const getAddress = async () => {
      if (!account) {
        setDerivedAddress("");
        return;
      }

      let address = "";
      switch (chain) {
        case Chain.BNB:
        case Chain.ETH:
          address = await fetchDerivedEVMAddress({
            signerId: account.accountId,
            path: {
              chain: 60,
              domain: "",
              meta: {
                path: derivedPath,
              },
            },
            nearNetworkId: "testnet",
            multichainContractId:
              process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
          });
          break;
        case Chain.BTC:
          address = (
            await fetchDerivedBTCAddressAndPublicKey({
              signerId: account.accountId,
              path: {
                chain: 0,
                domain: "",
                meta: {
                  path: derivedPath,
                },
              },
              btcNetworkId: "testnet",
              nearNetworkId: "testnet",
              multichainContractId:
                process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
            })
          ).address;
          break;
        case Chain.COSMOS:
          const { address: cosmosAddress } =
            await fetchDerivedCosmosAddressAndPublicKey({
              signerId: account.accountId,
              path: {
                chain: 118,
                domain: "",
                meta: {
                  path: derivedPath,
                },
              },
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
  }, [account, chain, derivedPath]);

  return derivedAddress;
};
