import { Button } from "@/components/ui/button"
import { DialogHeader, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { ArrowRightLeft } from 'lucide-react'
import { useState } from "react"
import { NFTListed } from "../types"

interface NFTTransactionDialogProps {
    nft: NFTListed
    derivedAddressAndPublicKey: { address: string, publicKey: string }
    isProcessing: boolean
    onTransaction: (nft: NFTListed, derivedAddressAndPublicKey: { address: string, publicKey: string }, data: { to: string, value: string }) => Promise<void>
    path: string
    chain: string
}

export const NFTTransactionDialog: React.FC<NFTTransactionDialogProps> = ({
    nft,
    derivedAddressAndPublicKey,
    isProcessing,
    onTransaction,
    path,
    chain
}) => {
    const [to, setTo] = useState("")
    const [value, setValue] = useState("")

    const handleTransaction = () => {
        onTransaction(nft, derivedAddressAndPublicKey, {
            to,
            value
        })
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Send Transaction
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Send Transaction</DialogTitle>
                    <DialogDescription>
                        Send funds from your NFT Key on {chain} using path {path}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Transaction Details</h4>
                            <div className="grid gap-4">
                                <Input
                                    placeholder="Recipient Address"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                />
                                <Input
                                    placeholder="Amount"
                                    type="number"
                                    step="0.000001"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleTransaction} disabled={isProcessing || !to || !value}>
                        {isProcessing ? 'Processing...' : 'Send Transaction'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
