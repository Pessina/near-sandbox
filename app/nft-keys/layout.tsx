"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { useKeyPairAuth } from "@/providers/KeyPairAuthProvider"
import { Key, ShoppingBag, Wallet, ChevronDown } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

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
  }
}

export default function NFTKeysLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { selectedAccount, setSelectedAccount, accounts } = useKeyPairAuth()
  const pathname = usePathname()

  const getPageConfig = (): PageConfig => {
    const pathSegments = pathname?.split('/') || []
    const pageType = pathSegments[2] // Gets the segment after /nft-keys/
    return PAGE_CONFIGS[pageType] || PAGE_CONFIGS.default
  }

  const pageConfig = getPageConfig()

  return (
    <div className="min-h-screen">
      <header className="shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {pageConfig.icon}
            <div>
              <h1 className="text-2xl font-bold">{pageConfig.title}</h1>
              {pageConfig.description && (
                <p className="text-sm">{pageConfig.description}</p>
              )}
            </div>
          </div>
          <Select
            onValueChange={(accountId) => {
              const account = accounts.find(acc => acc.accountId === accountId)
              if (account) {
                setSelectedAccount(account)
              }
            }}
            defaultValue={selectedAccount?.accountId}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select account" />
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
        </div>
      </header>
      <main className="container mx-auto p-4 space-y-6" >
        {children}
      </main>
    </div>
  )
}