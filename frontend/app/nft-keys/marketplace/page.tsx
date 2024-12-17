"use client"

import { ConnectWalletCard } from "./_components/ConnectWalletCard"
import { RegisterMarketplaceCard } from "./_components/RegisterMarketplaceCard"
import { ContractManagement } from "../_components/ContractManagement/ContractManagement"
import { NFTGrid } from "./_components/NFTGrid"
import { useNFTMarketplaceContract } from "../../../contracts/NFTKeysMarketplaceContract/useNFTMarketplaceContract"
import { useKeyPairAuth } from "@/providers/KeyPairAuthProvider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingBag, Wallet } from 'lucide-react'

export default function NFTMarketplace() {
    const { selectedAccount } = useKeyPairAuth()

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
    } = useNFTMarketplaceContract({
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