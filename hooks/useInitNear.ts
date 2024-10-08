import { useEffect, useState } from "react";
import { Account, Near } from "near-api-js";
import { KeyPair, connect, keyStores } from "near-api-js";
import { KeyPairString } from "near-api-js/lib/utils";
import { useEnvVariables } from "./useEnvVariables";

const useInitNear = () => {
  const [state, setState] = useState<
    { account: Account; connection: Near } | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const { nearAccountId, nearPrivateKey, networkId } = useEnvVariables();

  useEffect(() => {
    const initialize = async () => {
      try {
        const keyPair = KeyPair.fromString(nearPrivateKey! as KeyPairString);
        const keyStore = new keyStores.InMemoryKeyStore();
        keyStore.setKey(networkId, nearAccountId, keyPair);

        const config = {
          networkId: networkId,
          keyStore,
          nodeUrl: "https://rpc.testnet.near.org",
          walletUrl: "https://wallet.testnet.near.org",
          helperUrl: "https://helper.testnet.near.org",
        };

        const connection = await connect(config);
        const account = await connection.account(nearAccountId);
        setState({ connection, account });
      } catch (error) {
        console.error("Failed to initialize NEAR:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [nearAccountId, networkId, nearPrivateKey]);

  return { ...state, isLoading };
};

export default useInitNear;
