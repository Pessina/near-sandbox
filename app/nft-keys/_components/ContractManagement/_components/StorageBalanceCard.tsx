import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatNearAmount } from "near-api-js/lib/utils/format"
import { Database } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { StorageBalanceResult } from "@/app/nft-keys/_contract/NFTKeysContract"

interface StorageBalanceCardProps {
    storageBalance?: StorageBalanceResult
    onStorageDeposit?: (amount: string) => Promise<void>
    onStorageWithdraw?: (amount: string) => Promise<void>
    isProcessing?: boolean
}

export function StorageBalanceCard({
    storageBalance,
    onStorageDeposit,
    onStorageWithdraw,
    isProcessing = false
}: StorageBalanceCardProps) {
    const [depositAmount, setDepositAmount] = useState("")

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>Storage Balance</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <p className="flex justify-between">
                            <span className="text-muted-foreground">Total:</span>
                            <span className="font-semibold">{formatNearAmount(storageBalance?.total || "0")} NEAR</span>
                        </p>
                        <p className="flex justify-between">
                            <span className="text-muted-foreground">Available:</span>
                            <span className="font-semibold">{formatNearAmount(storageBalance?.available || "0")} NEAR</span>
                        </p>
                    </div>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">
                                Manage Storage
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
                                            onChange={(e) => setDepositAmount(e.target.value)}
                                            className="flex-1 rounded-r-none"
                                        />
                                        <Button
                                            onClick={() => onStorageDeposit?.(depositAmount)}
                                            disabled={isProcessing || !depositAmount}
                                            className="rounded-l-none"
                                        >
                                            {isProcessing ? 'Processing...' : 'Add'}
                                        </Button>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => onStorageWithdraw?.(storageBalance?.available || "0")}
                                    disabled={isProcessing || !parseFloat(storageBalance?.available || "0")}
                                    variant="outline"
                                    className="w-full"
                                >
                                    {isProcessing ? 'Processing...' : 'Withdraw All Storage'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    )
}