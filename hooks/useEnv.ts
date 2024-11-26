import { useMemo } from "react";

interface EnvVariables {
  nearAccountId: string | undefined;
  nearPrivateKey: string | undefined;
  chainSignatureContract: string;
  nftKeysContract: string;
  nftKeysMarketplaceContract: string;
  nearNetworkId: "mainnet" | "testnet";
}

export const useEnv = ({
  options,
}: {
  options?: {
    isViewOnly?: boolean;
  };
}): EnvVariables => {
  return useMemo(() => {
    const nearAccountId = process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID;
    const nearPrivateKey = process.env.NEXT_PUBLIC_NEAR_PRIVATE_KEY;
    const chainSignatureContract =
      process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT;
    const nftKeysContract = process.env.NEXT_PUBLIC_NFT_KEYS_CONTRACT;
    const nftKeysMarketplaceContract =
      process.env.NEXT_PUBLIC_NFT_KEYS_MARKETPLACE_CONTRACT;
    const nearNetworkId = process.env.NEXT_PUBLIC_NEAR_NETWORK_ID;

    if (!nearAccountId && !options?.isViewOnly) {
      throw new Error("NEXT_PUBLIC_NEAR_ACCOUNT_ID is not defined");
    }
    if (!nearPrivateKey && !options?.isViewOnly) {
      throw new Error("NEXT_PUBLIC_NEAR_PRIVATE_KEY is not defined");
    }
    if (!chainSignatureContract) {
      throw new Error("NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT is not defined");
    }
    if (!nftKeysContract) {
      throw new Error("NEXT_PUBLIC_NFT_KEYS_CONTRACT is not defined");
    }
    if (!nftKeysMarketplaceContract) {
      throw new Error(
        "NEXT_PUBLIC_NFT_KEYS_MARKETPLACE_CONTRACT is not defined"
      );
    }
    if (
      !nearNetworkId ||
      (nearNetworkId !== "mainnet" && nearNetworkId !== "testnet")
    ) {
      throw new Error(
        'NEXT_PUBLIC_NETWORK_ID must be either "mainnet" or "testnet"'
      );
    }

    return {
      nearAccountId,
      nearPrivateKey,
      chainSignatureContract,
      nftKeysContract,
      nftKeysMarketplaceContract,
      nearNetworkId: nearNetworkId as "mainnet" | "testnet",
    };
  }, [options?.isViewOnly]);
};
