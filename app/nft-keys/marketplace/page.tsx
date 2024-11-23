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
import { useTheme, ThemeProvider as NextThemesProvider } from "next-themes"
import { NFTCard } from "./_components/NFTCard"
import type { NFT, FormData } from "./types"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const NFTMarketplace = () => {
    const { account, isLoading } = useInitNear()
    const { toast } = useToast()
    const { setTheme } = useTheme()

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
        setTheme('dark')
    }, [setTheme])

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
            "NFT Minted Successfully",
            "Your new NFT has been minted"
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
            "NFT Listed Successfully",
            `Your NFT ${data.tokenId} has been listed for ${data.price} ${data.token.toUpperCase()}`
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
            "NFT Purchased Successfully",
            `You have bought NFT ${nft.token_id} for ${nft.price} ${nft.token?.toUpperCase() || 'NEAR'}`
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
                })
            },
            "Listing Removed Successfully",
            `Your NFT ${nft.token_id} has been removed from the marketplace`
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
            "You have successfully registered to the NFT marketplace"
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
            <div className="flex items-center justify-center h-screen">
                <Skeleton className="h-12 w-12 rounded-full" />
            </div>
        )
    }

    if (!account) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Card>
                    <CardHeader>
                        <CardTitle>Not Connected</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Please connect your NEAR wallet to access the NFT Marketplace.</p>
                    </CardContent>
                    <CardFooter>
                        <Button>Connect Wallet</Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    if (!isRegistered) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Card>
                    <CardHeader>
                        <CardTitle>Marketplace Registration Required</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>You need to register to the marketplace to start trading NFTs.</p>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleRegisterMarketplace} disabled={isProcessing}>
                            {isProcessing ? 'Registering...' : 'Register to Marketplace'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
            <div className="container mx-auto p-4 bg-background text-foreground">
                <h1 className="text-3xl font-bold mb-6">NFT Marketplace</h1>

                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Storage Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Current Balance: {formatNearAmount(storageBalance || "0")} NEAR</p>
                        <div className="flex gap-4 mt-4">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline">Add Storage</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add Storage Balance</DialogTitle>
                                        <DialogDescription>Enter the amount of NEAR to add to your storage balance.</DialogDescription>
                                    </DialogHeader>
                                    <Input
                                        type="number"
                                        placeholder="Amount in NEAR"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                    />
                                    <DialogFooter>
                                        <Button onClick={handleAddStorage} disabled={isProcessing}>
                                            {isProcessing ? 'Processing...' : 'Add Storage'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline">Withdraw Storage</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Withdraw Storage Balance</DialogTitle>
                                        <DialogDescription>Enter the amount of NEAR to withdraw from your storage balance.</DialogDescription>
                                    </DialogHeader>
                                    <Input
                                        type="number"
                                        placeholder="Amount in NEAR"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                    />
                                    <DialogFooter>
                                        <Button onClick={handleWithdrawStorage} disabled={isProcessing}>
                                            {isProcessing ? 'Processing...' : 'Withdraw Storage'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>

                <Tabs defaultValue="browse" className="mb-6">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="browse">Browse</TabsTrigger>
                        <TabsTrigger value="my-nfts">My NFTs</TabsTrigger>
                    </TabsList>
                    <TabsContent value="browse">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    </TabsContent>
                    <TabsContent value="my-nfts">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        <div className="mt-6">
                            <Button onClick={handleMint} disabled={isProcessing} className="w-full">
                                {isProcessing ? 'Processing...' : 'Mint New NFT'}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </NextThemesProvider>
    )
}

export default NFTMarketplace