import { useMemo } from "react";
import { EVM } from "multichain-tools";
import { useEnv } from "@/hooks/useEnv";
import { chainsConfig } from "../_constants/chains";

export const useEVM = () => {
  const { nearNetworkId, chainSignatureContract } = useEnv({
    options: {
      isViewOnly: true,
    },
  });

  const evm = useMemo(() => {
    return new EVM({
      ...chainsConfig.ethereum,
      nearNetworkId,
      contract: chainSignatureContract,
    });
  }, [nearNetworkId, chainSignatureContract]);

  return evm;
};
