"use client"

import type { StorageBalanceResult } from "../../_contract/NFTKeysContract/types"
import { MintNFTCard } from "../MintNFTCard"
import { StorageBalanceCard } from "./_components/StorageBalanceCard"

interface ContractManagementProps {
    onMint: () => Promise<void>
    onStorageDeposit: (amount: string) => Promise<void>
    onStorageWithdraw: (amount: string) => Promise<void>
    isProcessing: boolean
    storageBalance: StorageBalanceResult | null
}

export function ContractManagement({
    onMint,
    onStorageDeposit,
    onStorageWithdraw,
    isProcessing,
    storageBalance
}: ContractManagementProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MintNFTCard onMint={onMint} isProcessing={isProcessing || false} />
            <StorageBalanceCard
                storageBalance={storageBalance || undefined}
                onStorageDeposit={onStorageDeposit}
                onStorageWithdraw={onStorageWithdraw}
                isProcessing={isProcessing || false}
            />
        </div>
    )
}
