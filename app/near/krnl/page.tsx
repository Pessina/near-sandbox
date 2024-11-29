"use client"

import { useState } from 'react'
import { ethers } from 'ethers'

// Contract address on Sepolia testnet
const contractAddress = "0x836656390dDcf97cd65713ef4be638DA93e2A71f"

// Parameters for _isAuthorized function
const params = "0x00000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000000000000000001"

const krnlPayload = {
    auth: "0x00000000000000000000000000000000000000000000000000000000000000a01e8087402deb673531e8f83d09263385e7b379c1d683fa5c0bf05bf2ed16bd7f0000000000000000000000000000000000000000000000000000000000000120d31ac7417d5e29a6fc72e9e47a608447d6471841ef36e745d79533e2222e9f5100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000041d571e8719bd290b72889f548db7e51122fc4ec06c1a4580940e3ed5bb10087a76382d88eb9b4b4bf29391a1ab57919c33f256aa80347b93b153ef24a410f67e41b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000410fbe4016d44945d8ceb21e85398b6e0e75a80143ac852c00d5c03886e567617d1efdb86dc5e9f3077361d07068fb66ddd2336dfe5488971a83519faba7378dce1b00000000000000000000000000000000000000000000000000000000000000",
    kernelResponses: "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000105000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000731303030303030000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000022334b36617974374b614256534b474c526b32476739677262515735705450523743330000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    kernelParams: "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000"
}

export default function KrnlPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [events, setEvents] = useState<any[]>([])

    const handleTransaction = async () => {
        try {
            setIsLoading(true)
            setError(null)
            setEvents([])

            if (!window.ethereum) {
                throw new Error("Please install MetaMask")
            }

            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' })

            // Create provider and signer
            const provider = new ethers.BrowserProvider(window.ethereum)
            const signer = await provider.getSigner()

            // Create contract interface with all the events
            const abi = [
                "function _isAuthorized(tuple(bytes auth, bytes kernelResponses, bytes kernelParams) memory payload, bytes memory functionParams) public returns (bool)",
            ]
            const contract = new ethers.Contract(contractAddress, abi, signer)
            // Add other event listeners as needed

            // Try to simulate the transaction first
            try {
                const willSucceed = await contract._isAuthorized(
                    {
                        auth: krnlPayload.auth,
                        kernelResponses: krnlPayload.kernelResponses,
                        kernelParams: krnlPayload.kernelParams
                    },
                    params
                )
                console.log("Transaction simulation result:", willSucceed)
            } catch (simError: any) {
                console.error("Simulation failed:", simError)
                throw new Error(`Simulation failed: ${simError.reason || simError.message}`)
            }

            // Proceed with actual transaction
            const tx = await contract._isAuthorized(
                {
                    auth: krnlPayload.auth,
                    kernelResponses: krnlPayload.kernelResponses,
                    kernelParams: krnlPayload.kernelParams
                },
                params
            )

            console.log("Transaction sent:", tx.hash)
            const receipt = await tx.wait()
            console.log("Transaction receipt:", receipt)

        } catch (error: any) {
            console.error("Transaction failed:", error)
            setError(`Transaction failed: ${error.reason || error.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <button
                onClick={handleTransaction}
                disabled={isLoading}
                className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {isLoading ? 'Processing...' : 'Call isAuthorized'}
            </button>
            {error && (
                <div className="mt-4 text-red-500">
                    {error}
                </div>
            )}
        </div>
    )
}
