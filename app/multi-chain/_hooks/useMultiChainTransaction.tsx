import { useEnv } from "@/hooks/useEnv";
import { useAuth } from "@/providers/AuthProvider";
import { ethers } from "ethers";
import {
    EVMRequest,
    EVM,
    BitcoinRequest,
    CosmosRequest,
    Cosmos,
    Bitcoin,
    ChainSignaturesContract,
    KeyDerivationPath,
    nearWallet,
} from "multichain-tools";
import { useCallback, useEffect } from "react";
import { useEVM } from "../_hooks/useEVM";
// import { useBTC } from "../_hooks/useBTC";
// import { useCosmos } from "../_hooks/useCosmos";
import { FinalExecutionOutcome } from "@near-wallet-selector/core";
import useInitNear from "@/hooks/useInitNear";

export const useMultiChainTransaction = () => {
    const { walletSelector, accountId } = useAuth();
    const { nearNetworkId, chainSignatureContract } = useEnv();
    const { account } = useInitNear();
    const evm = useEVM();
    // const btc = useBTC();
    // const cosmos = useCosmos();

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
                ...(await nearWallet.utils.mpcPayloadsToTransaction({
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
            response: FinalExecutionOutcome
        ) => {
            if (!accountId) {
                throw new Error("Account ID not found");
            }
            try {
                if (response) {
                    const signature = nearWallet.utils.responseToMpcSignature({
                        response,
                    });

                    const transaction = evm.getTransaction('evm-transaction', { remove: true });

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
                }
            } catch (e: unknown) {
                console.error(e);
                return {
                    success: false,
                    errorMessage: e instanceof Error ? e.message : String(e),
                };
            }
        },
        [accountId, evm]
    );

    useEffect(() => {
        // Check URL for transaction hash parameter
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const nearTxHash = urlParams.get('transactionHashes');

            if (nearTxHash) {
                const resumeTransaction = async () => {
                    try {
                        const txStatus = await account?.connection.provider.txStatus(nearTxHash, account.accountId, 'FINAL');

                        if (!txStatus) {
                            throw new Error("Transaction not found");
                        }

                        const foreignerChainTxHash = await sendEvmTransaction(txStatus);

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
    }, [account?.accountId, account?.connection.provider, sendEvmTransaction])

    //   const signAndSendBTCTransaction = useCallback(
    //     async (req: BitcoinRequest) => {
    //       try {
    //         const btc = new Bitcoin(req.chainConfig);

    //         const { txSerialized, mpcPayloads } =
    //           await btc.getMPCPayloadAndTxSerialized({
    //             data: req.transaction,
    //             nearAuthentication: req.nearAuthentication,
    //             path: req.derivationPath,
    //           });

    //         const wallet = await walletSelector?.wallet();
    //         if (!wallet) {
    //           throw new Error("Wallet not found");
    //         }

    //         const signatures = await Promise.all(
    //           mpcPayloads.map(async ({ payload }) =>
    //             wallet.signAndSendTransaction({
    //               receiverId: req.chainConfig.contract,
    //               actions: [
    //                 {
    //                   type: "FunctionCall",
    //                   params: {
    //                     methodName: "sign",
    //                     args: {
    //                       payload: Buffer.from(payload).toString("base64"),
    //                       path: req.derivationPath,
    //                     },
    //                     gas: "30000000000000",
    //                     deposit: "0",
    //                   },
    //                 },
    //               ],
    //             })
    //           )
    //         );

    //         const txHash = await btc.reconstructAndSendTransaction({
    //           nearAuthentication: req.nearAuthentication,
    //           path: req.derivationPath,
    //           mpcSignatures: signatures,
    //           txSerialized,
    //         });

    //         return {
    //           transactionHash: txHash,
    //           success: true,
    //         };
    //       } catch (e: unknown) {
    //         return {
    //           success: false,
    //           errorMessage: e instanceof Error ? e.message : String(e),
    //         };
    //       }
    //     },
    //     [walletSelector]
    //   );

    //   const signAndSendCosmosTransaction = useCallback(
    //     async (req: CosmosRequest) => {
    //       try {
    //         const cosmos = new Cosmos(req.chainConfig);

    //         const { txSerialized, mpcPayloads } =
    //           await cosmos.getMPCPayloadAndTxSerialized({
    //             data: req.transaction,
    //             nearAuthentication: req.nearAuthentication,
    //             path: req.derivationPath,
    //           });

    //         const wallet = await walletSelector?.wallet();
    //         if (!wallet) {
    //           throw new Error("Wallet not found");
    //         }

    //         const signatures = await Promise.all(
    //           mpcPayloads.map(async ({ payload }) =>
    //             wallet.signAndSendTransaction({
    //               receiverId: req.chainConfig.contract,
    //               actions: [
    //                 {
    //                   type: "FunctionCall",
    //                   params: {
    //                     methodName: "sign",
    //                     args: {
    //                       payload: Buffer.from(payload).toString("base64"),
    //                       path: req.derivationPath,
    //                     },
    //                     gas: "30000000000000",
    //                     deposit: "0",
    //                   },
    //                 },
    //               ],
    //             })
    //           )
    //         );

    //         const txHash = await cosmos.reconstructAndSendTransaction({
    //           data: req.transaction,
    //           nearAuthentication: req.nearAuthentication,
    //           path: req.derivationPath,
    //           txSerialized,
    //           mpcSignatures: signatures,
    //         });

    //         return {
    //           transactionHash: txHash,
    //           success: true,
    //         };
    //       } catch (e: unknown) {
    //         console.error(e);
    //         return {
    //           success: false,
    //           errorMessage: e instanceof Error ? e.message : String(e),
    //         };
    //       }
    //     },
    //     [walletSelector]
    //   );

    return {
        signEvmTransaction,
        sendEvmTransaction,
        // signAndSendBTCTransaction,
        // signAndSendCosmosTransaction,
    };
};
