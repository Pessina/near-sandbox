import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wallet, Coins, Key } from 'lucide-react'
import { formatNearAmount } from "near-api-js/lib/utils/format"

interface MarketplaceHeaderProps {
    accountId: string
    storageBalance: string | null
    depositAmount: string
    isProcessing: boolean
    onDepositAmountChange: (value: string) => void
    onAddStorage: () => void
    onWithdrawStorage: () => void
}

export function MarketplaceHeader({
    accountId,
    storageBalance,
    depositAmount,
    isProcessing,
    onDepositAmountChange,
    onAddStorage,
    onWithdrawStorage
}: MarketplaceHeaderProps) {
    return (
        <header className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold flex items-center space-x-2">
                <Key className="h-8 w-8" />
                <span>NFT Keys Marketplace</span>
            </h1>
            <div className="flex items-center space-x-4">
                <Button variant="outline">
                    <Wallet className="mr-2 h-4 w-4" /> {accountId}
                </Button>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <Coins className="mr-2 h-4 w-4" /> Storage: {formatNearAmount(storageBalance || "0")} NEAR
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Manage Storage Balance</DialogTitle>
                            <DialogDescription>Add or withdraw NEAR from your storage balance.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="deposit-amount">Deposit Amount</Label>
                                <div className="flex mt-1">
                                    <Input
                                        id="deposit-amount"
                                        type="number"
                                        placeholder="Amount in NEAR"
                                        value={depositAmount}
                                        onChange={(e) => onDepositAmountChange(e.target.value)}
                                        className="flex-1 rounded-r-none"
                                    />
                                    <Button
                                        onClick={onAddStorage}
                                        disabled={isProcessing}
                                        className="rounded-l-none"
                                    >
                                        {isProcessing ? 'Processing...' : 'Add'}
                                    </Button>
                                </div>
                            </div>
                            <Button
                                onClick={onWithdrawStorage}
                                disabled={isProcessing}
                                variant="outline"
                                className="w-full"
                            >
                                {isProcessing ? 'Processing...' : 'Withdraw All Storage'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </header>
    )
}