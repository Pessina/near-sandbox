import { useEffect, useState } from "react";
import {
  Account,
  connect,
  ConnectConfig,
  KeyPair,
  keyStores,
  Near,
} from "near-api-js";
import { useEnv } from "./useEnv";
import { KeyPairString } from "near-api-js/lib/utils";

const useInitNear = (
  options: { isViewOnly?: boolean } = {
    isViewOnly: true,
  }
) => {
  const [state, setState] = useState<
    | {
        accounts: Account[];
        connection: Near;
      }
    | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const { nearAccounts, nearNetworkId } = useEnv(options);

  useEffect(() => {
    const initialize = async () => {
      try {
        const keyStore = new keyStores.InMemoryKeyStore();
        let accounts: Account[] = [];

        if (options?.isViewOnly) {
          // For view-only, create a single random account
          const keyPair = KeyPair.fromRandom("ED25519");
          const accountId = `${keyPair
            .getPublicKey()
            .toString()}.${nearNetworkId}`;
          await keyStore.setKey(nearNetworkId, accountId, keyPair);
        } else {
          // Initialize all accounts from nearAccounts array
          if (nearAccounts.length === 0) {
            throw new Error("No NEAR accounts found in environment");
          }

          // Store all account keys in keyStore
          for (const { accountId, privateKey } of nearAccounts) {
            const keyPair = KeyPair.fromString(privateKey as KeyPairString);
            await keyStore.setKey(nearNetworkId, accountId, keyPair);
          }
        }

        const config: ConnectConfig = {
          networkId: nearNetworkId,
          keyStore,
          nodeUrl:
            nearNetworkId === "mainnet"
              ? "https://rpc.mainnet.near.org"
              : "https://rpc.testnet.near.org",
          helperUrl:
            nearNetworkId === "mainnet"
              ? "https://helper.mainnet.near.org"
              : "https://helper.testnet.near.org",
        };

        const connection = await connect(config);

        if (options?.isViewOnly) {
          // For view-only, get the single random account
          const keys = await keyStore.getAccounts(nearNetworkId);
          accounts = [await connection.account(keys[0])];
        } else {
          // Get all accounts from nearAccounts
          accounts = await Promise.all(
            nearAccounts.map(({ accountId }) => connection.account(accountId))
          );
        }

        setState({ connection, accounts });
      } catch (error) {
        console.error("Failed to initialize NEAR:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [nearAccounts, nearNetworkId, options?.isViewOnly]);

  return { ...state, isLoading };
};

export default useInitNear;
