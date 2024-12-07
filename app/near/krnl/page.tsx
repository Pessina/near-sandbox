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
    auth: "0x00000000000000000000000000000000000000000000000000000000000000a01e8087402deb673531e8f83d09263385e7b379c1d683fa5c0bf05bf2ed16bd7f000000000000000000000000000000000000000000000000000000000000012070858b276ff8462aaff6b67840895ecc283716de038f776d8e1470fd5ae311250000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004193e1afe93bb41401ba82233a9c99ccf460297d09a798cca792442dc1ceb7f62b11cedab76702669fa2d9b4d0f85b4fa94d421c9aa3f5ca2870224b6190bbd6931c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000411d0f0a568ae287464b4fca06befaebcaa5dd8a74c1e450ecdce9e637afc2f09a622c46838682d9109dc320ee6fe6011e32dbec9c1017bbc3acd7a4a04353bbd61b00000000000000000000000000000000000000000000000000000000000000",
    kernelResponses: "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000010500000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000604765742022687474703a2f2f6c6f63616c686f73743a353530302f6170692f76312f6274632f62616c616e6365223a206469616c20746370205b3a3a315d3a353530303a20636f6e6e6563743a20636f6e6e656374696f6e2072656675736564",
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
