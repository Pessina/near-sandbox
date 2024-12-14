"use client";

import { useMemo } from "react";
import { Bitcoin, EVM, Cosmos } from "multichain-tools";
import { useEnv } from "@/hooks/useEnv";
import { CHAINS } from "@/constants/chains";

interface ChainInstances {
    btc: Bitcoin;
    evm: EVM;
    cosmos: Cosmos;
}

export const useChains = (): ChainInstances => {
    const { nearNetworkId, chainSignatureContract } = useEnv();

    const btc = useMemo(
        () =>
            new Bitcoin({
                providerUrl: CHAINS.BTC.rpcEndpoint,
                network: CHAINS.BTC.networkType,
                nearNetworkId,
                contract: chainSignatureContract,
            }),
        [nearNetworkId, chainSignatureContract]
    );

    const evm = useMemo(
        () =>
            new EVM({
                ...CHAINS.ETH,
                nearNetworkId,
                contract: chainSignatureContract,
            }),
        [nearNetworkId, chainSignatureContract]
    );

    const cosmos = useMemo(
        () =>
            new Cosmos({
                chainId: CHAINS.OSMOSIS.chainId,
                nearNetworkId,
                contract: chainSignatureContract,
            }),
        [nearNetworkId, chainSignatureContract]
    );

    return {
        btc,
        evm,
        cosmos,
    } as const;
};
