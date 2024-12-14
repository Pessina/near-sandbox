"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowRightLeft, Wallet, Loader2 } from 'lucide-react'
import { injected, useAccount, useConnect, useSendTransaction } from 'wagmi'
import { parseEther, encodeAbiParameters } from 'viem'

const BRIDGE_ADDRESS = "0x1234567890123456789012345678901234567890" as `0x${string}`

export default function Bridge() {
    const [amount, setAmount] = useState("")
    const [token, setToken] = useState("")
    const [sourceChain, setSourceChain] = useState("")
    const [destinationChain, setDestinationChain] = useState("")
    const { toast } = useToast()
    const { address, isConnected } = useAccount()
    const { connect, isPending: isConnectPending } = useConnect()


    const { sendTransaction, isPending } = useSendTransaction({
        mutation: {
            onSuccess(data) {
                toast({
                    title: "Bridge Initiated",
                    description: `Transaction Hash: ${data}`,
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

    const handleBridge = () => {
        if (!isConnected) {
            toast({
                title: "Wallet Not Connected",
                description: "Please connect your wallet first.",
                variant: "destructive",
            })
            return
        }

        if (!amount || !token || !sourceChain || !destinationChain) {
            toast({
                title: "Incomplete Information",
                description: "Please fill in all fields.",
                variant: "destructive",
            })
            return
        }

        // Encode the destination address and chain as data
        const data = encodeAbiParameters(
            [
                { name: 'to', type: 'address' },
                { name: 'destinationChain', type: 'uint256' }
            ],
            [token as `0x${string}`, BigInt(destinationChain)]
        )

        sendTransaction({
            to: BRIDGE_ADDRESS,
            value: parseEther(amount),
            data
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
                            onClick={() => connect({ connector: injected() })}
                            disabled={isConnectPending}
                            className="w-full"
                        >
                            <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
                        </Button>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                        </div>
                    )}
                    <Select onValueChange={setSourceChain}>
                        <SelectTrigger>
                            <SelectValue placeholder="Source Chain" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">Ethereum</SelectItem>
                            <SelectItem value="56">Binance Smart Chain</SelectItem>
                            <SelectItem value="137">Polygon</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select onValueChange={setDestinationChain}>
                        <SelectTrigger>
                            <SelectValue placeholder="Destination Chain" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">Ethereum</SelectItem>
                            <SelectItem value="56">Binance Smart Chain</SelectItem>
                            <SelectItem value="137">Polygon</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        type="text"
                        placeholder="Token Address"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                    />
                    <Input
                        type="number"
                        placeholder="Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </CardContent>
                <CardFooter>
                    <Button onClick={handleBridge} disabled={!isConnected || isPending} className="w-full">
                        {isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                        )}
                        Bridge Tokens
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
