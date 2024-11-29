import { Button } from "@/components/ui/button"
import { DialogHeader, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { ListPlus } from "lucide-react"
import { useState } from "react"
import { FormData } from "../types"
import { Chain } from "@/constants/chains"

interface NFTListDialogProps {
    isProcessing: boolean
    onList: (data: FormData) => Promise<void>
    tokenId: string
}

export const NFTListDialog: React.FC<NFTListDialogProps> = ({ isProcessing, onList, tokenId }) => {
    const [price, setPrice] = useState("")
    const [paymentToken, setPaymentToken] = useState(Chain.ETH)
    const [assetToken, setAssetToken] = useState(Chain.ETH)

    const handleList = () => {
        onList({
            tokenId,
            saleConditions: { token: paymentToken as Chain, amount: price },
            path: "",
            token: assetToken as Chain
        })
    }

    return (
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
                    <DialogDescription>
                        Configure the asset you&apos;re selling and how you want to receive payment.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Asset Details</h4>
                            <div className="space-y-2">
                                <label htmlFor="assetToken" className="text-sm text-muted-foreground">
                                    Select the blockchain network for your NFT Key
                                </label>
                                <Select value={assetToken} onValueChange={(value) => setAssetToken(value as Chain)}>
                                    <SelectTrigger id="assetToken">
                                        <SelectValue placeholder="Select blockchain network" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.values(Chain).map(token => (
                                            <SelectItem key={token} value={token}>
                                                {token}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Payment Details</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="price" className="text-sm text-muted-foreground">
                                        Set your listing price
                                    </label>
                                    <Input
                                        id="price"
                                        placeholder="Enter amount"
                                        type="number"
                                        step="0.1"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="paymentToken" className="text-sm text-muted-foreground">
                                        Select payment token
                                    </label>
                                    <Select value={paymentToken} onValueChange={(value) => setPaymentToken(value as Chain)}>
                                        <SelectTrigger id="paymentToken">
                                            <SelectValue placeholder="Select payment token" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.values(Chain).map(token => (
                                                <SelectItem key={token} value={token}>
                                                    {token}
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
                    <Button onClick={handleList} disabled={isProcessing || !price}>
                        {isProcessing ? 'Processing...' : 'List NFT Key'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
