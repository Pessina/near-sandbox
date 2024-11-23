import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatNearAmount } from "near-api-js/lib/utils/format"

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
                <CardTitle>Storage Balance</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <p>Total: {formatNearAmount(storageBalance.total)} NEAR</p>
                    <p>Available: {formatNearAmount(storageBalance.available)} NEAR</p>
                </div>
            </CardContent>
        </Card>
    )
} 