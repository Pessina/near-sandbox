import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Wallet, Coins, Key } from 'lucide-react'
import { formatNearAmount } from "near-api-js/lib/utils/format"

interface MarketplaceHeaderProps {
    accountId: string
    storageBalance: string | null
    depositAmount: string
    withdrawAmount: string
    isProcessing: boolean
    onDepositAmountChange: (value: string) => void
    onWithdrawAmountChange: (value: string) => void
    onAddStorage: () => void
    onWithdrawStorage: () => void
}

export function MarketplaceHeader({
    accountId,
    storageBalance,
    depositAmount,
    withdrawAmount,
    isProcessing,
    onDepositAmountChange,
    onWithdrawAmountChange,
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
                                <label className="text-sm font-medium">Deposit Amount</label>
                                <div className="mt-1 relative rounded-md">
                                    <Input
                                        type="number"
                                        placeholder="Amount in NEAR"
                                        value={depositAmount}
                                        onChange={(e) => onDepositAmountChange(e.target.value)}
                                    />
                                    <Button onClick={onAddStorage} disabled={isProcessing} className="absolute inset-y-0 right-0">
                                        {isProcessing ? 'Processing...' : 'Add'}
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Withdraw Amount</label>
                                <div className="mt-1 relative rounded-md">
                                    <Input
                                        type="number"
                                        placeholder="Amount in NEAR"
                                        value={withdrawAmount}
                                        onChange={(e) => onWithdrawAmountChange(e.target.value)}
                                    />
                                    <Button onClick={onWithdrawStorage} disabled={isProcessing} className="absolute inset-y-0 right-0">
                                        {isProcessing ? 'Processing...' : 'Withdraw'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </header>
    )
} 