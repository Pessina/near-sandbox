"use client"

import { useState, useEffect, useCallback } from "react"
import { createNFTContract } from "./_contract/NFTKeysContract"
import { NFTKeysContract } from "./_contract/NFTKeysContract/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { NFTKeysGrid } from "./_components/NFTKeysGrid"
import { ContractManagement } from "./_components/ContractManagement/ContractManagement"
import { useForm } from "react-hook-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2 } from 'lucide-react'
import { useKeyPairAuth } from "@/providers/KeyPairAuthProvider"
import { ManageNFTForm } from "./_components/ContractManagement/_components/ManageNFTForm"
import { useNFT } from "./_hooks/useNFT"

interface NFTToken {
  token_id: string
}

interface StorageBalance {
  total: string
  available: string
}

type FormData = {
  tokenId: string
  accountId: string
  amount?: string
  action: string
  path?: string
  payload?: string
  msg?: string
  approvalId?: string
  memo?: string
}

export default function NFTKeysPage() {
  const { selectedAccount } = useKeyPairAuth()
  const { toast } = useToast()
  const [nftContract, setNftContract] = useState<NFTKeysContract>()
  const [nfts, setNfts] = useState<NFTToken[]>([])
  const [ownedNfts, setOwnedNfts] = useState<NFTToken[]>([])
  const [publicKey, setPublicKey] = useState<string>('')
  const { register, handleSubmit, watch, reset } = useForm<FormData>()
  const [storageBalance, setStorageBalance] = useState<StorageBalance | null>(null)

  const loadNFTData = useCallback(async () => {
    if (!nftContract || !selectedAccount) return

    try {
      const [allNfts, userNfts] = await Promise.all([
        nftContract.nft_tokens({}),
        nftContract.nft_tokens_for_owner({
          account_id: selectedAccount.accountId,
          from_index: "0",
          limit: 100,
        })
      ])

      setNfts(allNfts)
      setOwnedNfts(userNfts)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading data",
        description: String(error)
      })
    }
  }, [nftContract, selectedAccount, toast])

  const loadStorageBalance = useCallback(async () => {
    if (!nftContract || !selectedAccount) return

    try {
      const balance = await nftContract.storage_balance_of({
        account_id: selectedAccount.accountId
      })
      setStorageBalance(balance)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading storage balance",
        description: String(error)
      })
    }
  }, [nftContract, selectedAccount, toast])

  useEffect(() => {
    loadStorageBalance()
  }, [loadStorageBalance])

  useEffect(() => {
    if (!selectedAccount) return

    const contract = createNFTContract({
      account: selectedAccount,
      contractId: process.env.NEXT_PUBLIC_NFT_KEYS_CONTRACT!
    })
    setNftContract(contract)
  }, [selectedAccount])

  useEffect(() => {
    loadNFTData()
  }, [loadNFTData])

  const {
    isProcessing,
    handleMint,
    handleGetPublicKey: getPublicKey,
    handleSignHash,
    handleApprove,
    handleCheckApproval,
    handleRevoke,
    handleRevokeAll,
    handleTransfer,
    handleStorageDeposit,
    handleStorageWithdraw
  } = useNFT({
    nftContract: nftContract ?? null,
    onSuccess: loadNFTData,
    accountId: selectedAccount?.accountId
  })

  const handleGetPublicKey = async (data: FormData) => {
    const key = await getPublicKey(data)
    if (key) {
      setPublicKey(key)
    }
  }

  const onSubmit = (data: FormData) => {
    switch (data.action) {
      case 'getPublicKey':
        handleGetPublicKey(data)
        break
      case 'signHash':
        handleSignHash(data)
        break
      case 'approve':
        handleApprove(data)
        break
      case 'checkApproval':
        handleCheckApproval(data)
        break
      case 'revoke':
        handleRevoke(data)
        break
      case 'revokeAll':
        handleRevokeAll(data)
        break
      case 'transfer':
        handleTransfer(data)
        break
    }
  }

  if (!selectedAccount) {
    return (
      <Card className="max-w-md mx-auto mt-20">
        <CardHeader>
          <CardTitle>Not Connected</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Please connect your NEAR wallet to access NFT Keys Management.
          </p>
          <Button className="w-full">Connect Wallet</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <ContractManagement
        storageBalance={storageBalance || null}
        onMint={handleMint}
        onStorageDeposit={handleStorageDeposit}
        onStorageWithdraw={handleStorageWithdraw}
        isProcessing={isProcessing}
      />

      <Card>
        <CardHeader>
          <CardTitle>Your NFT Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <NFTKeysGrid
            nfts={ownedNfts}
            emptyMessage="You don't own any NFT keys yet."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All NFT Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <NFTKeysGrid
            nfts={nfts}
            emptyMessage="No NFT keys have been minted yet."
          />
        </CardContent>
      </Card>

      <ManageNFTForm onSubmit={onSubmit} isProcessing={isProcessing} register={register} handleSubmit={handleSubmit} watch={watch} />

      {publicKey && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Public Key Retrieved</AlertTitle>
          <AlertDescription className="break-all mt-2">{publicKey}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}