import { useMemo } from 'react';

interface EnvVariables {
  nearAccountId: string;
  nearPrivateKey: string;
  chainSignatureContract: string;
  networkId: 'testnet' | 'mainnet';
}

export function useEnvVariables(): EnvVariables {
  return useMemo(() => {
    if (!process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID ||
        !process.env.NEXT_PUBLIC_NEAR_PRIVATE_KEY ||
        !process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT ||
        !process.env.NEXT_PUBLIC_NETWORK_ID) {
            throw new Error("Missing environment variables");
        }

    return {
      nearAccountId: process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID!,
      nearPrivateKey: process.env.NEXT_PUBLIC_NEAR_PRIVATE_KEY!,
      chainSignatureContract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
      networkId: process.env.NEXT_PUBLIC_NETWORK_ID as 'testnet' | 'mainnet',
    };
  }, []);
}