import { ScrollArea } from "@/components/ui/scroll-area"
import { NFTCard } from "./NFTCard"
import { Card, CardContent } from "@/components/ui/card"
import { Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import type { NFT, FormData } from "../types"

interface NFTGridProps {
    nfts: NFT[]
    variant: "listed" | "owned"
    isProcessing: boolean
    onList?: (data: FormData) => Promise<void>
    onRemoveListing?: (nft: NFT) => Promise<void>
    onOffer?: (data: { purchaseTokenId: string, offerTokenId: string, path: string }) => Promise<void>
    onMint?: () => Promise<void>
    showMintCard?: boolean
}

export function NFTGrid({
    nfts,
    variant,
    isProcessing,
    onList,
    onRemoveListing,
    onOffer,
    onMint,
    showMintCard = false
}: NFTGridProps) {
    return (
        <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {showMintCard && (
                    <Card>
                        <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                            <Plus className="h-12 w-12 mb-4" />
                            <h3 className="font-semibold text-lg mb-2">Mint New NFT Key</h3>
                            <p className="text-muted-foreground text-center mb-4">Create a new NFT Key to hold funds on other chains</p>
                            <Button onClick={onMint} disabled={isProcessing} className="w-full">
                                {isProcessing ? 'Minting...' : 'Mint NFT Key'}
                            </Button>
                        </CardContent>
                    </Card>
                )}
                {nfts.map((nft) => (
                    <NFTCard
                        key={nft.token_id}
                        nft={nft}
                        isProcessing={isProcessing}
                        onList={onList}
                        onRemoveListing={onRemoveListing}
                        onOffer={onOffer}
                        variant={variant}
                    />
                ))}
            </div>
        </ScrollArea>
    )
} 