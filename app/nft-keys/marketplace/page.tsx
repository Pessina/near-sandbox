"use client"

import { useState, useEffect, useCallback } from "react"
import { createNFTContract } from "../_contract/NFTKeysContract"
import { createMarketplaceContract } from "../_contract/NFTKeysMarketplaceContract"
import type { NFTKeysContract } from "../_contract/NFTKeysContract/types"
import type { NFTKeysMarketplaceContract } from "../_contract/NFTKeysMarketplaceContract/types"
import { parseNearAmount, formatNearAmount } from "near-api-js/lib/utils/format"
import { NEAR_MAX_GAS, ONE_YOCTO_NEAR } from "../_contract/constants"
import useInitNear from "@/hooks/useInitNear"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { ThemeProvider } from "next-themes"
import { NFTCard } from "./_components/NFTCard"
import type { NFT, FormData } from "./types"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Wallet, Coins, ShoppingBag, Plus, ArrowUpDown, Key } from 'lucide-react'

export default function NFTMarketplace() {
    const { account, isLoading } = useInitNear()
    const { toast } = useToast()

    const [nftContract, setNftContract] = useState<NFTKeysContract | null>(null)
    const [marketplaceContract, setMarketplaceContract] = useState<NFTKeysMarketplaceContract | null>(null)
    const [nfts, setNfts] = useState<NFT[]>([])
    const [ownedNfts, setOwnedNfts] = useState<NFT[]>([])
    const [listedNfts, setListedNfts] = useState<NFT[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [isRegistered, setIsRegistered] = useState(false)
    const [storageBalance, setStorageBalance] = useState<string | null>(null)
    const [depositAmount, setDepositAmount] = useState("")
    const [withdrawAmount, setWithdrawAmount] = useState("")

    useEffect(() => {
        if (!account) return

        const nftContract = createNFTContract({
            account,
            contractId: process.env.NEXT_PUBLIC_NFT_KEYS_CONTRACT!
        })
        setNftContract(nftContract)

        const marketplaceContract = createMarketplaceContract({
            account,
            contractId: process.env.NEXT_PUBLIC_NFT_KEYS_MARKETPLACE_CONTRACT!
        })
        setMarketplaceContract(marketplaceContract)
    }, [account])

    const showErrorToast = useCallback((title: string, error: unknown) => {
        toast({
            title,
            description: `${title}: ${error}`,
            variant: "destructive",
        })
    }, [toast])

    const showSuccessToast = useCallback((title: string, description: string) => {
        toast({
            title,
            description,
            variant: "default",
        })
    }, [toast])

    const loadData = useCallback(async () => {
        if (!nftContract || !marketplaceContract || !account) return

        try {
            const [allNfts, userNfts, sales, storageBalance] = await Promise.all([
                nftContract.nft_tokens({ from_index: "0", limit: 100 }),
                nftContract.nft_tokens_for_owner({
                    account_id: account.accountId,
                    from_index: "0",
                    limit: 100,
                }),
                marketplaceContract.get_sales_by_nft_contract_id({
                    nft_contract_id: process.env.NEXT_PUBLIC_NFT_KEYS_CONTRACT!,
                    from_index: "0",
                    limit: 100,
                }),
                marketplaceContract.storage_balance_of({ account_id: account.accountId }),
            ])

            const listedNftsWithPrice = await Promise.all(
                sales.map(async (sale) => {
                    const nft = allNfts.find((nft) => nft.token_id === sale.token_id)
                    return {
                        ...nft,
                        price: sale.sale_conditions.amount.toString(),
                        token: sale.sale_conditions.token
                    }
                })
            )

            const ownedNftsWithPrice = userNfts.map(nft => {
                const listedNft = listedNftsWithPrice.find(listed => listed.token_id === nft.token_id)
                return listedNft ? { ...nft, price: listedNft.price, token: listedNft.token } : nft
            })

            setNfts(allNfts)
            setOwnedNfts(ownedNftsWithPrice)
            setListedNfts(listedNftsWithPrice)
            setStorageBalance(storageBalance)
            setIsRegistered(storageBalance !== null && storageBalance !== "0")
        } catch (error) {
            showErrorToast("Failed to load marketplace data", error)
        }
    }, [nftContract, marketplaceContract, account, showErrorToast])

    useEffect(() => {
        loadData()
    }, [loadData])

    const withErrorHandling = useCallback(async (operation: () => Promise<void>, processingMessage: string, successMessage: string) => {
        if (isProcessing) return
        setIsProcessing(true)
        try {
            await operation()
            showSuccessToast(processingMessage, successMessage)
            await loadData()
        } catch (error) {
            showErrorToast(processingMessage, error)
        } finally {
            setIsProcessing(false)
        }
    }, [isProcessing, loadData, showSuccessToast, showErrorToast])

    const handleMint = async () => {
        if (!nftContract) return
        await withErrorHandling(
            async () => {
                await nftContract.mint()
            },
            "NFT Key Minted Successfully",
            "Your new NFT Key has been minted"
        )
    }

    const handleListNFT = async (data: FormData) => {
        if (!nftContract || !marketplaceContract) return
        if (!data.price) throw new Error("Invalid price")

        await withErrorHandling(
            async () => {
                await nftContract.nft_approve({
                    args: {
                        token_id: data.tokenId,
                        account_id: process.env.NEXT_PUBLIC_NFT_KEYS_MARKETPLACE_CONTRACT!,
                        msg: JSON.stringify({
                            sale_conditions: {
                                token: data.token,
                                amount: data.price,
                            },
                        }),
                    },
                    amount: ONE_YOCTO_NEAR,
                })
            },
            "NFT Key Listed Successfully",
            `Your NFT Key ${data.tokenId} has been listed for ${data.price} ${data.token.toUpperCase()}`
        )
    }

    const handleBuyNFT = async (nft: NFT) => {
        if (!marketplaceContract || !nft.price) return

        await withErrorHandling(
            async () => {
                await marketplaceContract.offer({
                    args: {
                        nft_contract_id: process.env.NEXT_PUBLIC_NFT_KEYS_CONTRACT!,
                        token_id: nft.token_id,
                        offer_price: {
                            token: nft.token || "near",
                            amount: Number(parseNearAmount(nft.price)),
                        },
                    },
                    amount: parseNearAmount(nft.price)!,
                    gas: NEAR_MAX_GAS,
                })
            },
            "NFT Key Purchased Successfully",
            `You have bought NFT Key ${nft.token_id} for ${nft.price} ${nft.token?.toUpperCase() || 'NEAR'}`
        )
    }

    const handleRemoveListing = async (nft: NFT) => {
        if (!marketplaceContract) return

        await withErrorHandling(
            async () => {
                await marketplaceContract.remove_sale({
                    args: {
                        nft_contract_id: process.env.NEXT_PUBLIC_NFT_KEYS_CONTRACT!,
                        token_id: nft.token_id,
                    },
                    amount: ONE_YOCTO_NEAR,
                })
                await nftContract?.nft_revoke({
                    args: {
                        token_id: nft.token_id,
                        account_id: process.env.NEXT_PUBLIC_NFT_KEYS_MARKETPLACE_CONTRACT!,
                    },
                    amount: ONE_YOCTO_NEAR
                })
            },
            "Listing Removed Successfully",
            `Your NFT Key ${nft.token_id} has been removed from the marketplace`
        )
    }

    const handleRegisterMarketplace = async () => {
        if (!marketplaceContract) return

        await withErrorHandling(
            async () => {
                const storageMinimum = await marketplaceContract.storage_minimum_balance()
                await marketplaceContract.storage_deposit({
                    args: {},
                    amount: storageMinimum,
                })
                setIsRegistered(true)
            },
            "Marketplace Registration Successful",
            "You have successfully registered to the NFT Keys marketplace"
        )
    }

    const handleAddStorage = async () => {
        if (!marketplaceContract) return

        await withErrorHandling(
            async () => {
                await marketplaceContract.storage_deposit({
                    args: {},
                    amount: parseNearAmount(depositAmount)!,
                })
                setDepositAmount("")
            },
            "Storage Added Successfully",
            `You have added ${depositAmount} NEAR to your storage balance`
        )
    }

    const handleWithdrawStorage = async () => {
        if (!marketplaceContract) return

        await withErrorHandling(
            async () => {
                await marketplaceContract.storage_withdraw({
                    amount: ONE_YOCTO_NEAR,
                })
                setWithdrawAmount("")
            },
            "Storage Withdrawn Successfully",
            `You have withdrawn ${withdrawAmount} NEAR from your storage balance`
        )
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <Skeleton className="h-12 w-12 rounded-full" />
            </div>
        )
    }

    if (!account) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <Card className="w-96">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-center">Welcome to NFT Keys</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center mb-6 text-gray-400">Connect your NEAR wallet to access the NFT Keys Marketplace.</p>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                            <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!isRegistered) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <Card className="w-96">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-center">Marketplace Registration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center mb-6 text-gray-400">Register to start trading NFT Keys on our marketplace.</p>
                        <Button onClick={handleRegisterMarketplace} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                            {isProcessing ? 'Registering...' : 'Register to Marketplace'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <div className="min-h-screen bg-gray-900 text-gray-100">
                <header className="bg-gray-800 sticky top-0 z-10">
                    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                        <h1 className="text-2xl font-bold flex items-center space-x-2">
                            <Key className="h-6 w-6 text-blue-400" />
                            <span>NFT Keys Marketplace</span>
                        </h1>
                        <div className="flex items-center space-x-4">
                            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                                <Wallet className="mr-2 h-4 w-4" /> {account.accountId}
                            </Button>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                                        <Coins className="mr-2 h-4 w-4" /> Storage: {formatNearAmount(storageBalance || "0")} NEAR
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-gray-800 text-gray-100">
                                    <DialogHeader>
                                        <DialogTitle>Manage Storage Balance</DialogTitle>
                                        <DialogDescription className="text-gray-400">Add or withdraw NEAR from your storage balance.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="deposit" className="block text-sm font-medium text-gray-300">Deposit Amount</label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <Input
                                                    type="number"
                                                    id="deposit"
                                                    placeholder="Amount in NEAR"
                                                    value={depositAmount}
                                                    onChange={(e) => setDepositAmount(e.target.value)}
                                                    className="bg-gray-700 text-gray-100 border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                                                />
                                                <Button onClick={handleAddStorage} disabled={isProcessing} className="absolute inset-y-0 right-0 px-3 flex items-center bg-blue-600 hover:bg-blue-700 text-white">
                                                    {isProcessing ? 'Processing...' : 'Add'}
                                                </Button>
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="withdraw" className="block text-sm font-medium text-gray-300">Withdraw Amount</label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <Input
                                                    type="number"
                                                    id="withdraw"
                                                    placeholder="Amount in NEAR"
                                                    value={withdrawAmount}
                                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                                    className="bg-gray-700 text-gray-100 border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                                                />
                                                <Button onClick={handleWithdrawStorage} disabled={isProcessing} className="absolute inset-y-0 right-0 px-3 flex items-center bg-blue-600 hover:bg-blue-700 text-white">
                                                    {isProcessing ? 'Processing...' : 'Withdraw'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 py-8">
                    <Tabs defaultValue="browse" className="mb-6">
                        <TabsList className="w-full mb-8 bg-gray-800 p-1 rounded-lg">
                            <TabsTrigger value="browse" className="text-lg flex-1 rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                                <ShoppingBag className="mr-2 h-5 w-5" /> Browse NFT Keys
                            </TabsTrigger>
                            <TabsTrigger value="my-nfts" className="text-lg flex-1 rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                                <Wallet className="mr-2 h-5 w-5" /> My NFT Keys
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="browse">
                            <ScrollArea className="h-[calc(100vh-200px)]">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {listedNfts.map((nft) => (
                                        <NFTCard
                                            key={nft.token_id}
                                            nft={nft}
                                            isProcessing={isProcessing}
                                            onBuy={handleBuyNFT}
                                            variant="listed"
                                        />
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                        <TabsContent value="my-nfts">
                            <ScrollArea className="h-[calc(100vh-200px)]">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    <Card className="overflow-hidden transition-all hover:shadow-lg bg-gray-800 border-gray-700">
                                        <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                                            <Plus className="h-12 w-12 mb-4 text-blue-400" />
                                            <h3 className="font-semibold text-lg mb-2 text-gray-100">Mint New NFT Key</h3>
                                            <p className="text-sm text-gray-400 text-center mb-4">Create a new NFT Key to hold funds on other chains</p>
                                            <Button onClick={handleMint} disabled={isProcessing} variant="secondary" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                                {isProcessing ? 'Minting...' : 'Mint NFT Key'}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                    {ownedNfts.map((nft) => (
                                        <NFTCard
                                            key={nft.token_id}
                                            nft={nft}
                                            isProcessing={isProcessing}
                                            onList={handleListNFT}
                                            onRemoveListing={handleRemoveListing}
                                            variant="owned"
                                        />
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </main>
            </div>
        </ThemeProvider>
    )
}