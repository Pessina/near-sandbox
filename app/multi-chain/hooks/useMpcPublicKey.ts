// src/hooks/useMpcPublicKey.ts
import { useState, useEffect } from 'react';
import { ChainSignaturesContract } from "multichain-tools";

export const useMpcPublicKey = (account: any) => {
  const [mpcPublicKey, setMpcPublicKey] = useState("");

  useEffect(() => {
    const getMpcPublicKey = async () => {
      if (!account) return;

      const mpcPublicKey = await ChainSignaturesContract.getRootPublicKey(
        process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
        'testnet',
      );

      if (!mpcPublicKey) {
        throw new Error("MPC Public Key not found");
      }  

      setMpcPublicKey(mpcPublicKey);
    };

    getMpcPublicKey();
  }, [account]);

  return mpcPublicKey;
};

