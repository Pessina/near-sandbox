import { ScrollArea } from "@/components/ui/scroll-area"
import { NFTCard } from "./NFTCard"
import type { NFTListed } from "../types"
import { NFT } from "../../../../contracts/NFTKeysContract"
import type { ListNFTArgs, OfferNFTArgs, TransactionArgs, RemoveListingArgs } from "../_hooks/useNFTMarketplace"

interface NFTGridProps {
    nfts: NFTListed[]
    variant: "listed" | "owned"
    isProcessing: boolean
    onList?: (args: ListNFTArgs) => Promise<void>
    onRemoveListing?: (args: RemoveListingArgs) => Promise<void>
    onOffer?: (args: OfferNFTArgs) => Promise<void>
    onTransaction?: (args: TransactionArgs) => Promise<void>
    showMintCard?: boolean
    ownedNfts?: NFT[]
}

export function NFTGrid({
    nfts,
    variant,
    isProcessing,
    onList,
    onRemoveListing,
    onOffer,
    onTransaction,
    ownedNfts = []
}: NFTGridProps) {
    return (
        <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {nfts.map((nft) => (
                    <NFTCard
                        key={nft.token_id}
                        nft={nft}
                        isProcessing={isProcessing}
                        onList={onList}
                        onRemoveListing={onRemoveListing}
                        onOffer={onOffer}
                        onTransaction={onTransaction}
                        variant={variant}
                        ownedNfts={ownedNfts}
                    />
                ))}
            </div>
        </ScrollArea>
    )
}