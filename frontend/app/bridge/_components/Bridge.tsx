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

type FormData = {
    amount: string
    bridgeAddress: string
    toAddress: string
    sourceChain: string
    destChain: string
}

export default function Bridge() {
    const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            sourceChain: "11155111",
            destChain: "1"
        }
    })
    const { toast } = useToast()
    const { address, isConnected } = useAccount()
    const { connect, isPending: isConnectPending } = useConnect()
    const formValues = watch()

    const { sendTransaction, isPending } = useSendTransaction({
        mutation: {
            onSuccess(data) {
                const explorerUrl = `https://sepolia.etherscan.io/tx/${data}`
                toast({
                    title: "Bridge Initiated",
                    description: (
                        <a
                            href={explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                        >
                            View on Explorer
                        </a>
                    ),
                })
            },
            onError(error) {
                toast({
                    title: "Bridge Failed",
                    description: error.message,
                    variant: "destructive",
                })
            },
        }
    })

    const onSubmit = (data: FormData) => {
        if (!isConnected) {
            toast({
                title: "Wallet Not Connected",
                description: "Please connect your wallet first.",
                variant: "destructive",
            })
            return
        }

        const encodedData = encodeAbiParameters(
            [
                { name: 'to', type: 'string' },
                { name: 'chain', type: 'uint256' }
            ],
            [data.toAddress, BigInt(data.destChain)]
        )

        sendTransaction({
            to: data.bridgeAddress as `0x${string}`,
            value: parseEther(data.amount),
            data: encodedData,
            chainId: 11155111
        })
    }

    return (
        <div className="grow flex flex-col items-center justify-center">
            <Card className="max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Token Bridge</CardTitle>
                    <CardDescription>Bridge your tokens across different blockchains</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!isConnected ? (
                        <Button
                            onClick={() => connect({ connector: metaMask() })}
                            disabled={isConnectPending}
                            className="w-full"
                        >
                            <Wallet className="mr-2 h-4 w-4" /> Connect MetaMask
                        </Button>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                        </div>
                    )}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Select
                            value={formValues.sourceChain}
                            onValueChange={(value) => register("sourceChain").onChange({ target: { value } })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Source Chain" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="11155111">Sepolia</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={formValues.destChain}
                            onValueChange={(value) => register("destChain").onChange({ target: { value } })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Destination Chain" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">BTC</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            {...register("bridgeAddress", { required: "Bridge address is required" })}
                            type="text"
                            placeholder="Bridge Address"
                        />
                        {errors.bridgeAddress && (
                            <p className="text-sm text-red-500">{errors.bridgeAddress.message}</p>
                        )}
                        <Input
                            {...register("toAddress", { required: "To address is required" })}
                            type="text"
                            placeholder="To Address (on destination chain)"
                        />
                        {errors.toAddress && (
                            <p className="text-sm text-red-500">{errors.toAddress.message}</p>
                        )}
                        <Input
                            {...register("amount", {
                                required: "Amount is required",
                                pattern: {
                                    value: /^[0-9]*\.?[0-9]*$/,
                                    message: "Please enter a valid number"
                                }
                            })}
                            type="text"
                            placeholder="Amount"
                        />
                        {errors.amount && (
                            <p className="text-sm text-red-500">{errors.amount.message}</p>
                        )}
                        <Button type="submit" disabled={!isConnected || isPending} className="w-full">
                            {isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <ArrowRightLeft className="mr-2 h-4 w-4" />
                            )}
                            Bridge Tokens
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
