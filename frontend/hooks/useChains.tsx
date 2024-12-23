"use client";

import { useMemo } from "react";
import { Bitcoin, EVM, Cosmos } from "multichain-tools";
import { CHAINS } from "@/constants/chains";
import { useChainSignaturesContract } from "./useChainSignaturesContracts";

interface ChainInstances {
    btc: Bitcoin;
    evm: EVM;
    cosmos: Cosmos;
}

export const useChains = (): ChainInstances => {
    const chainSignaturesContract = useChainSignaturesContract();

    const btc = useMemo(
        () =>
            new Bitcoin({
                providerUrl: CHAINS.BTC.rpcEndpoint,
                network: CHAINS.BTC.networkType,
                contract: chainSignaturesContract,
            }),
        [chainSignaturesContract]
    );

    const evm = useMemo(
        () =>
            new EVM({
                providerUrl: CHAINS.ETH.providerUrl,
                contract: chainSignaturesContract,
            }),
        [chainSignaturesContract]
    );

    const cosmos = useMemo(
        () =>
            new Cosmos({
                chainId: CHAINS.OSMOSIS.chainId,
                contract: chainSignaturesContract,
            }),
        [chainSignaturesContract]
    );

    return {
        btc,
        evm,
        cosmos,
    } as const;
};
