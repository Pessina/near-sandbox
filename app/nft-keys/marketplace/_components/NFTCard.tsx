import { useState } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NFT, FormData } from "../types"
import { Tag, ShoppingCart, ListPlus, XCircle, Key, Lock } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
            <CardFooter className="p-4">
                {variant === "listed" && onBuy && (
                    <Button onClick={() => onBuy(nft)} disabled={isProcessing} className="w-full">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {isProcessing ? 'Processing...' : 'Buy Now'}
                    </Button>
                )}
                {variant === "owned" && (
                    <>
                        {nft.price ? (
                            <Button onClick={() => onRemoveListing && onRemoveListing(nft)} disabled={isProcessing} variant="destructive" className="w-full">
                                <XCircle className="mr-2 h-4 w-4" />
                                {isProcessing ? 'Processing...' : 'Remove Listing'}
                            </Button>
                        ) : (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full">
                                        <ListPlus className="mr-2 h-4 w-4" />
                                        List for Sale
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>List NFT Key for Sale</DialogTitle>
                                        <DialogDescription>Set the price and token for your NFT Key listing.</DialogDescription>
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
                                            <Select value={token} onValueChange={setToken}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Token" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="near">NEAR</SelectItem>
                                                    <SelectItem value="usdc">USDC</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleList} disabled={isProcessing}>
                                            {isProcessing ? 'Processing...' : 'List NFT Key'}
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