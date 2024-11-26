import { useEffect, useState } from "react";
import { Account, connect, KeyPair, keyStores, Near } from "near-api-js";
import { useEnv } from "./useEnv";
import { KeyPairString } from "near-api-js/lib/utils";

const useInitNear = (
  options: { isViewOnly?: boolean } = {
    isViewOnly: true,
  }
) => {
  const [state, setState] = useState<
    { account: Account; connection: Near } | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const { nearPrivateKey, nearAccountId, nearNetworkId } = useEnv(options);

  useEffect(() => {
    const initialize = async () => {
      try {
        let keyPair: KeyPair;
        let accountId: string;
        if (options?.isViewOnly) {
          keyPair = KeyPair.fromRandom("ED25519");
          accountId = `${keyPair.getPublicKey().toString()}.${nearNetworkId}`;
        } else {
          keyPair = KeyPair.fromString(nearPrivateKey as KeyPairString);
          accountId = nearAccountId as string;
        }
        const keyStore = new keyStores.InMemoryKeyStore();
        keyStore.setKey(nearNetworkId, accountId, keyPair);

        const config = {
          networkId: nearNetworkId,
          keyStore,
          nodeUrl:
            nearNetworkId === "mainnet"
              ? "https://rpc.mainnet.near.org"
              : "https://rpc.testnet.near.org",
          walletUrl:
            nearNetworkId === "mainnet"
              ? "https://wallet.mainnet.near.org"
              : "https://wallet.testnet.near.org",
          helperUrl:
            nearNetworkId === "mainnet"
              ? "https://helper.mainnet.near.org"
              : "https://helper.testnet.near.org",
        };

        if (!process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID) {
          throw new Error("No account found in environment");
        }

        const connection = await connect(config);
        const account = await connection.account(
          process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID
        );

        setState({ connection, account });
      } catch (error) {
        console.error("Failed to initialize NEAR:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [nearAccountId, nearPrivateKey, nearNetworkId, options?.isViewOnly]);

  return { ...state, isLoading };
};

export default useInitNear;
