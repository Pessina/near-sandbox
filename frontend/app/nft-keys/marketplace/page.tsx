"use client"

import { useState, useEffect } from "react"
import { createNFTContract } from "../../../contracts/NFTKeysContract"
import { createMarketplaceContract, NFTKeysMarketplaceContract } from "../../../contracts/NFTKeysMarketplaceContract"
import type { NFTKeysContract } from "../../../contracts/NFTKeysContract/types"
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
        ownedNfts,
        listedNfts,
        isRegistered,
        storageBalance
    } = useNFTMarketplace({
        nftContract,
        marketplaceContract,
        accountId: selectedAccount?.accountId
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