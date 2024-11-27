import { useMemo } from "react";
import { Bitcoin, EVM, Cosmos } from "multichain-tools";
import { useEnv } from "@/hooks/useEnv";
import { chainsConfig } from "../_constants/chains";

export const useChains = () => {
    const { nearNetworkId, chainSignatureContract } = useEnv();

    const btc = useMemo(() => {
        return new Bitcoin({
            providerUrl: chainsConfig.btc.rpcEndpoint,
            network: chainsConfig.btc.networkType,
            nearNetworkId,
            contract: chainSignatureContract,
        });
    }, [nearNetworkId, chainSignatureContract]);

    const evm = useMemo(() => {
        return new EVM({
            ...chainsConfig.ethereum,
            nearNetworkId,
            contract: chainSignatureContract,
        });
    }, [nearNetworkId, chainSignatureContract]);

    const cosmos = useMemo(() => {
        return new Cosmos({
            chainId: chainsConfig.osmosis.chainId,
            nearNetworkId,
            contract: chainSignatureContract,
        });
    }, [nearNetworkId, chainSignatureContract]);

    return {
        btc,
        evm,
        cosmos
    };
};
