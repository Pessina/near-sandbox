"use client";

import { useEnv } from "@/hooks/useEnv";
import { useWalletAuth } from "@/providers/WalletAuthProvider";
import {
    KeyDerivationPath,
    utils,
    CosmosTransactionRequest,
    CosmosUnsignedTransaction,
    BTCTransactionRequest,
    BTCUnsignedTransaction,
    type Chain,
    EVMTransactionRequest,
    EVMUnsignedTransaction
} from "signet.js"
import { useCallback, useEffect } from "react";
import { FinalExecutionOutcome } from "@near-wallet-selector/core";
import { useChains } from "./useChains";
import { CHAINS } from "@/constants/chains";
import { toast } from "@/hooks/use-toast";
import { useKeyPairAuth } from "@/providers/KeyPairAuthProvider";

interface MultiChainTransactionHook {
    signEvmTransaction: (transactionRequest: EVMTransactionRequest, path: KeyDerivationPath, tokenId?: string) => Promise<FinalExecutionOutcome | void>;
    sendEvmTransaction: (transaction: EVMUnsignedTransaction, txOutcome: FinalExecutionOutcome) => Promise<string>;
    signBtcTransaction: (transactionRequest: BTCTransactionRequest, path: KeyDerivationPath, tokenId?: string) => Promise<FinalExecutionOutcome | void>;
    sendBtcTransaction: (transaction: BTCUnsignedTransaction, txOutcome: FinalExecutionOutcome) => Promise<string>;
    signCosmosTransaction: (transactionRequest: CosmosTransactionRequest, path: KeyDerivationPath, tokenId?: string) => Promise<FinalExecutionOutcome | void>;
    sendCosmosTransaction: (transaction: CosmosUnsignedTransaction, txOutcome: FinalExecutionOutcome) => Promise<string>;
}

// TODO: It should accept the contract type to be used as args
export const useMultiChainWalletTransaction = (): MultiChainTransactionHook => {
    const { walletSelector, accountId } = useWalletAuth();
    const { nearNetworkId, chainSignatureContract, nftKeysContract } = useEnv();
    // The account is used as view only so it doesn't matter the account we use here
    const { accounts } = useKeyPairAuth();
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

        const { transaction, mpcPayloads } = await chain.prepareTransactionForSigning(transactionRequest);

        window.localStorage.setItem(storageKey, chain.serializeTransaction(transaction));

        const wallet = await walletSelector?.wallet('my-near-wallet');
        if (!wallet) {
            throw new Error("Wallet not found");
        }

        if (tokenId) {
            // NFT Keys flow
            // return wallet.signAndSendTransaction({
            //     ...(await utils.chains.near.transactionBuilder.mpcPayloadsToNFTKeysTransaction({
            //         networkId: nearNetworkId,
            //         chainSigContract: chainSignatureContract,
            //         nftKeysContract,
            //         mpcPayloads,
            //         path,
            //         tokenId
            //     })),
            // });
        } else {
            // Chain Signature flow
            return wallet.signAndSendTransaction({
                ...(await utils.chains.near.transactionBuilder.mpcPayloadsToChainSigTransaction({
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
        const mpcSignature = utils.chains.near.transactionBuilder.responseToMpcSignature({
            response: txOutcome,
        });

        if (!mpcSignature) {
            throw new Error("MPC signatures not found");
        }

        const transactionSerialized = chain.attachTransactionSignature({
            transaction,
            mpcSignatures: [mpcSignature],
        });

        return chain.broadcastTx(transactionSerialized);
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
        if (typeof window === 'undefined' || !accounts.length) return;

        const urlParams = new URLSearchParams(window.location.search);
        const nearTxHash = urlParams.get('transactionHashes');
        if (!nearTxHash) return;

        const resumeTransaction = async () => {
            try {
                const txOutcome = await accounts[0].connection.provider.txStatus(
                    nearTxHash,
                    accounts[0].accountId,
                );

                if (!txOutcome) {
                    throw new Error("Transaction not found");
                }

                const evmTx = window.localStorage.getItem('evm-transaction');
                const btcTx = window.localStorage.getItem('btc-transaction');
                const cosmosTx = window.localStorage.getItem('cosmos-transaction');

                let explorerUrl = '';
                if (evmTx) {
                    const evmTransaction = evm.deserializeTransaction(evmTx as `0x${string}`);
                    const foreignerChainTxHash = await sendEvmTransaction(evmTransaction, txOutcome);
                    explorerUrl = `${CHAINS.ETH.explorerUrl}/tx/${foreignerChainTxHash}`;
                    window.localStorage.removeItem('evm-transaction');
                } else if (btcTx) {
                    const btcTransaction = btc.deserializeTransaction(btcTx);
                    const foreignerChainTxHash = await sendBtcTransaction(btcTransaction, txOutcome);
                    explorerUrl = `${CHAINS.BTC.explorerUrl}/tx/${foreignerChainTxHash}`;
                    window.localStorage.removeItem('btc-transaction');
                } else if (cosmosTx) {
                    const cosmosTransaction = cosmos.deserializeTransaction(cosmosTx);
                    const foreignerChainTxHash = await sendCosmosTransaction(cosmosTransaction, txOutcome);
                    explorerUrl = `${CHAINS.OSMOSIS.explorerUrl}/tx/${foreignerChainTxHash}`;
                    window.localStorage.removeItem('cosmos-transaction');
                } else {
                    throw new Error("Transaction not found");
                }

                window.history.replaceState({}, '', window.location.pathname);

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
        accounts,
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
