import { useMemo } from "react";
import { Cosmos } from "multichain-tools";
import { useEnv } from "@/hooks/useEnv";
import { chainsConfig } from "../_constants/chains";

export const useCosmos = () => {
  const { networkId, chainSignatureContract } = useEnv();

  const cosmos = useMemo(() => {
    return new Cosmos({
      chainId: chainsConfig.osmosis.chainId,
      nearNetworkId: networkId,
      contract: chainSignatureContract,
    });
  }, [networkId, chainSignatureContract]);

  return cosmos;
};
