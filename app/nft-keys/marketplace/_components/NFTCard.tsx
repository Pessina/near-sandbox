import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { NFT, FormData } from "../types"
import { ListNFTDialog } from "./ListNFTDialog"

interface NFTCardProps {
    nft: NFT
    isProcessing: boolean
    onBuy?: (nft: NFT) => void
    onList?: (data: FormData) => void
    variant: 'listed' | 'owned'
}

export function NFTCard({ nft, isProcessing, onBuy, onList, variant }: NFTCardProps) {
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>{nft.metadata.title || `NFT #${nft.token_id}`}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground mb-2">{nft.metadata.description}</p>
                {variant === 'listed' && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Avatar className="h-6 w-6 mr-2">
                                <AvatarImage src={`https://avatars.dicebear.com/api/initials/${nft.owner_id}.svg`} />
                                <AvatarFallback>{nft.owner_id[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-muted-foreground">{nft.owner_id}</span>
                        </div>
                        <Badge variant="secondary">{nft.price} {nft.token?.toUpperCase() || 'NEAR'}</Badge>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                {variant === 'listed' && onBuy && (
                    <Button onClick={() => onBuy(nft)} disabled={isProcessing} className="w-full">
                        {isProcessing ? 'Processing...' : 'Buy'}
                    </Button>
                )}
                {variant === 'owned' && onList && (
                    <ListNFTDialog nft={nft} isProcessing={isProcessing} onList={onList} />
                )}
            </CardFooter>
        </Card>
    )
} 