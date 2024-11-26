import { useMemo } from "react";
import { Cosmos } from "multichain-tools";
import { useEnv } from "@/hooks/useEnv";
import { chainsConfig } from "../_constants/chains";

export const useCosmos = () => {
  const { nearNetworkId, chainSignatureContract } = useEnv({
    options: {
      isViewOnly: true,
    },
  });

  const cosmos = useMemo(() => {
    return new Cosmos({
      chainId: chainsConfig.osmosis.chainId,
      nearNetworkId,
      contract: chainSignatureContract,
    });
  }, [nearNetworkId, chainSignatureContract]);

  return cosmos;
};
