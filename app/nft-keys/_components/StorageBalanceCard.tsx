import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatNearAmount } from "near-api-js/lib/utils/format"
import { Database } from 'lucide-react'

interface StorageBalanceCardProps {
    storageBalance: {
        total: string
        available: string
    } | null
}

export function StorageBalanceCard({ storageBalance }: StorageBalanceCardProps) {
    if (!storageBalance) return null

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>Storage Balance</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <p className="flex justify-between">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-semibold">{formatNearAmount(storageBalance.total)} NEAR</span>
                    </p>
                    <p className="flex justify-between">
                        <span className="text-muted-foreground">Available:</span>
                        <span className="font-semibold">{formatNearAmount(storageBalance.available)} NEAR</span>
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}