// src/components/TransactionForm.tsx
import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { Chain, chainsConfig } from '../constants/chains';
import { signAndSendBTCTransaction, signAndSendEVMTransaction, signAndSendCosmosTransaction } from "multichain-tools";
import { ethers } from "ethers";
import useInitNear from '@/hooks/useInitNear';
import { toast } from "react-toastify";
import { getExplorerUrl } from '../utils/explorer';

interface TransactionFormProps {
  chain: Chain;
  derivedPath: string;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ chain, derivedPath }) => {
  const { register, handleSubmit } = useForm<Transaction>();
  const [isSendingTransaction, setIsSendingTransaction] = useState(false);
  const { account, connection } = useInitNear();

  const onSubmit = async (data: Transaction) => {
    setIsSendingTransaction(true);

    const nearAuthentication = {
      networkId: "testnet" as const,
      keypair: await connection.config.keyStore.getKey(
        "testnet",
        process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID!
      ),
      accountId: account.accountId,
    }

    try {
      let res: any;
      switch (chain) {
        case Chain.BNB:
        case Chain.ETH:
          res = await signAndSendEVMTransaction({
            transaction: {
              to: data.to,
              value: ethers.parseEther(data.value).toString(),
            },
            chainConfig: {
              providerUrl: chain === Chain.ETH ? chainsConfig.ethereum.providerUrl : chainsConfig.bsc.providerUrl,
              contract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
            },
            nearAuthentication,
            derivationPath: {
              chain: 60,
              domain: "",
              meta: {
                path: derivedPath,
              }
            }
          });
          break;
        case Chain.BTC:
          res = await signAndSendBTCTransaction({
            chainConfig: {
              providerUrl: chainsConfig.btc.rpcEndpoint,
              contract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
              network: "testnet",
            },
            transaction: {
              to: data.to,
              value: data.value,
            },
            derivationPath: {
              chain: 0,
              domain: "",
              meta: {
                path: derivedPath,
              }
            },
            nearAuthentication,
          });
          break;
        case Chain.COSMOS:
          res = await signAndSendCosmosTransaction({
            chainConfig: {
              contract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
              chainId: chainsConfig.cosmos.chainId,
            },
            transaction: {
              messages: [
                {
                  typeUrl: "/cosmos.bank.v1beta1.MsgSend",
                  value: {
                    toAddress: data.to,
                    amount: [{ denom: "uosmo", amount: data.value }],
                  },
                },
              ],
              memo: data.data || "",
            },
            derivationPath: {
              chain: 118,
              domain: "",
              meta: {
                path: derivedPath,
              }
            },
            nearAuthentication,
          });
          break;
        default:
          throw new Error("Unsupported chain selected");
      }

      if (res.success) {
        const explorerUrl = getExplorerUrl(chain, res.transactionHash);
        toast.success(
          <div>
            Transaction successful!{' '}
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="underline">
              View on explorer
            </a>
          </div>
        );
      } else {
        toast.error(`Transaction failed: ${res.errorMessage}`);
      }
    } catch (e) {
      console.error("Transaction failed:", e);
      // You might want to show an error message to the user here
    } finally {
      setIsSendingTransaction(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Address" {...register("to")} placeholder="To Address" />
      <Input label="Value" {...register("value")} placeholder="Value" />
      <Input label="Data" {...register("data")} placeholder="0x" />
      <Button type="submit" isLoading={isSendingTransaction}>
        Send Transaction
      </Button>
    </form>
  );
};