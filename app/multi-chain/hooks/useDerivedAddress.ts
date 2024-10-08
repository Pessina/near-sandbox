// src/hooks/useDerivedAddress.ts
import { useState, useEffect } from 'react';
import { fetchDerivedBTCAddressAndPublicKey, fetchDerivedEVMAddress, fetchDerivedCosmosAddressAndPublicKey } from "multichain-tools";
import { Chain } from '../constants/chains';
import { useEnvVariables } from '../../../hooks/useEnvVariables';

export const useDerivedAddress = (account: any, chain: Chain, path: string, mpcPublicKey: string) => {
  const [derivedAddress, setDerivedAddress] = useState("");
  const { chainSignatureContract, networkId } = useEnvVariables(); 

  useEffect(() => {
    const getAddress = async () => {
      if (!account || !mpcPublicKey) {
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
                path: path,
              }
            },
            nearNetworkId: networkId,
            multichainContractId: chainSignatureContract
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
                  path: path,
                }
              },
              btcNetworkId:  'testnet',
              nearNetworkId: networkId,
              multichainContractId: chainSignatureContract
            })
          ).address;
          break;
        case Chain.COSMOS:
          const { address: cosmosAddress } = await fetchDerivedCosmosAddressAndPublicKey({
            signerId: account.accountId,
            path: {
              chain: 118,
              domain: "",
              meta: {
                path: path,
              }
            },
            nearNetworkId: networkId,
            multichainContractId: chainSignatureContract,
            prefix: "osmo",
          });
          address = cosmosAddress;
          break;
      }

      setDerivedAddress(address);
    };

    getAddress();
  }, [account, chain, chainSignatureContract, mpcPublicKey, networkId, path]);

  return derivedAddress;
};

