"use client";

import { useMemo } from "react";
import { utils } from "signet.js";
import { useEnv } from "@/hooks/useEnv";

export const useChainSignaturesContract = () => {
  const { nearNetworkId, chainSignatureContract } = useEnv();

  const contract = useMemo(
    () =>
      new utils.chains.near.ChainSignatureContract({
        networkId: nearNetworkId,
        contractId: chainSignatureContract,
      }),
    [nearNetworkId, chainSignatureContract]
  );

  return contract;
};
