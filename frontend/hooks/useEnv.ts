import { useMemo } from "react";

interface NearAccount {
  accountId: string;
  privateKey: string;
}

interface EnvVariables {
  nearAccounts: NearAccount[];
  chainSignatureContract: string;
  nftKeysContract: string;
  nftKeysMarketplaceContract: string;
  nearNetworkId: "mainnet" | "testnet";
}

export const useEnv = (
  options: { isViewOnly?: boolean } = {
    isViewOnly: true,
  }
): EnvVariables => {
  return useMemo(() => {
    const envVars =
      typeof window !== "undefined"
        ? {
            NEXT_PUBLIC_NEAR_ACCOUNT_ID:
              process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID,
            NEXT_PUBLIC_NEAR_PRIVATE_KEY:
              process.env.NEXT_PUBLIC_NEAR_PRIVATE_KEY,
            NEXT_PUBLIC_NEAR_ACCOUNT_ID2:
              process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID2,
            NEXT_PUBLIC_NEAR_PRIVATE_KEY2:
              process.env.NEXT_PUBLIC_NEAR_PRIVATE_KEY2,
          }
        : {};

    const accounts: NearAccount[] = [];

    if (
      envVars.NEXT_PUBLIC_NEAR_ACCOUNT_ID &&
      envVars.NEXT_PUBLIC_NEAR_PRIVATE_KEY
    ) {
      accounts.push({
        accountId: envVars.NEXT_PUBLIC_NEAR_ACCOUNT_ID,
        privateKey: envVars.NEXT_PUBLIC_NEAR_PRIVATE_KEY,
      });
    }

    [2].forEach((num) => {
      const accountId =
        envVars[`NEXT_PUBLIC_NEAR_ACCOUNT_ID${num}` as keyof typeof envVars];
      const privateKey =
        envVars[`NEXT_PUBLIC_NEAR_PRIVATE_KEY${num}` as keyof typeof envVars];
      if (accountId && privateKey) {
        accounts.push({ accountId, privateKey });
      }
    });

    const chainSignatureContract =
      process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT;
    const nftKeysContract = process.env.NEXT_PUBLIC_NFT_KEYS_CONTRACT;
    const nftKeysMarketplaceContract =
      process.env.NEXT_PUBLIC_NFT_KEYS_MARKETPLACE_CONTRACT;
    const nearNetworkId = process.env.NEXT_PUBLIC_NEAR_NETWORK_ID;

    if (accounts.length === 0 && !options?.isViewOnly) {
      throw new Error("No valid NEAR account ID and private key pairs found");
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
      nearAccounts: accounts,
      chainSignatureContract,
      nftKeysContract,
      nftKeysMarketplaceContract,
      nearNetworkId: nearNetworkId as "mainnet" | "testnet",
    };
  }, [options?.isViewOnly]);
};
