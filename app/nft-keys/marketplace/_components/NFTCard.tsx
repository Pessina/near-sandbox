import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { NFT, FormData } from "../types"
import { Tag, ShoppingCart, XCircle, Key, Lock } from 'lucide-react'
import { NFTListDialog } from "./NFTListDialog"
import { NFTOfferDialog } from "./NFTOfferDialog"

interface NFTCardProps {
    nft: NFT
    isProcessing: boolean
    onList?: (data: FormData) => Promise<void>
    onRemoveListing?: (nft: NFT) => Promise<void>
    onOffer?: (data: { purchaseTokenId: string, offerTokenId: string, path: string }) => Promise<void>
    variant: "listed" | "owned"
}

export function NFTCard({ nft, isProcessing, onList, onRemoveListing, onOffer, variant }: NFTCardProps) {
    return (
        <Card className="overflow-hidden transition-all hover:shadow-lg">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                        <Key className="h-8 w-8 mr-2" />
                        <h3 className="font-semibold text-lg">NFT Key #{nft.token_id}</h3>
                    </div>
                    {nft.price && (
                        <Badge variant="secondary">
                            <Tag className="mr-1 h-3 w-3" />
                            {nft.price} {nft.token?.toUpperCase() || 'NEAR'}
                        </Badge>
                    )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">{nft.metadata.description || "This NFT Key holds funds on other chains"}</p>
                <div className="flex items-center text-muted-foreground text-sm">
                    <Lock className="h-4 w-4 mr-1" />
                    <span>Secure Multi-Chain Asset</span>
                </div>
            </CardContent>
            <CardFooter className="p-4 flex flex-col gap-2">
                {variant === "listed" && (
                    <>
                        {onOffer && (
                            <NFTOfferDialog
                                isProcessing={isProcessing}
                                onOffer={onOffer}
                                nftId={nft.token_id}
                            />
                        )}
                    </>
                )}
                {variant === "owned" && (
                    <>
                        {nft.price ? (
                            <Button onClick={() => onRemoveListing && onRemoveListing(nft)} disabled={isProcessing} variant="destructive" className="w-full">
                                <XCircle className="mr-2 h-4 w-4" />
                                {isProcessing ? 'Processing...' : 'Remove Listing'}
                            </Button>
                        ) : (
                            onList && <NFTListDialog
                                isProcessing={isProcessing}
                                onList={onList}
                                tokenId={nft.token_id}
                            />
                        )}
                    </>
                )}
            </CardFooter>
        </Card>
    )
}