import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NFT, FormData } from "../types"

interface NFTCardProps {
    nft: NFT
    isProcessing: boolean
    onBuy?: (nft: NFT) => Promise<void>
    onList?: (data: FormData) => Promise<void>
    onRemoveListing?: (nft: NFT) => Promise<void>
    variant: "listed" | "owned"
}

export function NFTCard({ nft, isProcessing, onBuy, onList, onRemoveListing, variant }: NFTCardProps) {
    const [price, setPrice] = useState("")
    const [token, setToken] = useState("near")

    const handleList = () => {
        if (onList) {
            onList({ tokenId: nft.token_id, price, token })
        }
    }

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>{nft.metadata.title || `NFT #${nft.token_id}`}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground mb-2">{nft.metadata.description}</p>
                <div className="flex items-center justify-between">
                    {nft.price && <Badge variant="secondary">{nft.price} {nft.token?.toUpperCase() || 'NEAR'}</Badge>}
                </div>
            </CardContent>
            <CardFooter>
                {variant === "listed" && onBuy && (
                    <Button onClick={() => onBuy(nft)} disabled={isProcessing} className="w-full">
                        {isProcessing ? 'Processing...' : 'Buy'}
                    </Button>
                )}
                {variant === "owned" && (
                    <>
                        {nft.price ? (
                            <Button onClick={() => onRemoveListing && onRemoveListing(nft)} disabled={isProcessing} className="w-full">
                                {isProcessing ? 'Processing...' : 'Remove Listing'}
                            </Button>
                        ) : (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full">List for Sale</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>List NFT for Sale</DialogTitle>
                                        <DialogDescription>Enter the price to list your NFT on the marketplace.</DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Input
                                                id="price"
                                                placeholder="Price"
                                                type="number"
                                                step="0.1"
                                                value={price}
                                                onChange={(e) => setPrice(e.target.value)}
                                                className="col-span-3"
                                            />
                                            <select
                                                value={token}
                                                onChange={(e) => setToken(e.target.value)}
                                                className="col-span-1 p-2 border rounded"
                                            >
                                                <option value="near">NEAR</option>
                                                <option value="usdc">USDC</option>
                                            </select>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleList} disabled={isProcessing}>
                                            {isProcessing ? 'Processing...' : 'List NFT'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </>
                )}
            </CardFooter>
        </Card>
    )
}