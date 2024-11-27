import { useEnv } from "@/hooks/useEnv";
import { useAuth } from "@/providers/AuthProvider";
import { ethers } from "ethers";
import {
    KeyDerivationPath,
    transactionBuilder,
    CosmosTransactionRequest,
    CosmosUnsignedTransaction,
    BTCTransactionRequest,
    BTCUnsignedTransaction
} from "multichain-tools";
import { useCallback, useEffect } from "react";
import { useEVM } from "../_hooks/useEVM";
import { useBTC } from "../_hooks/useBTC";
import { useCosmos } from "../_hooks/useCosmos";
import { FinalExecutionOutcome } from "@near-wallet-selector/core";
import useInitNear from "@/hooks/useInitNear";

export const useMultiChainTransaction = () => {
    const { walletSelector, accountId } = useAuth();
    const { nearNetworkId, chainSignatureContract } = useEnv();
    const { account } = useInitNear();
    const evm = useEVM();
    const btc = useBTC();
    const cosmos = useCosmos();

    const signEvmTransaction = useCallback(async (
        transactionRequest: ethers.TransactionLike,
        path: KeyDerivationPath
    ) => {
        if (!accountId) {
            throw new Error("Account ID not found");
        }

        try {
            const { address } = await evm.deriveAddressAndPublicKey(
                accountId,
                path
            );

            const { transaction, mpcPayloads } =
                await evm.getMPCPayloadAndTransaction({
                    ...transactionRequest,
                    from: address,
                });

            evm.setTransaction(transaction, 'evm-transaction');

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
        } catch (e: unknown) {
            console.error(e);
        }
    }, [accountId, chainSignatureContract, evm, nearNetworkId, walletSelector])

    const sendEvmTransaction = useCallback(
        async (
            transaction: ethers.TransactionLike,
            txOutcome: FinalExecutionOutcome
        ) => {
            try {
                const signature = transactionBuilder.near.responseToMpcSignature({
                    response: txOutcome,
                });

                if (signature && transaction) {
                    const txHash = await evm.addSignatureAndBroadcast({
                        transaction,
                        mpcSignatures: [signature],
                    });

                    return {
                        transactionHash: txHash,
                        success: true,
                    };
                }
            } catch (e: unknown) {
                console.error(e);
                return {
                    success: false,
                    errorMessage: e instanceof Error ? e.message : String(e),
                };
            }
        },
        [evm]
    );

    const signBtcTransaction = useCallback(
        async (transactionRequest: BTCTransactionRequest, path: KeyDerivationPath) => {
            if (!accountId) {
                throw new Error("Account ID not found");
            }

            const { address, publicKey: compressedPublicKey } = await btc.deriveAddressAndPublicKey(accountId, path);

            const { transaction, mpcPayloads } = await btc.getMPCPayloadAndTransaction({ ...transactionRequest, from: address, compressedPublicKey });

            btc.setTransaction(transaction, 'btc-transaction');

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
        },
        [accountId, btc, chainSignatureContract, nearNetworkId, walletSelector]
    );

    const sendBtcTransaction = useCallback(
        async (transaction: BTCUnsignedTransaction, txOutcome: FinalExecutionOutcome) => {
            const mpcSignature = transactionBuilder.near.responseToMpcSignature({
                response: txOutcome,
            });

            if (!mpcSignature) {
                throw new Error("MPC signatures not found");
            }

            const txHash = await btc.addSignatureAndBroadcast({
                transaction,
                mpcSignatures: [mpcSignature],
            });

            return txHash;
        },
        [btc]
    );

    const signCosmosTransaction = useCallback(
        async (transactionRequest: CosmosTransactionRequest, path: KeyDerivationPath) => {
            if (!accountId) {
                throw new Error("Account ID not found");
            }

            const { address, publicKey: compressedPublicKey } = await cosmos.deriveAddressAndPublicKey(accountId, path);
            const { transaction, mpcPayloads } = await cosmos.getMPCPayloadAndTransaction({
                ...transactionRequest, address, compressedPublicKey
            });

            cosmos.setTransaction(transaction, 'cosmos-transaction');

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
        },
        [accountId, chainSignatureContract, cosmos, nearNetworkId, walletSelector]
    );

    const sendCosmosTransaction = useCallback(
        // TODO: fix the types here and on multichain-tools
        async (transaction: CosmosUnsignedTransaction, txOutcome: FinalExecutionOutcome) => {
            const mpcSignature = transactionBuilder.near.responseToMpcSignature({
                response: txOutcome,
            });

            if (!mpcSignature) {
                throw new Error("MPC signatures not found");
            }

            const txHash = await cosmos.addSignatureAndBroadcast({
                transaction,
                mpcSignatures: [mpcSignature],
            });

            return txHash;
        },
        [cosmos]
    );

    useEffect(() => {
        // Check URL for transaction hash parameter
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const nearTxHash = urlParams.get('transactionHashes');

            if (nearTxHash) {
                const resumeTransaction = async () => {
                    try {
                        const txOutcome = await account?.connection.provider.txStatus(nearTxHash, account.accountId, 'FINAL');

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

                        // Clear URL parameter after processing
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
        account?.accountId,
        account?.connection.provider,
        btc,
        cosmos,
        evm,
        sendBtcTransaction,
        sendCosmosTransaction,
        sendEvmTransaction
    ])

    return {
        signEvmTransaction,
        sendEvmTransaction,
        signBtcTransaction,
        sendBtcTransaction,
        signCosmosTransaction,
        sendCosmosTransaction,
    };
};
