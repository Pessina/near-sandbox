import { KeyPair, connect, keyStores } from "near-api-js";
import { parseSeedPhrase } from 'near-seed-phrase'

const nearPrivKeyOverride = process.env.NEXT_PUBLIC_NEAR_PRIVATE_KEY_OVERRIDE;
const nearAccountId = process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID || "set env vars";
const seedPhrase = process.env.NEXT_PUBLIC_NEAR_SEED_PHRASE;

let keyPair
if (!nearPrivKeyOverride) {
  if (!seedPhrase) {
    console.error('Dev, please set the environment variables')
    process.exit(1)
  }
  const { publicKey, secretKey } = parseSeedPhrase(seedPhrase);
  keyPair = KeyPair.fromString(secretKey);
} else {
  console.info('Using the environment variable to override the private key, instead of using the seed phrase.')
  keyPair = KeyPair.fromString(nearPrivKeyOverride);
}


const keyStore = new keyStores.InMemoryKeyStore();
keyStore.setKey("testnet", nearAccountId, keyPair);

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
