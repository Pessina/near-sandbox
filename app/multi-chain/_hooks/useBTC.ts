import { useMemo } from "react";
import { Bitcoin } from "multichain-tools";
import { useEnv } from "@/hooks/useEnv";
import { chainsConfig } from "../_constants/chains";

export const useBTC = () => {
  const { nearNetworkId, chainSignatureContract } = useEnv({
    options: {
      isViewOnly: true,
    },
  });

  const btc = useMemo(() => {
    return new Bitcoin({
      providerUrl: chainsConfig.btc.rpcEndpoint,
      network: chainsConfig.btc.networkType,
      nearNetworkId,
      contract: chainSignatureContract,
    });
  }, [nearNetworkId, chainSignatureContract]);

  return btc;
};
