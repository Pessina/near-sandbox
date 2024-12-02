import { Button } from "@/components/ui/button"
import { DialogHeader, DialogFooter } from "@/components/ui/dialog"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Wallet } from 'lucide-react'
import { useState } from "react"
import { NFTListed } from "../types"
import { Chain } from "@/constants/chains"
import { getPath } from "../_utils/getPath"
import { useDeriveAddressAndPublicKey } from "@/hooks/useDeriveAddressAndPublicKey"
import { useEnv } from "@/hooks/useEnv"

interface OfferDialogProps {
    isProcessing: boolean
    onOffer: (data: { purchaseTokenId: string, offerTokenId: string, address: string }) => Promise<void>
    nftId: string
    ownedNfts?: NFTListed[]
    chain: Chain
}

export const NFTOfferDialog: React.FC<OfferDialogProps> = ({ isProcessing, onOffer, nftId, ownedNfts = [], chain }) => {
    const [offerTokenId, setOfferTokenId] = useState("")
    const { nftKeysContract } = useEnv()

    const derivedAddressAndPublicKeyListing = useDeriveAddressAndPublicKey(
        nftKeysContract,
        chain,
        getPath(offerTokenId, "")
    )

    const handleOffer = () => {
        onOffer({
            purchaseTokenId: nftId,
            offerTokenId,
            address: derivedAddressAndPublicKeyListing?.address ?? ""
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
                                <div className="space-y-2">
                                    <label htmlFor="nftKeyId" className="text-sm text-muted-foreground">
                                        Select NFT Key to offer
                                    </label>
                                    <Select value={offerTokenId} onValueChange={setOfferTokenId}>
                                        <SelectTrigger id="nftKeyId">
                                            <SelectValue placeholder="Select NFT Key" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ownedNfts.map(nft => (
                                                <SelectItem key={nft.token_id} value={nft.token_id}>
                                                    NFT Key #{nft.token_id}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleOffer} disabled={isProcessing || !offerTokenId}>
                        {isProcessing ? 'Processing...' : 'Make Offer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
