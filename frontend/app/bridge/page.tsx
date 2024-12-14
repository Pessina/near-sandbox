"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowRightLeft, Wallet, Loader2 } from 'lucide-react'

// This is a placeholder ABI. Replace it with your actual bridge contract ABI
const BRIDGE_ABI = [
    "function bridge(uint256 amount, address token, uint256 destinationChainId) external",
]

const BRIDGE_ADDRESS = "0x1234567890123456789012345678901234567890" // Replace with actual bridge contract address

export default function Bridge() {
    const [isConnected, setIsConnected] = useState(false)
    const [account, setAccount] = useState("")
    const [amount, setAmount] = useState("")
    const [token, setToken] = useState("")
    const [sourceChain, setSourceChain] = useState("")
    const [destinationChain, setDestinationChain] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        checkConnection()
    }, [])

    async function checkConnection() {
        if (typeof window.ethereum !== "undefined") {
            try {
                const accounts = await window.ethereum.request({ method: "eth_accounts" })
                if (accounts.length > 0) {
                    setIsConnected(true)
                    setAccount(accounts[0])
                }
            } catch (error) {
                console.error("Failed to check wallet connection:", error)
            }
        }
    }

    async function connectWallet() {
        if (typeof window.ethereum !== "undefined") {
            try {
                await window.ethereum.request({ method: "eth_requestAccounts" })
                const accounts = await window.ethereum.request({ method: "eth_accounts" })
                setIsConnected(true)
                setAccount(accounts[0])
                toast({
                    title: "Wallet Connected",
                    description: `Connected to ${accounts[0]}`,
                })
            } catch (error) {
                console.error("Failed to connect wallet:", error)
                toast({
                    title: "Connection Failed",
                    description: "Failed to connect wallet. Please try again.",
                    variant: "destructive",
                })
            }
        } else {
            toast({
                title: "Metamask Not Detected",
                description: "Please install Metamask to use this feature.",
                variant: "destructive",
            })
        }
    }

    async function handleBridge() {
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

        setIsLoading(true)

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum)
            const signer = provider.getSigner()
            const bridgeContract = new ethers.Contract(BRIDGE_ADDRESS, BRIDGE_ABI, signer)

            const tx = await bridgeContract.bridge(
                ethers.utils.parseEther(amount),
                token,
                ethers.BigNumber.from(destinationChain)
            )

            await tx.wait()

            toast({
                title: "Bridge Successful",
                description: `Successfully bridged ${amount} tokens to chain ${destinationChain}`,
            })
        } catch (error) {
            console.error("Bridge transaction failed:", error)
            toast({
                title: "Bridge Failed",
                description: "Failed to bridge tokens. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="text-2xl font-bold">Token Bridge</CardTitle>
                <CardDescription>Bridge your tokens across different blockchains</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!isConnected ? (
                    <Button onClick={connectWallet} className="w-full">
                        <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
                    </Button>
                ) : (
                    <div className="text-sm text-muted-foreground">
                        Connected: {account.slice(0, 6)}...{account.slice(-4)}
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
                <Button onClick={handleBridge} disabled={!isConnected || isLoading} className="w-full">
                    {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                    )}
                    Bridge Tokens
                </Button>
            </CardFooter>
        </Card>
    )
}