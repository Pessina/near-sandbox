import { Button } from "@/components/ui/button"
import { DialogHeader, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { ArrowRightLeft, Wallet, Copy } from 'lucide-react'
import { useState, useEffect } from "react"
import { NFTListed } from "../types"
import { Chain } from "@/constants/chains"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAccountBalance } from "@/hooks/useAccountBalance"
import { useDeriveAddressAndPublicKey } from "@/hooks/useDeriveAddressAndPublicKey"
import { useEnv } from "@/hooks/useEnv"
import { getPath } from "../_utils/getPath"
import { useCopy } from "@/hooks/useCopy"
import { TransactionArgs } from "../../../../contracts/NFTKeysMarketplaceContract/useNFTMarketplaceContract"

interface NFTTransactionDialogProps {
    nft: NFTListed
    isProcessing: boolean
    onTransaction: (args: TransactionArgs) => Promise<void>
    path: string
    chain: string
}

export const NFTTransactionDialog: React.FC<NFTTransactionDialogProps> = ({
    nft,
    isProcessing,
    onTransaction,
    path,
    chain
}) => {
    const [to, setTo] = useState("")
    const [value, setValue] = useState("")
    const [selectedChain, setSelectedChain] = useState<Chain>(chain as Chain)
    const { copyToClipboard } = useCopy()

    const { nftKeysContract } = useEnv()
    const derivedAddressAndPublicKey = useDeriveAddressAndPublicKey(
        nftKeysContract,
        selectedChain,
        getPath(nft.token_id, "")
    )

    const { accountBalance, getAccountBalance } = useAccountBalance(
        selectedChain,
        derivedAddressAndPublicKey?.address ?? ''
    )

    useEffect(() => {
        if (derivedAddressAndPublicKey?.address) {
            getAccountBalance()
        }
    }, [derivedAddressAndPublicKey?.address, selectedChain, getAccountBalance])

    const handleTransaction = () => {
        if (!derivedAddressAndPublicKey) return

        onTransaction({
            nft,
            derivedAddressAndPublicKey,
            data: {
                to,
                value,
                chain: selectedChain
            }
        })
    }

    const truncateAddress = (address: string) => {
        if (!address || address.length <= 13) return address;
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
                        Send funds from your NFT Key using path {path}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Select Chain</h4>
                            <Select value={selectedChain} onValueChange={(value) => setSelectedChain(value as Chain)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select chain" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.values(Chain).map((chainValue) => (
                                        <SelectItem key={chainValue} value={chainValue}>
                                            {chainValue}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Balance</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <Button onClick={getAccountBalance} className="w-full">
                                    <Wallet className="mr-2 h-4 w-4" />
                                    Check Balance
                                </Button>
                                <Input
                                    value={accountBalance || ""}
                                    readOnly
                                    className="text-right"
                                    placeholder="Balance"
                                />
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center justify-between">
                                <span>Address: {truncateAddress(derivedAddressAndPublicKey?.address ?? '')}</span>
                                {derivedAddressAndPublicKey?.address && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(derivedAddressAndPublicKey.address)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

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
