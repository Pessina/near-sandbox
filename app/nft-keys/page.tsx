"use client"


import { useState, useEffect, useCallback } from "react"
import { createNFTContract } from "./_contract/NFTKeysContract"
import { parseNearAmount } from "near-api-js/lib/utils/format"
import { NFTKeysContract } from "./_contract/NFTKeysContract/types"
import { NEAR_MAX_GAS, ONE_YOCTO_NEAR } from "./_contract/constants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { MintNFTCard } from "./_components/MintNFTCard"
import { NFTKeysGrid } from "./_components/NFTKeysGrid"
import { ManageNFTForm } from "./_components/ManageNFTForm"
import { useForm } from "react-hook-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, Key } from 'lucide-react'
import { useKeyPairAuth } from "@/providers/KeyPairAuthProvider"
import { StorageBalanceCard } from "./_components/StorageBalanceCard"

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
  const [isProcessing, setIsProcessing] = useState(false)
  const [nfts, setNfts] = useState<NFTToken[]>([])
  const [ownedNfts, setOwnedNfts] = useState<NFTToken[]>([])
  const [publicKey, setPublicKey] = useState<string>('')
  const { register, handleSubmit, watch, reset } = useForm<FormData>()

  const [storageBalance, setStorageBalance] = useState<StorageBalance | null>(null)

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

  useEffect(() => {
    loadNFTData()
  }, [loadNFTData])

  const handleContractAction = async (action: () => Promise<any>, successMessage: string) => {
    if (!nftContract) return
    setIsProcessing(true)
    try {
      const result = await action()
      toast({
        title: "Success",
        description: successMessage + (result ? `: ${JSON.stringify(result)}` : ''),
        duration: 5000,
      })
      await loadNFTData()
      return result
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: String(error),
        duration: 5000,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMint = async () => {
    await handleContractAction(
      async () => {
        const tokenId = await nftContract!.mint()
        return tokenId
      },
      "NFT minted successfully"
    )
  }

  const handleGetPublicKey = async (data: FormData) => {
    if (!nftContract || !data.tokenId) return
    await handleContractAction(
      async () => {
        const key = await nftContract.ckt_public_key_for({
          args: {
            token_id: data.tokenId,
            path: data.path
          }
        })
        setPublicKey(key)
        return key
      },
      "Public key retrieved"
    )
  }

  const handleSignHash = async (data: FormData) => {
    if (!nftContract || !data.tokenId || !data.payload) return
    await handleContractAction(
      async () => {
        if (!data.payload) return

        const payloadArray = data.payload.split(',').map(num => parseInt(num))
        const signature = await nftContract.ckt_sign_hash({
          args: {
            token_id: data.tokenId,
            path: data.path,
            payload: payloadArray,
            approval_id: data.approvalId ? parseInt(data.approvalId) : undefined
          },
          gas: NEAR_MAX_GAS,
          amount: parseNearAmount("0.005") ?? '0'
        })
        return signature
      },
      "Hash signed successfully"
    )
  }

  const handleApprove = async (data: FormData) => {
    if (!nftContract || !data.tokenId || !data.accountId) return
    await handleContractAction(
      async () => {
        const approvalId = await nftContract.nft_approve({
          args: {
            token_id: data.tokenId,
            account_id: data.accountId,
            msg: data.msg
          },
          amount: ONE_YOCTO_NEAR
        })
        return approvalId
      },
      "Approval successful"
    )
  }

  const handleCheckApproval = async (data: FormData) => {
    if (!nftContract || !data.tokenId || !data.accountId) return
    await handleContractAction(
      async () => {
        const isApproved = await nftContract.nft_is_approved({
          token_id: data.tokenId,
          approved_account_id: data.accountId,
          approval_id: data.approvalId ? parseInt(data.approvalId) : undefined
        })
        return isApproved
      },
      "Approval check completed"
    )
  }

  const handleRevoke = async (data: FormData) => {
    if (!nftContract || !data.tokenId || !data.accountId) return
    await handleContractAction(
      async () => {
        await nftContract.nft_revoke({
          args: {
            token_id: data.tokenId,
            account_id: data.accountId
          },
          amount: ONE_YOCTO_NEAR
        })
      },
      "Approval revoked successfully"
    )
  }

  const handleRevokeAll = async (data: FormData) => {
    if (!nftContract || !data.tokenId) return
    await handleContractAction(
      async () => {
        await nftContract.nft_revoke_all({
          args: {
            token_id: data.tokenId
          },
          amount: ONE_YOCTO_NEAR
        })
      },
      "All approvals revoked successfully"
    )
  }

  const handleTransfer = async (data: FormData) => {
    if (!nftContract || !data.tokenId || !data.accountId) return
    await handleContractAction(
      async () => {
        await nftContract.nft_transfer({
          args: {
            receiver_id: data.accountId,
            token_id: data.tokenId,
            approval_id: data.approvalId ? parseInt(data.approvalId) : undefined,
            memo: data.memo
          },
          amount: ONE_YOCTO_NEAR
        })
      },
      "Transfer successful"
    )
  }

  const handleStorageDeposit = async (data: FormData) => {
    if (!nftContract || !data.amount || !selectedAccount) return
    const amount = parseNearAmount(data.amount)
    if (!amount) return

    await handleContractAction(
      async () => {
        await nftContract.storage_deposit({
          args: {
            account_id: selectedAccount.accountId,
            registration_only: false
          },
          amount
        })
        reset()
      },
      "Storage deposit successful"
    )
  }

  const handleStorageWithdraw = async (data: FormData) => {
    if (!nftContract || !data.amount) return
    const amount = parseNearAmount(data.amount)
    if (!amount) return

    await handleContractAction(
      async () => {
        await nftContract.storage_withdraw({
          args: { amount },
          amount: ONE_YOCTO_NEAR
        })
      },
      "Storage withdrawal successful"
    )
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
      case 'storageDeposit':
        handleStorageDeposit(data)
        break
      case 'storageWithdraw':
        handleStorageWithdraw(data)
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MintNFTCard onMint={handleMint} isProcessing={isProcessing} />
        <StorageBalanceCard storageBalance={storageBalance} />
      </div>

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