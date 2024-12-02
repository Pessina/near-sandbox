"use client"

import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { createMarketplaceContract, NFTKeysMarketplaceContract } from '@/app/nft-keys/_contract/NFTKeysMarketplaceContract'
import useInitNear from '@/hooks/useInitNear'

// Contract address on Sepolia testnet
const contractAddress = "0x836656390dDcf97cd65713ef4be638DA93e2A71f"

// Parameters for _isAuthorized function
const params = "0x00000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000000000000000001"

const krnlPayload = {
    auth: "0x00000000000000000000000000000000000000000000000000000000000000a01e8087402deb673531e8f83d09263385e7b379c1d683fa5c0bf05bf2ed16bd7f00000000000000000000000000000000000000000000000000000000000001201c75481ad9dcdc512e0fba2f5ee882c0535cf5e929e725d5bb59d9e498f5104700000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000041d571e8719bd290b72889f548db7e51122fc4ec06c1a4580940e3ed5bb10087a76382d88eb9b4b4bf29391a1ab57919c33f256aa80347b93b153ef24a410f67e41b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041046102fdc32c7001fd8123765fadb6b8a4cb33e32697719bc6a928e526e6ff615a3a9a75cea05cbedb0adc4d09dfccdaf13b27c27e5c6c6a8ba934db512edbb41c00000000000000000000000000000000000000000000000000000000000000",
    kernelResponses: "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000105000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000731303030303030000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000022334b36617974374b614256534b474c526b32476739677262515735705450523743330000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    kernelParams: "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000"
}

export default function KrnlPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [decodedResponse, setDecodedResponse] = useState<{ balance: string, wallet: string } | null>(null)
    const { account } = useInitNear({ isViewOnly: false })
    const [marketplaceContract, setMarketplaceContract] = useState<NFTKeysMarketplaceContract | null>(null)

    useEffect(() => {
        if (!account) return

        const contract = createMarketplaceContract({
            account,
            contractId: process.env.NEXT_PUBLIC_NFT_KEYS_MARKETPLACE_CONTRACT!
        })
        setMarketplaceContract(contract)
    }, [account])

    const handleEthTransaction = async () => {
        try {
            setIsLoading(true)
            setError(null)

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
                console.log("ETH Transaction simulation result:", willSucceed)
            } catch (simError: any) {
                console.error("ETH Simulation failed:", simError)
                throw new Error(`ETH Simulation failed: ${simError.reason || simError.message}`)
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

            console.log("ETH Transaction sent:", tx.hash)
            const receipt = await tx.wait()
            console.log("ETH Transaction receipt:", receipt)

        } catch (error: any) {
            console.error("ETH Transaction failed:", error)
            setError(`ETH Transaction failed: ${error.reason || error.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    const handleNearTransaction = async () => {
        try {
            setIsLoading(true)
            setError(null)

            if (!marketplaceContract) {
                throw new Error("NEAR Marketplace contract not initialized")
            }

            const result = await marketplaceContract.is_krnl_authorized({
                krnl_payload: {
                    function_params: params,
                    // Hardcoded sender address because it must be ETH
                    sender: "0x4174678c78fEaFd778c1ff319D5D326701449b25",
                    auth: {
                        auth: krnlPayload.auth,
                        kernel_responses: krnlPayload.kernelResponses,
                        kernel_param_objects: krnlPayload.kernelParams
                    },
                }
            })

            console.log("NEAR Transaction result:", result)

        } catch (error: any) {
            console.error("NEAR Transaction failed:", error)
            setError(`NEAR Transaction failed: ${error.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDecodeKernelResponses = async () => {
        try {
            setIsLoading(true)
            setError(null)
            setDecodedResponse(null)

            if (!marketplaceContract) {
                throw new Error("NEAR Marketplace contract not initialized")
            }

            const result = await marketplaceContract.decode_kernel_responses({
                kernel_responses: krnlPayload.kernelResponses
            })

            console.log("Decoded kernel responses:", result)
            setDecodedResponse(result)

        } catch (error: any) {
            console.error("Decode kernel responses failed:", error)
            setError(`Decode kernel responses failed: ${error.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-4">
            <div className="flex space-x-4">
                <button
                    onClick={handleEthTransaction}
                    disabled={isLoading}
                    className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {isLoading ? 'Processing...' : 'Call ETH isAuthorized'}
                </button>

                <button
                    onClick={handleNearTransaction}
                    disabled={isLoading || !account || !marketplaceContract}
                    className="px-4 py-2 font-bold text-white bg-green-500 rounded hover:bg-green-700 disabled:opacity-50"
                >
                    {isLoading ? 'Processing...' : 'Call NEAR isAuthorized'}
                </button>

                <button
                    onClick={handleDecodeKernelResponses}
                    disabled={isLoading || !account || !marketplaceContract}
                    className="px-4 py-2 font-bold text-white bg-purple-500 rounded hover:bg-purple-700 disabled:opacity-50"
                >
                    {isLoading ? 'Processing...' : 'Decode Kernel Responses'}
                </button>
            </div>

            {error && (
                <div className="mt-4 text-red-500">
                    {error}
                </div>
            )}

            {decodedResponse && (
                <div className="mt-4 p-4 bg-gray-700 rounded">
                    <h3 className="font-bold mb-2">Decoded Response:</h3>
                    <p>Balance: {decodedResponse.balance}</p>
                    <p>Wallet: {decodedResponse.wallet}</p>
                </div>
            )}

            {!account && (
                <div className="mt-4 text-yellow-500">
                    Please connect your NEAR wallet to use NEAR features
                </div>
            )}
        </div>
    )
}
