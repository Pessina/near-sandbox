"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import useInitNear from "@/hooks/useInitNear"
import { createNFTContract } from "./_contract/NFTKeysContract"
import Button from "@/components/Button"
import Input from "@/components/Input"
import Select from "@/components/Select"
import Link from "@/components/Link"
import Loader from "@/components/Loader"
import { parseNearAmount, formatNearAmount } from "near-api-js/lib/utils/format"
import { NFTKeysContract } from "./_contract/NFTKeysContract/types"
import { NEAR_MAX_GAS, ONE_YOCTO_NEAR } from "./_contract/constants"

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
  const { register, handleSubmit, watch, reset } = useForm<FormData>()
  const { account, isLoading } = useInitNear()
  const [nftContract, setNftContract] = useState<NFTKeysContract>()
  const [message, setMessage] = useState<{ type: 'success' | 'error', content: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [nfts, setNfts] = useState<any[]>([])
  const [ownedNfts, setOwnedNfts] = useState<any[]>([])
  const [storageBalance, setStorageBalance] = useState<{ total: string; available: string } | null>(null)
  const [publicKey, setPublicKey] = useState<string>('')

  const action = watch('action')

  useEffect(() => {
    if (!account) return

    const nftContract = createNFTContract({
      account,
      contractId: process.env.NEXT_PUBLIC_NFT_KEYS_CONTRACT!
    })
    setNftContract(nftContract)
  }, [account])

  useEffect(() => {
    if (!nftContract || !account) return

    const loadData = async () => {
      try {
        const [allNfts, userNfts, balance] = await Promise.all([
          nftContract.nft_tokens({}),
          nftContract.nft_tokens_for_owner({
            account_id: account.accountId,
            from_index: "0",
            limit: 100,
          }),
          nftContract.storage_balance_of({ account_id: account.accountId }),
        ])

        setNfts(allNfts)
        setOwnedNfts(userNfts)
        setStorageBalance(balance)
      } catch (error) {
        setMessage({ type: 'error', content: `Error loading data: ${error}` })
      }
    }

    loadData()
  }, [nftContract, account])


  const handleMint = async () => {
    if (!nftContract) return
    setIsProcessing(true)
    try {
      const tokenId = await nftContract.mint()
      setMessage({ type: 'success', content: `Minted token ID: ${tokenId}` })
      // Refresh NFT lists after minting
      const allNfts = await nftContract.nft_tokens({})
      setNfts(allNfts)
      if (account) {
        const userNfts = await nftContract.nft_tokens_for_owner({
          account_id: account.accountId,
          from_index: "0",
          limit: 100,
        })

        setOwnedNfts(userNfts)
      }
    } catch (error) {
      setMessage({ type: 'error', content: `Error minting: ${error}` })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGetPublicKey = async (data: FormData) => {
    if (!nftContract || !data.tokenId) return
    setIsProcessing(true)
    try {
      const key = await nftContract.ckt_public_key_for({
        args: {
          token_id: data.tokenId,
          path: data.path
        }
      })
      setPublicKey(key)
      setMessage({ type: 'success', content: `Public key retrieved` })
    } catch (error) {
      setMessage({ type: 'error', content: `Error getting public key: ${error}` })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSignHash = async (data: FormData) => {
    if (!nftContract || !data.tokenId || !data.payload) return
    setIsProcessing(true)
    try {
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
      setMessage({ type: 'success', content: `Signature: ${signature}` })
    } catch (error) {
      setMessage({ type: 'error', content: `Error signing hash: ${error}` })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApprove = async (data: FormData) => {
    if (!nftContract || !data.tokenId || !data.accountId) return
    setIsProcessing(true)
    try {
      const approvalId = await nftContract.nft_approve({
        args: {
          token_id: data.tokenId,
          account_id: data.accountId,
          msg: data.msg
        },
        amount: ONE_YOCTO_NEAR
      })
      setMessage({ type: 'success', content: `Approved with ID: ${approvalId}` })
    } catch (error) {
      setMessage({ type: 'error', content: `Error approving: ${error}` })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCheckApproval = async (data: FormData) => {
    if (!nftContract || !data.tokenId || !data.accountId) return
    setIsProcessing(true)
    try {
      const isApproved = await nftContract.nft_is_approved({
        token_id: data.tokenId,
        approved_account_id: data.accountId,
        approval_id: data.approvalId ? parseInt(data.approvalId) : undefined
      })
      setMessage({ type: 'success', content: `Approval status: ${isApproved}` })
    } catch (error) {
      setMessage({ type: 'error', content: `Error checking approval: ${error}` })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRevoke = async (data: FormData) => {
    if (!nftContract || !data.tokenId || !data.accountId) return
    setIsProcessing(true)
    try {
      await nftContract.nft_revoke({
        args: {
          token_id: data.tokenId,
          account_id: data.accountId
        },
        amount: ONE_YOCTO_NEAR
      })
      setMessage({ type: 'success', content: 'Successfully revoked approval' })
    } catch (error) {
      setMessage({ type: 'error', content: `Error revoking approval: ${error}` })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTransfer = async (data: FormData) => {
    if (!nftContract || !data.tokenId || !data.accountId) return
    setIsProcessing(true)
    try {
      await nftContract.nft_transfer({
        args: {
          receiver_id: data.accountId,
          token_id: data.tokenId,
          approval_id: data.approvalId ? parseInt(data.approvalId) : undefined,
          memo: data.memo
        },
        amount: ONE_YOCTO_NEAR
      },
      )
      setMessage({ type: 'success', content: 'Transfer successful' })
    } catch (error) {
      setMessage({ type: 'error', content: `Error transferring: ${error}` })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStorageDeposit = async (data: FormData) => {
    if (!nftContract || !data.amount || !account) return

    const amount = parseNearAmount(data.amount)

    if (!amount) return

    setIsProcessing(true)
    try {
      await nftContract.storage_deposit({ args: { account_id: account.accountId, registration_only: false }, amount })
      const balance = await nftContract.storage_balance_of({ account_id: account.accountId })
      setStorageBalance(balance)
      setMessage({ type: 'success', content: "Storage deposit successful" })
      reset()
    } catch (error) {
      setMessage({ type: 'error', content: `Error depositing storage: ${error}` })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStorageWithdraw = async (data: FormData) => {
    if (!nftContract || !data.amount) return

    const amount = parseNearAmount(data.amount)

    if (!amount) return

    setIsProcessing(true)
    try {
      await nftContract.storage_withdraw({ args: { amount }, amount: ONE_YOCTO_NEAR })
      if (account) {
        const balance = await nftContract.storage_balance_of({ account_id: account.accountId })
        setStorageBalance(balance)
      }
      setMessage({ type: 'success', content: "Storage withdrawal successful" })
    } catch (error) {
      setMessage({ type: 'error', content: `Error withdrawing storage: ${error}` })
    } finally {
      setIsProcessing(false)
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader />
      </div>
    )
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-white">Not Connected</h2>
          <p className="text-gray-300 mb-4">
            Please connect your NEAR wallet to access NFT Keys Management.
          </p>
          <Link href="#">Connect Wallet</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-white">NFT Keys Management</h1>

      {storageBalance && (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-4 text-white">Storage Balance</h2>
          <div className="text-white">
            <p>Total: {formatNearAmount(storageBalance.total)} NEAR</p>
            <p>Available: {formatNearAmount(storageBalance.available)} NEAR</p>
          </div>
        </div>
      )}

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-xl font-bold mb-4 text-white">Mint New NFT Key</h2>
        <Button onClick={handleMint} isLoading={isProcessing}>
          Mint New NFT Key
        </Button>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-xl font-bold mb-4 text-white">Your NFT Keys</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ownedNfts.map((nft, index) => (
            <div key={index} className="p-4 bg-gray-700 rounded-lg">
              <p className="text-white">Token ID: {nft.token_id}</p>
            </div>
          ))}
        </div>
        {ownedNfts.length === 0 && (
          <p className="text-gray-400">You don&apos;t own any NFT keys yet.</p>
        )}
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-xl font-bold mb-4 text-white">All NFT Keys</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nfts.map((nft, index) => (
            <div key={index} className="p-4 bg-gray-700 rounded-lg">
              <p className="text-white">Token ID: {nft.token_id}</p>
              {/* Add more NFT details as needed */}
            </div>
          ))}
        </div>
        {nfts.length === 0 && (
          <p className="text-gray-400">No NFT keys have been minted yet.</p>
        )}
      </div>


      <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-800 p-6 rounded-lg shadow-lg space-y-4">
        <h2 className="text-xl font-bold mb-4 text-white">Manage NFT Keys</h2>

        <Select
          label="Action"
          options={[
            { value: 'getPublicKey', label: 'Get Public Key' },
            { value: 'signHash', label: 'Sign Hash' },
            { value: 'approve', label: 'Approve' },
            { value: 'checkApproval', label: 'Check Approval' },
            { value: 'revoke', label: 'Revoke Approval' },
            { value: 'transfer', label: 'Transfer NFT' },
            { value: 'storageDeposit', label: 'Storage Deposit' },
            { value: 'storageWithdraw', label: 'Storage Withdraw' },
          ]}
          placeholder="Select an action"
          {...register("action", { required: true })}
          className="mb-4"
        />

        {['getPublicKey', 'signHash', 'approve', 'checkApproval', 'revoke', 'transfer'].includes(action) && (
          <Input
            label="Token ID"
            {...register("tokenId", { required: true })}
            placeholder="Enter token ID"
            className="mb-4"
          />
        )}

        {['getPublicKey', 'signHash'].includes(action) && (
          <Input
            label="Path (optional)"
            {...register("path")}
            placeholder="Enter derivation path"
            className="mb-4"
          />
        )}

        {action === 'signHash' && (
          <Input
            label="Payload (comma-separated numbers)"
            {...register("payload", { required: true })}
            placeholder="Enter payload numbers"
            className="mb-4"
          />
        )}

        {['approve', 'checkApproval', 'revoke', 'transfer'].includes(action) && (
          <Input
            label="Account ID"
            {...register("accountId", { required: true })}
            placeholder="Enter account ID"
            className="mb-4"
          />
        )}

        {['approve'].includes(action) && (
          <Input
            label="Message"
            {...register("msg")}
            placeholder="Enter message"
            className="mb-4"
          />
        )}

        {['signHash', 'checkApproval', 'transfer'].includes(action) && (
          <Input
            label="Approval ID (optional)"
            {...register("approvalId")}
            placeholder="Enter approval ID"
            className="mb-4"
          />
        )}

        {['transfer'].includes(action) && (
          <Input
            label="Memo (optional)"
            {...register("memo")}
            placeholder="Enter memo"
            className="mb-4"
          />
        )}

        {action === 'storageDeposit' && (
          <Input
            label="Storage Amount (in NEAR)"
            {...register("amount", { required: true })}
            placeholder="Enter amount for storage deposit"
            className="mb-4"
          />
        )}

        {action === 'storageWithdraw' && (
          <Input
            label="Storage Amount (in NEAR)"
            {...register("amount", { required: true })}
            placeholder="Enter amount for storage withdrawal"
            className="mb-4"
          />
        )}

        <Button type="submit" isLoading={isProcessing}>
          Submit
        </Button>
      </form>

      {publicKey && (
        <div className="mt-6 bg-gray-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold mb-2 text-white">Public Key</h3>
          <p className="text-gray-300 break-all">{publicKey}</p>
        </div>
      )}

      {message && (
        <div className={`mt-6 p-4 rounded-lg ${message.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          <p className="text-white">{message.content}</p>
        </div>
      )}
    </div>
  )
}