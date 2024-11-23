"use client"

import { useState, useEffect, useCallback } from "react"
import { createNFTContract } from "../_contract/NFTKeysContract"
import { createMarketplaceContract } from "../_contract/NFTKeysMarketplaceContract"
import { NFTKeysContract } from "../_contract/NFTKeysContract/types"
import { NFTKeysMarketplaceContract } from "../_contract/NFTKeysMarketplaceContract/types"
import { parseNearAmount } from "near-api-js/lib/utils/format"
import { NEAR_MAX_GAS, ONE_YOCTO_NEAR } from "../_contract/constants"
import useInitNear from "@/hooks/useInitNear"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { useTheme, ThemeProvider as NextThemesProvider } from "next-themes"
import { NFTCard } from "./_components/NFTCard"
import { NFT, FormData } from "./types"

export default function NFTMarketplace() {
    const { account, isLoading } = useInitNear()
    const [nftContract, setNftContract] = useState<NFTKeysContract | null>(null)
    const [marketplaceContract, setMarketplaceContract] = useState<NFTKeysMarketplaceContract | null>(null)
    const [nfts, setNfts] = useState<NFT[]>([])
    const [ownedNfts, setOwnedNfts] = useState<NFT[]>([])
    const [listedNfts, setListedNfts] = useState<NFT[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const { toast } = useToast()
    const { setTheme } = useTheme()

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

    const loadData = useCallback(async () => {
        if (!nftContract || !marketplaceContract || !account) return

        try {
            const [allNfts, userNfts, sales] = await Promise.all([
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

            setNfts(allNfts)
            setOwnedNfts(userNfts)
            setListedNfts(listedNftsWithPrice)
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to load NFTs: ${error}`,
                variant: "destructive",
            })
        }
    }, [nftContract, marketplaceContract, account, toast])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleMint = async () => {
        if (!nftContract) return
        setIsProcessing(true)
        try {
            const tokenId = await nftContract.mint()
            toast({
                title: "Success",
                description: `Minted NFT with token ID: ${tokenId}`,
            })
            await loadData()
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to mint NFT: ${error}`,
                variant: "destructive",
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleListNFT = async (data: FormData) => {
        if (!nftContract || !marketplaceContract) return
        setIsProcessing(true)
        try {
            const price = parseNearAmount(data.price)
            if (!price) throw new Error("Invalid price")

            await nftContract.nft_approve({
                args: {
                    token_id: data.tokenId,
                    account_id: process.env.NEXT_PUBLIC_NFT_KEYS_MARKETPLACE_CONTRACT!,
                    msg: JSON.stringify({
                        sale_conditions: {
                            token: data.token,
                            amount: price,
                        },
                    }),
                },
                amount: ONE_YOCTO_NEAR,
            })

            toast({
                title: "Success",
                description: `Listed NFT ${data.tokenId} for ${data.price} ${data.token.toUpperCase()}`,
            })

            await loadData()
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to list NFT: ${error}`,
                variant: "destructive",
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleBuyNFT = async (nft: NFT) => {
        if (!marketplaceContract || !nft.price) return
        setIsProcessing(true)
        try {
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

            toast({
                title: "Success",
                description: `Bought NFT ${nft.token_id} for ${nft.price} ${nft.token?.toUpperCase() || 'NEAR'}`,
            })

            await loadData()
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to buy NFT: ${error}`,
                variant: "destructive",
            })
        } finally {
            setIsProcessing(false)
        }
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

    return (
        <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
            <div className="container mx-auto p-4 bg-background text-foreground">
                <h1 className="text-3xl font-bold mb-6">NFT Marketplace</h1>

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