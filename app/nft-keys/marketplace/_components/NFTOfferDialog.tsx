import { Button } from "@/components/ui/button"
import { DialogHeader, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Wallet } from 'lucide-react'
import { useState } from "react"
import { SUPPORTED_TOKENS } from "../_constants/tokens"

interface OfferDialogProps {
    isProcessing: boolean
    onOffer: (data: { purchaseTokenId: string, offerTokenId: string, path: string }) => Promise<void>
    nftId: string
}

export const NFTOfferDialog: React.FC<OfferDialogProps> = ({ isProcessing, onOffer, nftId }) => {
    const [offerTokenId, setOfferTokenId] = useState("")
    const [path, setPath] = useState("")

    const handleOffer = () => {
        onOffer({
            purchaseTokenId: nftId,
            offerTokenId,
            path
        })
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                    <Wallet className="mr-2 h-4 w-4" />
                    Make Offer
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Make an Offer</DialogTitle>
                    <DialogDescription>
                        Select an NFT Key from your collection to make an offer.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Offer Details</h4>
                            <div className="grid gap-4">
                                <Input
                                    placeholder="NFT Key ID"
                                    value={offerTokenId}
                                    onChange={(e) => setOfferTokenId(e.target.value)}
                                />
                                <Input
                                    placeholder="Asset Path"
                                    value={path}
                                    onChange={(e) => setPath(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleOffer} disabled={isProcessing || !offerTokenId || !path}>
                        {isProcessing ? 'Processing...' : 'Make Offer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

