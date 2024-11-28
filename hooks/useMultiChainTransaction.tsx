import { useEnv } from "@/hooks/useEnv";
import { useAuth } from "@/providers/AuthProvider";
import {
    KeyDerivationPath,
    transactionBuilder,
    CosmosTransactionRequest,
    CosmosUnsignedTransaction,
    BTCTransactionRequest,
    BTCUnsignedTransaction,
    Chain,
    EVMTransactionRequest,
    EVMUnsignedTransaction
} from "multichain-tools";
import { useCallback, useEffect } from "react";
import { FinalExecutionOutcome } from "@near-wallet-selector/core";
import useInitNear from "@/hooks/useInitNear";
import { useChains } from "./useChains";
import { chainsConfig } from "../constants/chains";
import { toast } from "@/hooks/use-toast";

interface MultiChainTransactionHook {
    signEvmTransaction: (transactionRequest: EVMTransactionRequest, path: KeyDerivationPath, tokenId?: string) => Promise<FinalExecutionOutcome | void>;
    sendEvmTransaction: (transaction: EVMUnsignedTransaction, txOutcome: FinalExecutionOutcome) => Promise<string>;
    signBtcTransaction: (transactionRequest: BTCTransactionRequest, path: KeyDerivationPath, tokenId?: string) => Promise<FinalExecutionOutcome | void>;
    sendBtcTransaction: (transaction: BTCUnsignedTransaction, txOutcome: FinalExecutionOutcome) => Promise<string>;
    signCosmosTransaction: (transactionRequest: CosmosTransactionRequest, path: KeyDerivationPath, tokenId?: string) => Promise<FinalExecutionOutcome | void>;
    sendCosmosTransaction: (transaction: CosmosUnsignedTransaction, txOutcome: FinalExecutionOutcome) => Promise<string>;
}

// TODO: It should accept the contract type to be used as args
export const useMultiChainTransaction = (): MultiChainTransactionHook => {
    const { walletSelector, accountId } = useAuth();
    const { nearNetworkId, chainSignatureContract, nftKeysContract } = useEnv();
    const { account } = useInitNear();
    const { evm, btc, cosmos } = useChains();

    const signTransaction = useCallback(async <TRequest, TUnsigned>(
        chain: Chain<TRequest, TUnsigned>,
        transactionRequest: TRequest,
        path: KeyDerivationPath,
        storageKey: string,
        tokenId?: string
    ): Promise<FinalExecutionOutcome | void> => {
        if (!accountId) {
            throw new Error("Account ID not found");
        }

        const { transaction, mpcPayloads } = await chain.getMPCPayloadAndTransaction(transactionRequest);
        chain.setTransaction(transaction, storageKey);

        const wallet = await walletSelector?.wallet('my-near-wallet');
        if (!wallet) {
            throw new Error("Wallet not found");
        }

        if (tokenId) {
            // NFT Keys flow
            return wallet.signAndSendTransaction({
                ...(await transactionBuilder.near.mpcPayloadsToNFTKeysTransaction({
                    networkId: nearNetworkId,
                    chainSigContract: chainSignatureContract,
                    nftKeysContract,
                    mpcPayloads,
                    path,
                    tokenId
                })),
            });
        } else {
            // Chain Signature flow
            return wallet.signAndSendTransaction({
                ...(await transactionBuilder.near.mpcPayloadsToChainSigTransaction({
                    networkId: nearNetworkId,
                    contractId: chainSignatureContract,
                    mpcPayloads,
                    path,
                })),
            });
        }
    }, [accountId, chainSignatureContract, nearNetworkId, nftKeysContract, walletSelector]);

    const sendTransaction = useCallback(async <TRequest, TUnsigned>(
        chain: Chain<TRequest, TUnsigned>,
        transaction: TUnsigned,
        txOutcome: FinalExecutionOutcome
    ): Promise<string> => {
        const mpcSignature = transactionBuilder.near.responseToMpcSignature({
            response: txOutcome,
        });

        if (!mpcSignature) {
            throw new Error("MPC signatures not found");
        }

        return chain.addSignatureAndBroadcast({
            transaction,
            mpcSignatures: [mpcSignature],
            publicKey: '' // TODO: Get public key from somewhere
        });
    }, []);

    const signEvmTransaction = useCallback((
        transactionRequest: EVMTransactionRequest,
        path: KeyDerivationPath,
        tokenId?: string
    ) => signTransaction(evm, transactionRequest, path, 'evm-transaction', tokenId),
        [evm, signTransaction]);

    const signBtcTransaction = useCallback((
        transactionRequest: BTCTransactionRequest,
        path: KeyDerivationPath,
        tokenId?: string
    ) => signTransaction(btc, transactionRequest, path, 'btc-transaction', tokenId),
        [btc, signTransaction]);

    const signCosmosTransaction = useCallback((
        transactionRequest: CosmosTransactionRequest,
        path: KeyDerivationPath,
        tokenId?: string
    ) => signTransaction(cosmos, transactionRequest, path, 'cosmos-transaction', tokenId),
        [cosmos, signTransaction]);

    const sendEvmTransaction = useCallback((
        transaction: EVMUnsignedTransaction,
        txOutcome: FinalExecutionOutcome
    ) => sendTransaction(evm, transaction, txOutcome),
        [evm, sendTransaction]);

    const sendBtcTransaction = useCallback((
        transaction: BTCUnsignedTransaction,
        txOutcome: FinalExecutionOutcome
    ) => sendTransaction(btc, transaction, txOutcome),
        [btc, sendTransaction]);

    const sendCosmosTransaction = useCallback((
        transaction: CosmosUnsignedTransaction,
        txOutcome: FinalExecutionOutcome
    ) => sendTransaction(cosmos, transaction, txOutcome),
        [cosmos, sendTransaction]);

    useEffect(() => {
        if (typeof window === 'undefined' || !account) return;

        const urlParams = new URLSearchParams(window.location.search);
        const nearTxHash = urlParams.get('transactionHashes');
        if (!nearTxHash) return;

        const resumeTransaction = async () => {
            try {
                const txOutcome = await account.connection.provider.txStatus(
                    nearTxHash,
                    account.accountId,
                    'FINAL'
                );

                if (!txOutcome) {
                    throw new Error("Transaction not found");
                }

                const evmTransaction = evm.getTransaction('evm-transaction', { remove: true });
                const btcTransaction = btc.getTransaction('btc-transaction', { remove: true });
                const cosmosTransaction = cosmos.getTransaction('cosmos-transaction', { remove: true });

                let foreignerChainTxHash: string | undefined;

                if (evmTransaction) {
                    foreignerChainTxHash = await sendEvmTransaction(evmTransaction, txOutcome);
                } else if (btcTransaction) {
                    foreignerChainTxHash = await sendBtcTransaction(btcTransaction, txOutcome);
                } else if (cosmosTransaction) {
                    foreignerChainTxHash = await sendCosmosTransaction(cosmosTransaction, txOutcome);
                } else {
                    throw new Error("Transaction not found");
                }

                window.history.replaceState({}, '', window.location.pathname);
                let explorerUrl = '';
                if (evmTransaction) {
                    explorerUrl = `${chainsConfig.ethereum.explorerUrl}/tx/${foreignerChainTxHash}`;
                } else if (btcTransaction) {
                    explorerUrl = `${chainsConfig.btc.explorerUrl}/tx/${foreignerChainTxHash}`;
                } else if (cosmosTransaction) {
                    explorerUrl = `${chainsConfig.osmosis.explorerUrl}/tx/${foreignerChainTxHash}`;
                }
                toast({
                    title: "Transaction sent!",
                    description: (
                        <div>
                            <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="underline">View transaction on explorer</a>
                        </div>
                    ),
                });
            } catch (error) {
                console.error("Error resuming transaction:", error);
            }
        };

        void resumeTransaction();
    }, [
        account,
        btc,
        cosmos,
        evm,
        sendBtcTransaction,
        sendCosmosTransaction,
        sendEvmTransaction
    ]);

    return {
        signEvmTransaction,
        sendEvmTransaction,
        signBtcTransaction,
        sendBtcTransaction,
        signCosmosTransaction,
        sendCosmosTransaction,
    };
};
