"use client"

import { useState, useEffect, useCallback } from "react"
import { createNFTContract } from "../_contract/NFTKeysContract"
import { createMarketplaceContract } from "../_contract/NFTKeysMarketplaceContract"
import type { NFT, NFTKeysContract } from "../_contract/NFTKeysContract/types"
import type { NFTKeysMarketplaceContract } from "../_contract/NFTKeysMarketplaceContract/types"
import { parseNearAmount } from "near-api-js/lib/utils/format"
import { ONE_YOCTO_NEAR } from "../_contract/constants"
import useInitNear from "@/hooks/useInitNear"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingBag, Wallet } from 'lucide-react'
import type { NFTListed } from "./types"
import { ConnectWalletCard } from "./_components/ConnectWalletCard"
import { RegisterMarketplaceCard } from "./_components/RegisterMarketplaceCard"
import { MarketplaceHeader } from "./_components/MarketplaceHeader"
import { NFTGrid } from "./_components/NFTGrid"
import { useNFTMarketplace } from "./_hooks/useNFTMarketplace";

export default function NFTMarketplace() {
    const { account, isLoading } = useInitNear({
        isViewOnly: false,
    })
    const { toast } = useToast()

    const [nftContract, setNftContract] = useState<NFTKeysContract | null>(null)
    const [marketplaceContract, setMarketplaceContract] = useState<NFTKeysMarketplaceContract | null>(null)
    const [ownedNfts, setOwnedNfts] = useState<NFT[]>([])
    const [listedNfts, setListedNfts] = useState<NFTListed[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [isRegistered, setIsRegistered] = useState(false)
    const [storageBalance, setStorageBalance] = useState<string | null>(null)
    const [depositAmount, setDepositAmount] = useState("")

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

            const listedNftsWithPrice: NFTListed[] = await Promise.all(
                sales.map(async (sale) => {
                    const nft = allNfts.find((nft) => nft.token_id === sale.token_id)
                    if (!nft || !sale) return null
                    return {
                        ...nft,
                        approved_account_ids: nft.approved_account_ids,
                        saleConditions: {
                            amount: sale.sale_conditions.amount.toString(),
                            token: sale.sale_conditions.token || '',
                        },
                        token: sale.token,
                        path: sale.path
                    }
                })
            ).then(results => results.flatMap((item) => item !== null ? [item] : []))

            const ownedNftsWithPrice = userNfts
                .filter(nft => nft.owner_id === account.accountId)
                .map(nft => {
                    const listedNft = listedNftsWithPrice.find(listed => listed.token_id === nft.token_id)
                    return listedNft ? { ...nft, saleConditions: listedNft.saleConditions, token: listedNft.token, path: listedNft.path } : nft
                })

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

    const {
        isProcessing: nftProcessing,
        handleListNFT,
        handleOfferNFT,
        handleTransaction
    } = useNFTMarketplace({
        nftContract,
        onSuccess: loadData
    })

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
                    args: {},
                    amount: ONE_YOCTO_NEAR,
                })
            },
            "Storage Withdrawn Successfully",
            `You have withdrawn from your storage balance`
        )
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Skeleton className="h-32 w-32 rounded-full" />
            </div>
        )
    }

    if (!account) {
        return <ConnectWalletCard />
    }

    if (!isRegistered) {
        return <RegisterMarketplaceCard
            onRegister={handleRegisterMarketplace}
            isProcessing={isProcessing}
        />
    }

    return (
        <div className="container mx-auto p-4 space-y-6">
            <MarketplaceHeader
                accountId={account.accountId}
                storageBalance={storageBalance}
                depositAmount={depositAmount}
                isProcessing={isProcessing}
                onDepositAmountChange={setDepositAmount}
                onAddStorage={handleAddStorage}
                onWithdrawStorage={handleWithdrawStorage}
            />

            <Tabs defaultValue="browse">
                <TabsList className="w-full mb-8">
                    <TabsTrigger value="browse" className="flex-1">
                        <ShoppingBag className="mr-2 h-5 w-5" /> Browse NFT Keys
                    </TabsTrigger>
                    <TabsTrigger value="my-nfts" className="flex-1">
                        <Wallet className="mr-2 h-5 w-5" /> My NFT Keys
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="browse">
                    <NFTGrid
                        nfts={listedNfts}
                        variant="listed"
                        isProcessing={nftProcessing}
                        onOffer={({ purchaseTokenId, offerTokenId }) =>
                            handleOfferNFT(purchaseTokenId, offerTokenId)
                        }
                        onTransaction={handleTransaction}
                        ownedNfts={ownedNfts}
                    />
                </TabsContent>
                <TabsContent value="my-nfts">
                    <NFTGrid
                        nfts={ownedNfts}
                        variant="owned"
                        isProcessing={nftProcessing}
                        onList={handleListNFT}
                        onRemoveListing={handleRemoveListing}
                        onMint={handleMint}
                        onTransaction={handleTransaction}
                        showMintCard
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}