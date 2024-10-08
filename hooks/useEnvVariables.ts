import { useState, useEffect } from 'react';

interface EnvVariables {
  nearAccountId: string;
  nearPrivateKey: string;
  chainSignatureContract: string;
  nearNetworkId: 'testnet' | 'mainnet';
}

export function useEnvVariables(): EnvVariables {
  const [envVariables, setEnvVariables] = useState<EnvVariables | null>(null);

  useEffect(() => {
    const env: Partial<EnvVariables> = {
      nearAccountId: process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID,
      nearPrivateKey: process.env.NEXT_PUBLIC_NEAR_PRIVATE_KEY,
      chainSignatureContract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT,
      nearNetworkId: process.env.NEXT_PUBLIC_NEAR_NETWORK_ID as 'testnet' | 'mainnet',
    };

    const missingVariables = Object.keys(env).filter(key => !env[key as keyof EnvVariables]);

    if (missingVariables.length > 0) {
      throw new Error(`Missing environment variables: ${missingVariables.join(', ')}`);
    }

    setEnvVariables(env as EnvVariables);
  }, []);

  if (!envVariables) {
    throw new Error('Environment variables not initialized');
  }

  return envVariables;
}
