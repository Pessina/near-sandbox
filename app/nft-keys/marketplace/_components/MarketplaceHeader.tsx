import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Coins } from 'lucide-react'
import { formatNearAmount } from "near-api-js/lib/utils/format"

interface MarketplaceHeaderProps {
    storageBalance: string | null
    depositAmount: string
    isProcessing: boolean
    onDepositAmountChange: (value: string) => void
    onAddStorage: () => void
    onWithdrawStorage: () => void
}

export function MarketplaceHeader({
    storageBalance,
    depositAmount,
    isProcessing,
    onDepositAmountChange,
    onAddStorage,
    onWithdrawStorage
}: MarketplaceHeaderProps) {
    return (
        <header className="flex justify-end mb-6">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" className="min-w-[200px]">
                        <Coins className="mr-2 h-4 w-4" />
                        <span className="flex-1 text-left">
                            {formatNearAmount(storageBalance || "0")} NEAR
                        </span>
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
        </header>
    )
}