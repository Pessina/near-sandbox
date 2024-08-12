import { KeyPair, connect, keyStores } from "near-api-js";

if (
  !process.env.NEXT_PUBLIC_NEAR_PRIVATE_KEY ||
  !process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID
) {
  throw new Error("No private key or account id found in environment");
}

const keyPair = KeyPair.fromString(process.env.NEXT_PUBLIC_NEAR_PRIVATE_KEY);
const keyStore = new keyStores.InMemoryKeyStore();
keyStore.setKey("testnet", process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID, keyPair);

const config = {
  networkId: "testnet",
  keyStore,
  nodeUrl: "https://rpc.testnet.near.org",
  walletUrl: "https://wallet.testnet.near.org",
  helperUrl: "https://helper.testnet.near.org",
};

async function initNear() {
  if (!process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID) {
    throw new Error("No account found in environment");
  }

  const connection = await connect(config);
  const account = await connection.account(
    process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID
  );
  return { connection, account };
}

export default initNear;
