"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useKeyPairAuth } from "@/providers/KeyPairAuthProvider"
import { useWalletAuth } from "@/providers/WalletAuthProvider"
import { Key, LogOut, ShoppingBag, Wallet, Layers } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState } from "react"

type PageConfig = {
    title: string
    icon: React.ReactNode
    description?: string
}

const PAGE_CONFIGS: Record<string, PageConfig> = {
    default: {
        title: "NFT Keys Management",
        icon: <Key className="h-6 w-6" />,
        description: "Manage your NFT Keys"
    },
    marketplace: {
        title: "NFT Keys Marketplace",
        icon: <ShoppingBag className="h-6 w-6" />,
        description: "Buy and sell NFT Keys"
    },
    "multi-chain": {
        title: "MultiChain Signatures",
        icon: <Layers className="h-6 w-6" />,
        description: "Manage signatures across multiple chains"
    },
    "near": {
        title: "NEAR Sign Delegate",
        icon: <Layers className="h-6 w-6" />,
        description: "Sign a delegate transaction with your NEAR account"
    },
    "bridge": {
        title: "Cross-Chain Bridge",
        icon: <Layers className="h-6 w-6" />,
        description: "Transfer assets across chains"
    }
}

export default function Header() {
    const { selectedAccount, setSelectedAccount, accounts } = useKeyPairAuth()
    const { walletSelector, accountId, fetchAccountId } = useWalletAuth()
    const pathname = usePathname()
    const [authType, setAuthType] = useState<"keypair" | "wallet">("keypair")

    const getPageConfig = (): PageConfig => {
        const pathSegments = pathname?.split('/') || []
        const pageType = pathSegments[1] // Changed from pathSegments[2] to better match URL structure
        return PAGE_CONFIGS[pageType] || PAGE_CONFIGS.default
    }

    const pageConfig = getPageConfig()

    const handleSignIn = async () => {
        const wallet = await walletSelector?.wallet('my-near-wallet')
        await wallet?.signIn({
            contractId: process.env.NEXT_PUBLIC_NFT_KEYS_CONTRACT!,
            accounts: []
        })
        await fetchAccountId()
    }

    const handleSignOut = async () => {
        const wallet = await walletSelector?.wallet('my-near-wallet')
        await wallet?.signOut()
        await fetchAccountId()
    }

    return (
        <header className="shadow-sm">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    {pageConfig.icon}
                    <div>
                        <h1 className="text-2xl font-bold">{pageConfig.title}</h1>
                        {pageConfig.description && (
                            <p className="text-sm text-muted-foreground">{pageConfig.description}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Tabs value={authType} onValueChange={(value) => setAuthType(value as "keypair" | "wallet")}>
                        <TabsList>
                            <TabsTrigger value="keypair">Keypair</TabsTrigger>
                            <TabsTrigger value="wallet">Wallet</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {authType === "keypair" ? (
                        <Select
                            onValueChange={(accountId) => {
                                const account = accounts.find(acc => acc.accountId === accountId)
                                if (account) {
                                    setSelectedAccount(account)
                                }
                            }}
                            value={selectedAccount?.accountId}
                        >
                            <SelectTrigger className="w-[250px]">
                                <SelectValue>
                                    {selectedAccount ? (
                                        <div className="flex items-center">
                                            <Wallet className="mr-2 h-4 w-4" />
                                            <span className="truncate">{selectedAccount.accountId}</span>
                                        </div>
                                    ) : (
                                        "Select account"
                                    )}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <ScrollArea>
                                    {accounts.map((acc) => (
                                        <SelectItem key={acc.accountId} value={acc.accountId}>
                                            <div className="flex items-center">
                                                <Wallet className="mr-2 h-4 w-4" />
                                                <span className="truncate">{acc.accountId}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </ScrollArea>
                            </SelectContent>
                        </Select>
                    ) : (
                        <div className="flex items-center gap-2 text-sm">
                            {walletSelector?.isSignedIn() ? (
                                <>
                                    <div className="flex items-center px-2 py-2 border rounded-md">
                                        <Wallet className="mr-2 h-4 w-4" />
                                        <span className="truncate">{accountId}</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleSignOut}
                                    >
                                        <LogOut className="h-4 w-4" />
                                    </Button>
                                </>
                            ) : (
                                <Button onClick={handleSignIn}>
                                    <Wallet className="mr-2 h-4 w-4" />
                                    Connect Wallet
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
