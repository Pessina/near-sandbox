"use client"

import { useState, useEffect, useCallback } from "react"
import { createNFTContract } from "../_contract/NFTKeysContract"
import { createMarketplaceContract, NFTKeysMarketplaceContract } from "../_contract/NFTKeysMarketplaceContract"
import type { NFT, NFTKeysContract } from "../_contract/NFTKeysContract/types"
import type { NFTListed } from "./types"
import { ConnectWalletCard } from "./_components/ConnectWalletCard"
import { RegisterMarketplaceCard } from "./_components/RegisterMarketplaceCard"
import { ContractManagement } from "../_components/ContractManagement/ContractManagement"
import { NFTGrid } from "./_components/NFTGrid"
import { useNFTMarketplace } from "./_hooks/useNFTMarketplace"
import { useKeyPairAuth } from "@/providers/KeyPairAuthProvider"
import { useEnv } from "@/hooks/useEnv"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingBag, Wallet } from 'lucide-react'

export default function NFTMarketplace() {
    const { selectedAccount } = useKeyPairAuth()
    const { nftKeysContract, nftKeysMarketplaceContract } = useEnv()

    const [nftContract, setNftContract] = useState<NFTKeysContract | null>(null)
    const [marketplaceContract, setMarketplaceContract] = useState<NFTKeysMarketplaceContract | null>(null)
    const [ownedNfts, setOwnedNfts] = useState<NFT[]>([])
    const [listedNfts, setListedNfts] = useState<NFTListed[]>([])
    const [isRegistered, setIsRegistered] = useState(false)
    const [storageBalance, setStorageBalance] = useState<string | null>(null)

    useEffect(() => {
        if (!selectedAccount) return

        const nftContract = createNFTContract({
            account: selectedAccount,
            contractId: nftKeysContract
        })
        setNftContract(nftContract)

        const marketplaceContract = createMarketplaceContract({
            account: selectedAccount,
            contractId: nftKeysMarketplaceContract
        })
        setMarketplaceContract(marketplaceContract)
    }, [nftKeysContract, nftKeysMarketplaceContract, selectedAccount])

    const loadData = useCallback(async () => {
        if (!nftContract || !marketplaceContract || !selectedAccount) return

        try {
            const [allNfts, userNfts, sales, storageBalance] = await Promise.all([
                nftContract.nft_tokens({ from_index: "0", limit: 100 }),
                nftContract.nft_tokens_for_owner({
                    account_id: selectedAccount.accountId,
                    from_index: "0",
                    limit: 100,
                }),
                marketplaceContract.get_sales_by_nft_contract_id({
                    nft_contract_id: process.env.NEXT_PUBLIC_NFT_KEYS_CONTRACT!,
                    from_index: "0",
                    limit: 100,
                }),
                marketplaceContract.storage_balance_of({ account_id: selectedAccount.accountId }),
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
                .filter(nft => nft.owner_id === selectedAccount.accountId)
                .map(nft => {
                    const listedNft = listedNftsWithPrice.find(listed => listed.token_id === nft.token_id)
                    return listedNft ? { ...nft, saleConditions: listedNft.saleConditions, token: listedNft.token, path: listedNft.path } : nft
                })

            setOwnedNfts(ownedNftsWithPrice)
            setListedNfts(listedNftsWithPrice)
            setStorageBalance(storageBalance)
            setIsRegistered(storageBalance !== null && storageBalance !== "0")
        } catch (error) {
            console.error("Failed to load marketplace data:", error)
        }
    }, [marketplaceContract, nftContract, selectedAccount])

    useEffect(() => {
        loadData()
    }, [loadData])

    const {
        isProcessing,
        handleListNFT,
        handleOfferNFT,
        handleTransaction,
        handleRemoveListing,
        handleRegisterMarketplace,
        handleAddStorage,
        handleWithdrawStorage,
        handleMint,
    } = useNFTMarketplace({
        nftContract,
        marketplaceContract,
        onSuccess: loadData,
    })

    if (!selectedAccount) {
        return <ConnectWalletCard />
    }

    if (!isRegistered) {
        return <RegisterMarketplaceCard
            onRegister={handleRegisterMarketplace}
            isProcessing={isProcessing}
        />
    }

    return (
        <div className="space-y-6">
            <ContractManagement
                onMint={handleMint}
                onStorageDeposit={(amount) => handleAddStorage({ amount })}
                onStorageWithdraw={handleWithdrawStorage}
                isProcessing={isProcessing}
                storageBalance={storageBalance ? {
                    total: storageBalance,
                    available: storageBalance
                } : null}
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
                        isProcessing={isProcessing}
                        onOffer={handleOfferNFT}
                        ownedNfts={ownedNfts}
                    />
                </TabsContent>
                <TabsContent value="my-nfts">
                    <NFTGrid
                        nfts={ownedNfts}
                        variant="owned"
                        isProcessing={isProcessing}
                        onList={handleListNFT}
                        onRemoveListing={handleRemoveListing}
                        onOffer={handleOfferNFT}
                        onTransaction={handleTransaction}
                        showMintCard
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}