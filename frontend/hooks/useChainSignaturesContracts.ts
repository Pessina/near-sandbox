"use client";

import { useMemo } from "react";
import { near } from "signet.js";
import { useEnv } from "@/hooks/useEnv";

export const useChainSignaturesContract = () => {
  const { nearNetworkId, chainSignatureContract } = useEnv();

  const contract = useMemo(
    () =>
      new near.contract.ChainSignaturesContract({
        networkId: nearNetworkId,
        contractId: chainSignatureContract,
      }),
    [nearNetworkId, chainSignatureContract]
  );

  return contract;
};
