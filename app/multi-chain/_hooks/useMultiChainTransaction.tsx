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

type MultiChainTransactionHook = {
    signEvmTransaction: (transactionRequest: EVMTransactionRequest, path: KeyDerivationPath) => Promise<FinalExecutionOutcome | void>;
    sendEvmTransaction: (transaction: EVMUnsignedTransaction, txOutcome: FinalExecutionOutcome) => Promise<string>;
    signBtcTransaction: (transactionRequest: BTCTransactionRequest, path: KeyDerivationPath) => Promise<FinalExecutionOutcome | void>;
    sendBtcTransaction: (transaction: BTCUnsignedTransaction, txOutcome: FinalExecutionOutcome) => Promise<string>;
    signCosmosTransaction: (transactionRequest: CosmosTransactionRequest, path: KeyDerivationPath) => Promise<FinalExecutionOutcome | void>;
    sendCosmosTransaction: (transaction: CosmosUnsignedTransaction, txOutcome: FinalExecutionOutcome) => Promise<string>;
};

export const useMultiChainTransaction = (): MultiChainTransactionHook => {
    const { walletSelector, accountId } = useAuth();
    const { nearNetworkId, chainSignatureContract } = useEnv();
    const { account } = useInitNear();
    const { evm, btc, cosmos } = useChains();

    const signTransaction = useCallback(async <TRequest, TUnsigned>(
        chain: Chain<TRequest, TUnsigned>,
        transactionRequest: TRequest,
        path: KeyDerivationPath,
        storageKey: string
    ) => {
        if (!accountId) {
            throw new Error("Account ID not found");
        }
        const { transaction, mpcPayloads } = await chain.getMPCPayloadAndTransaction(transactionRequest);

        chain.setTransaction(transaction, storageKey);

        const wallet = await walletSelector?.wallet('my-near-wallet');
        if (!wallet) {
            throw new Error("Wallet not found");
        }

        const response = await wallet.signAndSendTransaction({
            ...(await transactionBuilder.near.mpcPayloadsToTransaction({
                networkId: nearNetworkId,
                contractId: chainSignatureContract,
                mpcPayloads,
                path,
            })),
        });

        return response;
    }, [accountId, chainSignatureContract, nearNetworkId, walletSelector]);

    const sendTransaction = useCallback(async <TRequest, TUnsigned>(
        chain: Chain<TRequest, TUnsigned>,
        transaction: TUnsigned,
        txOutcome: FinalExecutionOutcome
    ) => {
        const mpcSignature = transactionBuilder.near.responseToMpcSignature({
            response: txOutcome,
        });

        if (!mpcSignature) {
            throw new Error("MPC signatures not found");
        }

        const txHash = await chain.addSignatureAndBroadcast({
            transaction,
            mpcSignatures: [mpcSignature],
            publicKey: '' // TODO: Get public key from somewhere
        });

        return txHash;
    }, []);

    const signEvmTransaction = useCallback((
        transactionRequest: EVMTransactionRequest,
        path: KeyDerivationPath
    ) => {
        return signTransaction(evm, transactionRequest, path, 'evm-transaction');
    }, [evm, signTransaction]);

    const signBtcTransaction = useCallback((
        transactionRequest: BTCTransactionRequest,
        path: KeyDerivationPath
    ) => {
        return signTransaction(btc, transactionRequest, path, 'btc-transaction');
    }, [btc, signTransaction]);

    const signCosmosTransaction = useCallback((
        transactionRequest: CosmosTransactionRequest,
        path: KeyDerivationPath
    ) => {
        return signTransaction(cosmos, transactionRequest, path, 'cosmos-transaction');
    }, [cosmos, signTransaction]);

    const sendEvmTransaction = useCallback((
        transaction: EVMUnsignedTransaction,
        txOutcome: FinalExecutionOutcome
    ) => {
        return sendTransaction(evm, transaction, txOutcome);
    }, [evm, sendTransaction]);

    const sendBtcTransaction = useCallback((
        transaction: BTCUnsignedTransaction,
        txOutcome: FinalExecutionOutcome
    ) => {
        return sendTransaction(btc, transaction, txOutcome);
    }, [btc, sendTransaction]);

    const sendCosmosTransaction = useCallback((
        transaction: CosmosUnsignedTransaction,
        txOutcome: FinalExecutionOutcome
    ) => {
        return sendTransaction(cosmos, transaction, txOutcome);
    }, [cosmos, sendTransaction]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const nearTxHash = urlParams.get('transactionHashes');

            if (nearTxHash && account) {
                const resumeTransaction = async () => {
                    try {
                        const txOutcome = await account.connection.provider.txStatus(nearTxHash, account.accountId, 'FINAL');

                        if (!txOutcome) {
                            throw new Error("Transaction not found");
                        }

                        const evmTransaction = evm.getTransaction('evm-transaction', { remove: true });
                        const btcTransaction = btc.getTransaction('btc-transaction', { remove: true });
                        const cosmosTransaction = cosmos.getTransaction('cosmos-transaction', { remove: true });

                        let foreignerChainTxHash;
                        if (evmTransaction) {
                            foreignerChainTxHash = await sendEvmTransaction(evmTransaction, txOutcome);
                        } else if (btcTransaction) {
                            foreignerChainTxHash = await sendBtcTransaction(btcTransaction, txOutcome);
                        } else if (cosmosTransaction) {
                            foreignerChainTxHash = await sendCosmosTransaction(cosmosTransaction, txOutcome);
                        } else {
                            throw new Error("Transaction not found");
                        }

                        const newUrl = window.location.pathname;
                        window.history.replaceState({}, '', newUrl);

                        console.log("Foreign transaction hash:", foreignerChainTxHash);
                    } catch (error) {
                        console.error("Error resuming transaction:", error);
                    }
                };

                resumeTransaction();
            }
        }
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
