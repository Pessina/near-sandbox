import { useMemo } from "react";
import { Bitcoin, EVM, Cosmos } from "multichain-tools";
import { useEnv } from "@/hooks/useEnv";
import { chainsConfig } from "../constants/chains";

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
                providerUrl: chainsConfig.btc.rpcEndpoint,
                network: chainsConfig.btc.networkType,
                nearNetworkId,
                contract: chainSignatureContract,
            }),
        [nearNetworkId, chainSignatureContract]
    );

    const evm = useMemo(
        () =>
            new EVM({
                ...chainsConfig.ethereum,
                nearNetworkId,
                contract: chainSignatureContract,
            }),
        [nearNetworkId, chainSignatureContract]
    );

    const cosmos = useMemo(
        () =>
            new Cosmos({
                chainId: chainsConfig.osmosis.chainId,
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
