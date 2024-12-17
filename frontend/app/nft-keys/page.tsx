"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NFTKeysGrid } from "./_components/NFTKeysGrid"
import { ContractManagement } from "./_components/ContractManagement/ContractManagement"
import { useForm } from "react-hook-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2 } from 'lucide-react'
import { useKeyPairAuth } from "@/providers/KeyPairAuthProvider"
import { ManageNFTForm } from "./_components/ContractManagement/_components/ManageNFTForm"
import { useNFTContract } from "../../contracts/NFTKeysContract/useNFTContract"

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
  const [publicKey, setPublicKey] = useState<string>('')
  const { register, handleSubmit, watch } = useForm<FormData>()

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
    handleStorageWithdraw,
    nfts,
    ownedNfts,
    storageBalance,
  } = useNFTContract({
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