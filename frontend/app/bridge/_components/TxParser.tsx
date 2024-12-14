"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { usePublicClient } from 'wagmi'
import { decodeAbiParameters, formatEther } from 'viem'

export default function TxParser() {
    const [txHash, setTxHash] = useState('')
    const [decodedData, setDecodedData] = useState<{
        from: `0x${string}`
        to: string
        chain: number
        amount: string
    } | null>(null)
    const [error, setError] = useState('')
    const publicClient = usePublicClient()

    const decodeTx = async () => {
        try {
            setError('')
            setDecodedData(null)

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
        }
    }

    return (
        <Card className="w-full max-w-md">
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
                    <Button onClick={decodeTx}>Decode</Button>
                </div>

                {error && (
                    <div className="text-sm text-red-500">
                        {error}
                    </div>
                )}

                {decodedData && (
                    <div className="space-y-2 text-sm">
                        <div>
                            <span className="font-semibold">From Address:</span> {decodedData.from}
                        </div>
                        <div>
                            <span className="font-semibold">To Address:</span> {decodedData.to}
                        </div>
                        <div>
                            <span className="font-semibold">Amount:</span> {decodedData.amount} ETH
                        </div>
                        <div>
                            <span className="font-semibold">Destination Chain:</span> {decodedData.chain.toString()}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
