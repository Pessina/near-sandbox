import { useMemo } from "react";
import { Bitcoin } from "multichain-tools";
import { useEnv } from "@/hooks/useEnv";
import { chainsConfig } from "../_constants/chains";

export const useBTC = () => {
  const { networkId, chainSignatureContract } = useEnv();

  const btc = useMemo(() => {
    return new Bitcoin({
      providerUrl: chainsConfig.btc.rpcEndpoint,
      network: chainsConfig.btc.networkType,
      nearNetworkId: networkId,
      contract: chainSignatureContract,
    });
  }, [networkId, chainSignatureContract]);

  return btc;
};
