import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Chain } from '../_constants/chains';
import { ethers } from "ethers";
import useInitNear from "@/hooks/useInitNear";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMultiChainTransaction } from '../_hooks/useMultiChainTransaction';
import { getCanonicalizedDerivationPath } from '@/lib/canonicalize';

interface TransactionFormProps {
    chain: Chain;
    derivedPath: string;
}

interface Transaction {
    to: string;
    value: string;
    data?: string;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ chain, derivedPath }) => {
    const { register, handleSubmit, formState: { errors } } = useForm<Transaction>();
    const [isSendingTransaction, setIsSendingTransaction] = useState(false);
    const { account, connection } = useInitNear();
    const { toast } = useToast();
    const { signEvmTransaction } = useMultiChainTransaction();

    const onSubmit = async (data: Transaction) => {
        setIsSendingTransaction(true);

        if (!connection || !account) {
            toast({
                title: "Error",
                description: "Connection or account not found",
                variant: "destructive",
            });
            setIsSendingTransaction(false);
            return;
        }

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
                    res = await signEvmTransaction(data.data
                        ? {
                            to: data.to,
                            value: ethers.parseEther(data.value).toString(),
                            data: data.data,
                        }
                        : {
                            to: data.to,
                            value: ethers.parseEther(data.value).toString(),
                        },
                        getCanonicalizedDerivationPath({
                            chain: 60,
                            domain: "",
                            meta: {
                                path: derivedPath,
                            }
                        })
                    );
                    break;
                // case Chain.BTC:
                //   res = await signAndSendBTCTransaction({
                //     chainConfig: {
                //       providerUrl: chainsConfig.btc.rpcEndpoint,
                //       contract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
                //       network: "testnet",
                //     },
                //     transaction: {
                //       to: data.to,
                //       value: data.value,
                //     },
                //     derivationPath: {
                //       chain: 0,
                //       domain: "",
                //       meta: {
                //         path: derivedPath,
                //       }
                //     },
                //     nearAuthentication,
                //   },
                //     nearAuthentication.keypair
                //   );
                //   break;
                // case Chain.OSMOSIS:
                //   res = await signAndSendCosmosTransaction({
                //     chainConfig: {
                //       contract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
                //       chainId: chainsConfig.osmosis.chainId,
                //     },
                //     transaction: {
                //       messages: [
                //         {
                //           typeUrl: "/cosmos.bank.v1beta1.MsgSend",
                //           value: {
                //             toAddress: data.to,
                //             amount: [{ denom: "uosmo", amount: data.value }],
                //           },
                //         },
                //       ],
                //       memo: data.data || "",
                //     },
                //     derivationPath: {
                //       chain: 118,
                //       domain: "",
                //       meta: {
                //         path: derivedPath,
                //       }
                //     },
                //     nearAuthentication,
                //   },
                //     nearAuthentication.keypair
                //   );
                //   break;
                default:
                    throw new Error("Unsupported chain selected");
            }
            toast({
                title: "Transaction Sent",
                description: "Your transaction has been successfully sent.",
                duration: 5000,
            });
            console.log(res);
        } catch (e) {
            console.error("Transaction failed:", e);
            toast({
                title: "Transaction Failed",
                description: e instanceof Error ? e.message : "An unknown error occurred",
                variant: "destructive",
                duration: 5000,
            });
        } finally {
            setIsSendingTransaction(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <label htmlFor="to" className="text-sm font-medium text-gray-200">To Address</label>
                <Input
                    id="to"
                    {...register("to", { required: "To address is required" })}
                    placeholder="Recipient Address"
                />
                {errors.to && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{errors.to.message}</AlertDescription>
                    </Alert>
                )}
            </div>

            <div className="space-y-2">
                <label htmlFor="value" className="text-sm font-medium text-gray-200">Value</label>
                <Input
                    id="value"
                    {...register("value", { required: "Value is required" })}
                    placeholder="Amount to send"
                />
                {errors.value && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{errors.value.message}</AlertDescription>
                    </Alert>
                )}
            </div>

            <div className="space-y-2">
                <label htmlFor="data" className="text-sm font-medium text-gray-200">Data (Optional)</label>
                <Input
                    id="data"
                    {...register("data")}
                    placeholder="Transaction data (0x...)"
                />
            </div>

            <Button type="submit" className="w-full" disabled={isSendingTransaction}>
                {isSendingTransaction ? "Sending..." : "Send Transaction"}
            </Button>
        </form>
    );
};