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
import { useMounted } from "@/hooks/useMounted"

import type { UseSendTransactionParameters } from 'wagmi'
import type { Config } from '@wagmi/core'
import { useEnv } from "@/hooks/useEnv"
import { useBridge } from "../_hooks/useBridge"
import { createBridgeContract } from "../../../contracts/BridgeContract/BridgeContract"
import { useState, useEffect } from "react"
import { BridgeContract } from "../../../contracts/BridgeContract/types"
import { useKeyPairAuth } from "@/providers/KeyPairAuthProvider"

type FormData = {
    amount: string
    bridgeAddress: string
    toAddress: string
    sourceChain: Chain
    destChain: Chain
}

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
    const mounted = useMounted()
    const { bridgeContract } = useEnv()

    const { sendTransaction, isPending } = useSendTransaction({
        mutation: {
            onSuccess,
            onError
        }
    })
    const [bridgeContractInstance, setBridgeContractInstance] = useState<BridgeContract>()
    const { selectedAccount } = useKeyPairAuth()

    useEffect(() => {
        if (!selectedAccount) return

        const contract = createBridgeContract({
            account: selectedAccount,
            contractId: bridgeContract
        })
        setBridgeContractInstance(contract)
    }, [selectedAccount, bridgeContract])

    const { isProcessing, handleSwapBTC, handlePrepareBTCTx, isLoading, error } = useBridge({
        bridgeContract: bridgeContractInstance ?? null
    })

    const onSubmit = async (data: FormData) => {
        // if (!isConnected) {
        //     const error = new Error("Please connect your wallet first.")
        //     toast({
        //         title: "Wallet Not Connected",
        //         description: error.message,
        //         variant: "destructive",
        //     })
        //     throw error
        // }

        // const encodedData = encodeAbiParameters(
        //     [
        //         { name: 'to', type: 'string' },
        //         { name: 'chain', type: 'uint256' }
        //     ],
        //     [data.toAddress, BigInt(CHAINS[data.destChain].slip44)]
        // )

        // sendTransaction({
        //     to: data.bridgeAddress as `0x${string}`,
        //     value: parseEther(data.amount),
        //     data: encodedData,
        //     chainId: 11155111
        // })

        handleSwapBTC({
            inputUtxos: [
                {
                    txid: "b9d3e0a416120f99f178bb3d95a87173bdb51d5e38da04db0179b3124fbc5370",
                    vout: 1,
                    value: 430506,
                    script_pubkey: "00140d7d0223d302b4e8ef37050b5200b1c3306ae7ab"
                }
            ],
            outputUtxos: [
                {
                    txid: "",
                    vout: 0,
                    value: 120,
                    script_pubkey: "0014d3ae5a5de66aa44e7d5723b74e590340b3212f46"
                },
                {
                    txid: "",
                    vout: 1,
                    value: 429934,
                    script_pubkey: "00140d7d0223d302b4e8ef37050b5200b1c3306ae7ab"
                }
            ]
        })
    }

    if (!mounted) return null

    return (
        <Card className="w-full max-w-md mx-auto" >
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
                )
                }
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
            </CardContent >
        </Card >
    )
}   