"use client"

import { useState, useEffect, useCallback } from "react"
import { createNFTContract } from "../_contract/NFTKeysContract"
import { createMarketplaceContract } from "../_contract/NFTKeysMarketplaceContract"
import { NFTKeysContract } from "../_contract/NFTKeysContract/types"
import { NFTKeysMarketplaceContract } from "../_contract/NFTKeysMarketplaceContract/types"
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
import { NFT, FormData } from "./types"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function NFTMarketplace() {
    const { account, isLoading } = useInitNear()
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

            // Update owned NFTs with price information from sales
            const ownedNftsWithPrice = userNfts.map(nft => {
                const listedNft = listedNftsWithPrice.find(listed => listed.token_id === nft.token_id)
                if (listedNft) {
                    return {
                        ...nft,
                        price: listedNft.price,
                        token: listedNft.token
                    }
                }
                return nft
            })

            setNfts(allNfts)
            setOwnedNfts(ownedNftsWithPrice)
            setListedNfts(listedNftsWithPrice)
            setStorageBalance(storageBalance)
            setIsRegistered(storageBalance !== null && storageBalance !== "0")
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to load marketplace data: ${error}`,
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
                title: "NFT Minted Successfully",
                description: `Your new NFT has been minted with token ID: ${tokenId}`,
                variant: "default",
            })
            await loadData()
        } catch (error) {
            toast({
                title: "Minting Failed",
                description: `There was an error minting your NFT: ${error}`,
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
            const price = data.price
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
                title: "NFT Listed Successfully",
                description: `Your NFT ${data.tokenId} has been listed for ${data.price} ${data.token.toUpperCase()}`,
                variant: "default",
            })

            await loadData()
        } catch (error) {
            toast({
                title: "Listing Failed",
                description: `There was an error listing your NFT: ${error}`,
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
                title: "NFT Purchased Successfully",
                description: `You have bought NFT ${nft.token_id} for ${nft.price} ${nft.token?.toUpperCase() || 'NEAR'}`,
                variant: "default",
            })

            await loadData()
        } catch (error) {
            toast({
                title: "Purchase Failed",
                description: `There was an error buying the NFT: ${error}`,
                variant: "destructive",
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleRemoveListing = async (nft: NFT) => {
        if (!marketplaceContract) return
        setIsProcessing(true)
        try {
            await marketplaceContract.remove_sale({
                args: {
                    nft_contract_id: process.env.NEXT_PUBLIC_NFT_KEYS_CONTRACT!,
                    token_id: nft.token_id,
                },
                amount: ONE_YOCTO_NEAR,
            })

            toast({
                title: "Listing Removed Successfully",
                description: `Your NFT ${nft.token_id} has been removed from the marketplace`,
                variant: "default",
            })

            await loadData()
        } catch (error) {
            toast({
                title: "Removal Failed",
                description: `There was an error removing your NFT listing: ${error}`,
                variant: "destructive",
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleRegisterMarketplace = async () => {
        if (!marketplaceContract) return
        setIsProcessing(true)
        try {
            const storageMinimum = await marketplaceContract.storage_minimum_balance()
            await marketplaceContract.storage_deposit({
                args: {},
                amount: storageMinimum,
            })

            toast({
                title: "Marketplace Registration Successful",
                description: "You have successfully registered to the NFT marketplace",
                variant: "default",
            })

            setIsRegistered(true)
            await loadData()
        } catch (error) {
            toast({
                title: "Registration Failed",
                description: `There was an error registering to the marketplace: ${error}`,
                variant: "destructive",
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleAddStorage = async () => {
        if (!marketplaceContract) return
        setIsProcessing(true)
        try {
            await marketplaceContract.storage_deposit({
                args: {},
                amount: parseNearAmount(depositAmount)!,
            })

            toast({
                title: "Storage Added Successfully",
                description: `You have added ${depositAmount} NEAR to your storage balance`,
                variant: "default",
            })

            await loadData()
            setDepositAmount("")
        } catch (error) {
            toast({
                title: "Storage Deposit Failed",
                description: `There was an error adding storage: ${error}`,
                variant: "destructive",
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleWithdrawStorage = async () => {
        if (!marketplaceContract) return
        setIsProcessing(true)
        try {
            await marketplaceContract.storage_withdraw({
                amount: ONE_YOCTO_NEAR,
            })

            toast({
                title: "Storage Withdrawn Successfully",
                description: `You have withdrawn ${withdrawAmount} NEAR from your storage balance`,
                variant: "default",
            })

            await loadData()
            setWithdrawAmount("")
        } catch (error) {
            toast({
                title: "Storage Withdrawal Failed",
                description: `There was an error withdrawing storage: ${error}`,
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