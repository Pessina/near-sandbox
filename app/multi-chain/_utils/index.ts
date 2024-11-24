import { useAuth } from "@/providers/AuthProvider";
import {
  EVMRequest,
  EVM,
  BitcoinRequest,
  CosmosRequest,
  Cosmos,
  Bitcoin,
  near,
} from "multichain-tools";
import { type FinalExecutionOutcome } from "near-api-js/lib/providers";
import { Chain, chainsConfig } from "../_constants/chains";
import { useCallback } from "react";

export interface SignAndSendTransactionParams {
  signerId?: string;
  receiverId?: string;
  actions: Array<Action>;
}

export interface SignAndSendTransactionsParams {
  transactions: Array<{
    signerId?: string;
    receiverId: string;
    actions: Array<Action>;
  }>;
}

export const signAndSendTransaction = async (
  wallet: Wallet,
  params: SignAndSendTransactionParams
): Promise<FinalExecutionOutcome> => {
  return await wallet.signAndSendTransaction(params);
};

export const signAndSendTransactions = async (
  wallet: Wallet,
  params: SignAndSendTransactionsParams
): Promise<Array<FinalExecutionOutcome>> => {
  return await wallet.signAndSendTransactions(params);
};

const getChainInstance = (chain: Chain) => {
  switch (chain) {
    case Chain.BNB:
      return new EVM({
        providerUrl: chainsConfig.bsc.providerUrl,
        contract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
      });
    case Chain.ETH:
      return new EVM({
        providerUrl: chainsConfig.ethereum.providerUrl,
        contract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
      });
    case Chain.BTC:
      return new Bitcoin({
        providerUrl: chainsConfig.btc.rpcEndpoint,
        network: chainsConfig.btc.networkType,
        contract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
      });
    case Chain.OSMOSIS:
      return new Cosmos({
        chainId: chainsConfig.osmosis.chainId,
        contract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
      });
  }
};

const useSignAndSendTransaction = ({ chain }: { chain: Chain }) => {
  const auth = useAuth();

  const chainInstance = getChainInstance(chain);

  const signAndSendTransactionWithWallet = useCallback(
    async (req) => {
      const { transaction, txHash } =
        await chainInstance.getSerializedTransactionAndPayloadToSign({
          data: req.transaction,
          nearAuthentication: req.nearAuthentication,
          path: req.derivationPath,
        });

      const signature = await wallet.signMessage({
        message: txHash,
        recipient: req.chainConfig.contract,
        nonce: Buffer.from(req.derivationPath),
      });

      if (!signature) {
        throw new Error("Failed to sign transaction");
      }

      const res = await chainInstance.reconstructSignature({
        transactionSerialized: transaction,
        signature: signature.signature,
      });

      return {
        transactionHash: res.hash,
        success: true,
      };
    },
    [chainInstance]
  );
};
