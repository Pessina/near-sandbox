"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { usePublicClient } from 'wagmi'
import { decodeAbiParameters, formatEther } from 'viem'
import { Loader2, Search } from 'lucide-react'

export default function TxParser() {
    const [txHash, setTxHash] = useState('')
    const [decodedData, setDecodedData] = useState<{
        from: `0x${string}`
        to: string
        chain: number
        amount: string
    } | null>(null)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const publicClient = usePublicClient()

    const decodeTx = async () => {
        try {
            setError('')
            setDecodedData(null)
            setIsLoading(true)

            if (!txHash) {
                throw new Error('Please enter a transaction hash')
            }

            const tx = await publicClient?.getTransaction({
                hash: txHash as `0x${string}`
            })

            if (!tx?.input) {
                throw new Error('No data field found in transaction')
            }

            const decoded = decodeAbiParameters(
                [
                    { name: 'to', type: 'string' },
                    { name: 'chain', type: 'uint256' }
                ],
                tx?.input as `0x${string}`
            )

            setDecodedData({
                from: tx.from,
                to: decoded[0],
                chain: Number(decoded[1]),
                amount: formatEther(tx.value)
            })

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to decode transaction')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>Transaction Parser</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="Enter transaction hash"
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                    />
                    <Button onClick={decodeTx} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                </div>

                {error && (
                    <div className="text-sm text-red-500 p-2 bg-red-50 rounded">
                        {error}
                    </div>
                )}

                {decodedData && (
                    <div className="space-y-2 text-sm bg-muted p-4 rounded-lg">
                        <h3 className="font-semibold text-lg mb-2">Decoded Transaction</h3>
                        <div className="flex flex-col gap-2">
                            <div>
                                <span className="font-semibold block">From Address:</span>
                                <span className="text-muted-foreground break-all">{decodedData.from}</span>
                            </div>
                            <div>
                                <span className="font-semibold block">To Address:</span>
                                <span className="text-muted-foreground break-all">{decodedData.to}</span>
                            </div>
                            <div>
                                <span className="font-semibold block">Amount:</span>
                                <span className="text-muted-foreground">{decodedData.amount} ETH</span>
                            </div>
                            <div>
                                <span className="font-semibold block">Destination Chain:</span>
                                <span className="text-muted-foreground">{decodedData.chain.toString()}</span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}