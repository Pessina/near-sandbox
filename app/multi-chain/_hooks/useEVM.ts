import { useMemo } from "react";
import { EVM } from "multichain-tools";
import { useEnv } from "@/hooks/useEnv";
import { chainsConfig } from "../_constants/chains";

export const useEVM = () => {
  const { networkId, chainSignatureContract } = useEnv();

  const evm = useMemo(() => {
    return new EVM({
      ...chainsConfig.ethereum,
      nearNetworkId: networkId,
      contract: chainSignatureContract,
    });
  }, [networkId, chainSignatureContract]);

  return evm;
};
