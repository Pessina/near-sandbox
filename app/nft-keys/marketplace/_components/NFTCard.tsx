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
        <Card className="overflow-hidden transition-all hover:shadow-lg bg-gray-800 border-gray-700">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                        <Key className="h-8 w-8 text-blue-400 mr-2" />
                        <h3 className="font-semibold text-lg text-gray-100">NFT Key #{nft.token_id}</h3>
                    </div>
                    {nft.price && (
                        <Badge variant="secondary" className="bg-blue-600 text-white">
                            <Tag className="mr-1 h-3 w-3" />
                            {nft.price} {nft.token?.toUpperCase() || 'NEAR'}
                        </Badge>
                    )}
                </div>
                <p className="text-sm text-gray-400 mb-4">{nft.metadata.description || "This NFT Key holds funds on other chains"}</p>
                <div className="flex items-center text-gray-400 text-sm">
                    <Lock className="h-4 w-4 mr-1" />
                    <span>Secure Multi-Chain Asset</span>
                </div>
            </CardContent>
            <CardFooter className="p-4 bg-gray-900 bg-opacity-50">
                {variant === "listed" && onBuy && (
                    <Button onClick={() => onBuy(nft)} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {isProcessing ? 'Processing...' : 'Buy Now'}
                    </Button>
                )}
                {variant === "owned" && (
                    <>
                        {nft.price ? (
                            <Button onClick={() => onRemoveListing && onRemoveListing(nft)} disabled={isProcessing} className="w-full bg-red-600 hover:bg-red-700 text-white">
                                <XCircle className="mr-2 h-4 w-4" />
                                {isProcessing ? 'Processing...' : 'Remove Listing'}
                            </Button>
                        ) : (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full border-blue-500 text-blue-400 hover:bg-blue-900 hover:text-blue-300">
                                        <ListPlus className="mr-2 h-4 w-4" />
                                        List for Sale
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-gray-800 text-gray-100">
                                    <DialogHeader>
                                        <DialogTitle>List NFT Key for Sale</DialogTitle>
                                        <DialogDescription className="text-gray-400">Set the price and token for your NFT Key listing.</DialogDescription>
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
                                                className="col-span-3 bg-gray-700 text-gray-100 border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                                            />
                                            <Select value={token} onValueChange={setToken}>
                                                <SelectTrigger className="bg-gray-700 text-gray-100 border-gray-600">
                                                    <SelectValue placeholder="Token" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-gray-800 text-gray-100 border-gray-700">
                                                    <SelectItem value="near">NEAR</SelectItem>
                                                    <SelectItem value="usdc">USDC</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleList} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white">
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