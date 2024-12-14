"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowRightLeft, Wallet, Loader2 } from 'lucide-react'
import { useAccount, useConnect, useSendTransaction } from 'wagmi'
import { parseEther, encodeAbiParameters } from 'viem'
import { useForm } from "react-hook-form"
import { metaMask } from 'wagmi/connectors'
import { Badge } from "@/components/ui/badge"
import { Chain, CHAINS } from "@/constants/chains"

type FormData = {
    amount: string
    bridgeAddress: string
    toAddress: string
    sourceChain: Chain
    destChain: Chain
}
import type { UseSendTransactionParameters } from 'wagmi'
import type { Config } from '@wagmi/core'

interface BridgeProps {
    onSuccess: NonNullable<UseSendTransactionParameters<Config>['mutation']>['onSuccess'];
    onError: NonNullable<UseSendTransactionParameters<Config>['mutation']>['onError'];
}

export default function Bridge({ onSuccess, onError }: BridgeProps) {
    const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            sourceChain: Chain.ETH,
            destChain: Chain.BTC
        }
    })
    const { toast } = useToast()
    const { address, isConnected } = useAccount()
    const { connect, isPending: isConnectPending } = useConnect()
    const formValues = watch()

    const { sendTransaction, isPending } = useSendTransaction({
        mutation: {
            onSuccess,
            onError
        }
    })

    const onSubmit = async (data: FormData) => {
        if (!isConnected) {
            const error = new Error("Please connect your wallet first.")
            toast({
                title: "Wallet Not Connected",
                description: error.message,
                variant: "destructive",
            })
            throw error
        }

        const encodedData = encodeAbiParameters(
            [
                { name: 'to', type: 'string' },
                { name: 'chain', type: 'uint256' }
            ],
            [data.toAddress, BigInt(CHAINS[data.destChain].slip44)]
        )

        sendTransaction({
            to: data.bridgeAddress as `0x${string}`,
            value: parseEther(data.amount),
            data: encodedData,
            chainId: 11155111
        })
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="text-2xl font-bold">Cross-Chain Bridge</CardTitle>
                <CardDescription>Transfer your assets securely across blockchains</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {!isConnected ? (
                    <Button
                        onClick={() => connect({ connector: metaMask() })}
                        disabled={isConnectPending}
                        className="w-full"
                    >
                        <Wallet className="mr-2 h-4 w-4" /> Connect MetaMask
                    </Button>
                ) : (
                    <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
                        <span className="text-sm font-medium">Connected Wallet</span>
                        <Badge variant="secondary">
                            {address?.slice(0, 6)}...{address?.slice(-4)}
                        </Badge>
                    </div>
                )}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">From</label>
                            <Select
                                value={formValues.sourceChain}
                                onValueChange={(value) => register("sourceChain").onChange({ target: { value: value as Chain } })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Source Chain" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={Chain.ETH}>{CHAINS[Chain.ETH].name}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">To</label>
                            <Select
                                value={formValues.destChain}
                                onValueChange={(value) => register("destChain").onChange({ target: { value: value as Chain } })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Destination Chain" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={Chain.BTC}>{CHAINS[Chain.BTC].name}</SelectItem>
                                    <SelectItem value={Chain.OSMOSIS}>{CHAINS[Chain.OSMOSIS].name}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="bridgeAddress" className="text-sm font-medium mb-1 block">Bridge Address</label>
                        <Input
                            id="bridgeAddress"
                            {...register("bridgeAddress", { required: "Bridge address is required" })}
                            type="text"
                            placeholder="0x..."
                        />
                        {errors.bridgeAddress && (
                            <p className="text-sm text-red-500 mt-1">{errors.bridgeAddress.message}</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="toAddress" className="text-sm font-medium mb-1 block">Recipient Address</label>
                        <Input
                            id="toAddress"
                            {...register("toAddress", { required: "To address is required" })}
                            type="text"
                            placeholder="Destination address"
                        />
                        {errors.toAddress && (
                            <p className="text-sm text-red-500 mt-1">{errors.toAddress.message}</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="amount" className="text-sm font-medium mb-1 block">Amount</label>
                        <Input
                            id="amount"
                            {...register("amount", {
                                required: "Amount is required",
                                pattern: {
                                    value: /^[0-9]*\.?[0-9]*$/,
                                    message: "Please enter a valid number"
                                }
                            })}
                            type="text"
                            placeholder="0.0"
                        />
                        {errors.amount && (
                            <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
                        )}
                    </div>
                    <Button type="submit" disabled={!isConnected || isPending} className="w-full">
                        {isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                        )}
                        Initiate Bridge
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}