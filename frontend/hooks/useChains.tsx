"use client";

import { useMemo } from "react";
import { Bitcoin, EVM, Cosmos, BTCRpcAdapters } from "signet.js"
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
                network: CHAINS.BTC.networkType,
                contract: chainSignaturesContract,
                btcRpcAdapter: new BTCRpcAdapters.Mempool(CHAINS.BTC.rpcEndpoint),
            }),
        [chainSignaturesContract]
    );

    const evm = useMemo(
        () =>
            new EVM({
                rpcUrl: CHAINS.ETH.providerUrl,
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
