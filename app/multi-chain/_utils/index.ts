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
} from "multichain-tools";
import { nearWallet } from "multichain-tools";
import { useCallback } from "react";
import { useEVM } from "../_hooks/useEVM";
import { useBTC } from "../_hooks/useBTC";
import { useCosmos } from "../_hooks/useCosmos";

export const useMultiChainTransactions = () => {
  const { walletSelector, accountId } = useAuth();
  const { networkId, chainSignatureContract } = useEnv();
  const evm = useEVM();
  const btc = useBTC();
  const cosmos = useCosmos();

  const signAndSendEVMTransaction = useCallback(
    async (
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

        const wallet = await walletSelector?.wallet();
        if (!wallet) {
          throw new Error("Wallet not found");
        }

        const response = await wallet.signAndSendTransaction({
          callbackUrl: window.location.href,
          ...(await nearWallet.utils.mpcPayloadsToTransaction({
            networkId,
            contractId: chainSignatureContract,
            mpcPayloads,
            path,
          })),
        });

        console.log({ response });

        if (response) {
          const signature = nearWallet.utils.responseToMpcSignature({
            response,
          });

          if (signature) {
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
