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
    const [paymentToken, setPaymentToken] = useState("near")
    const [assetToken, setAssetToken] = useState("near")
    const [path, setPath] = useState("")

    const handleList = () => {
        onList({
            tokenId,
            saleConditions: { token: paymentToken as Chain, amount: price },
            path,
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
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    placeholder="Asset Path"
                                    value={path}
                                    onChange={(e) => setPath(e.target.value)}
                                />
                                <Select value={assetToken} onValueChange={setAssetToken}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Asset Token Type" />
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
                                <Input
                                    id="price"
                                    placeholder="Price Amount"
                                    type="number"
                                    step="0.1"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                />
                                <Select value={paymentToken} onValueChange={setPaymentToken}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Payment Token" />
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
                <DialogFooter>
                    <Button onClick={handleList} disabled={isProcessing || !price}>
                        {isProcessing ? 'Processing...' : 'List NFT Key'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
