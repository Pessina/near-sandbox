import { useState, useEffect } from 'react';
import { ChainSignaturesContract } from "multichain-tools";
import { useEnvVariables } from '@/hooks/useEnvVariables';


export const useMpcPublicKey = () => {
  const [mpcPublicKey, setMpcPublicKey] = useState("");
  const { chainSignatureContract, nearNetworkId } = useEnvVariables(); 

  useEffect(() => {
    const getMpcPublicKey = async () => {
      const mpcPublicKey = await ChainSignaturesContract.getPublicKey({
        contract: chainSignatureContract,
          networkId: nearNetworkId,
      });

      if (!mpcPublicKey) {
        throw new Error("MPC Public Key not found");
      }  

      setMpcPublicKey(mpcPublicKey);
    };

    getMpcPublicKey();
  }, [chainSignatureContract, nearNetworkId]);

  return mpcPublicKey;
};

