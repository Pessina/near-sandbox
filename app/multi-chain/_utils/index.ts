import { useAuth } from "@/providers/AuthProvider";
import { getCanonicalizedDerivationPath } from "@/utils/canonicalize";
import { FunctionCall } from "@near-js/transactions";
import { FunctionCallAction } from "@near-wallet-selector/core";
import { ethers } from "ethers";
import {
  EVMRequest,
  EVM,
  BitcoinRequest,
  CosmosRequest,
  Cosmos,
  Bitcoin,
  ChainSignaturesContract,
} from "multichain-tools";
import { MPCSignature } from "multichain-tools/src/signature/types";
import { ExecutionOutcomeWithId } from "near-api-js/lib/providers";
import { useCallback } from "react";

export const useMultiChainTransactions = () => {
  const { walletSelector } = useAuth();

  const signAndSendEVMTransaction = useCallback(
    async (req: EVMRequest) => {
      try {
        const evm = new EVM(req.chainConfig);

        const { txSerialized, mpcPayloads } =
          await evm.getMPCPayloadAndTxSerialized({
            data: req.transaction,
            nearAuthentication: req.nearAuthentication,
            path: req.derivationPath,
          });

        const wallet = await walletSelector?.wallet();
        if (!wallet) {
          throw new Error("Wallet not found");
        }

        let currentDeposit = await ChainSignaturesContract.getCurrentFee({
          networkId: "testnet",
          contract: req.chainConfig.contract,
        });

        const response = await wallet.signAndSendTransaction({
          callbackUrl: window.location.href,
          receiverId: req.chainConfig.contract,
          actions: [
            {
              type: "FunctionCall",
              params: {
                methodName: "sign",
                args: {
                  request: {
                    payload: Array.from(
                      ethers.getBytes(mpcPayloads[0].payload)
                    ),
                    path: getCanonicalizedDerivationPath(req.derivationPath),
                    key_version: 0,
                  },
                },
                gas: "300000000000000",
                deposit: currentDeposit?.toString() ?? "50",
              },
            },
          ],
        });

        console.log({ response });

        if (response) {
          const signature: string = response.receipts_outcome.reduce<string>(
            (acc: string, curr: ExecutionOutcomeWithId) => {
              if (acc) {
                return acc;
              }
              const { status } = curr.outcome;
              return (
                (typeof status === "object" &&
                  status.SuccessValue &&
                  status.SuccessValue !== "" &&
                  Buffer.from(status.SuccessValue, "base64").toString(
                    "utf-8"
                  )) ||
                ""
              );
            },
            ""
          );

          if (signature) {
            const parsedJSONSignature = JSON.parse(signature) as {
              Ok: MPCSignature;
            };

            const txHash = await evm.reconstructAndSendTransaction({
              txSerialized,
              mpcSignatures: [parsedJSONSignature.Ok],
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
    [walletSelector]
  );

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
    signAndSendEVMTransaction,
    // signAndSendBTCTransaction,
    // signAndSendCosmosTransaction,
  };
};
