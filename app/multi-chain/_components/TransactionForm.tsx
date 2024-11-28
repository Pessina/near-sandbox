import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Chain } from '../../../constants/chains';
import { ethers } from "ethers";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMultiChainTransaction } from '../../../hooks/useMultiChainTransaction';
import { getCanonicalizedDerivationPath } from '@/lib/canonicalize';
import { useDeriveAddressAndPublicKey } from '../../../hooks/useDeriveAddressAndPublicKey';
import { useAuth } from '@/providers/AuthProvider';
import { getPath } from '../_utils/getPath';

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
    const { toast } = useToast();
    const { signEvmTransaction, signBtcTransaction, signCosmosTransaction } = useMultiChainTransaction();
    const { accountId } = useAuth();
    const addressAndPublicKey = useDeriveAddressAndPublicKey(accountId ?? '', chain, getPath(chain, derivedPath));

    const onSubmit = async (data: Transaction) => {
        setIsSendingTransaction(true);

        try {
            let res: any;
            switch (chain) {
                // case Chain.BNB:
                case Chain.ETH:
                    res = await signEvmTransaction(
                        {
                            from: addressAndPublicKey?.address ?? '',
                            to: data.to,
                            value: ethers.parseEther(data.value).toString(),
                            ...(data.data && { data: data.data })
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
                case Chain.BTC:
                    res = await signBtcTransaction(
                        {
                            from: addressAndPublicKey?.address ?? '',
                            publicKey: addressAndPublicKey?.publicKey ?? '',
                            to: data.to,
                            value: data.value
                        },
                        getCanonicalizedDerivationPath({
                            chain: 0,
                            domain: "",
                            meta: {
                                path: derivedPath,
                            }
                        })
                    );
                    break;
                case Chain.OSMOSIS:
                    res = await signCosmosTransaction(
                        {
                            address: addressAndPublicKey?.address ?? '',
                            publicKey: addressAndPublicKey?.publicKey ?? '',
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
                        getCanonicalizedDerivationPath({
                            chain: 118,
                            domain: "",
                            meta: {
                                path: derivedPath,
                            }
                        })
                    );
                    break;
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