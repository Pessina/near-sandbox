"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import useInitNear from "@/hooks/useInitNear"
import { NFTKeysContractClient } from "./_contract/NFTKeysContract"
import Button from "@/components/Button"
import Input from "@/components/Input"
import Select from "@/components/Select"
import Link from "@/components/Link"
import Loader from "@/components/Loader"
import { parseNearAmount, formatNearAmount } from "near-api-js/lib/utils/format"

type FormData = {
  tokenId: string
  accountId: string
  amount?: string
  action: string
}

export default function NFTKeysPage() {
  const { register, handleSubmit, watch, reset } = useForm<FormData>()
  const { account, isLoading } = useInitNear()
  const [contractClient, setContractClient] = useState<NFTKeysContractClient>()
  const [message, setMessage] = useState<{ type: 'success' | 'error', content: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [nfts, setNfts] = useState<any[]>([])
  const [ownedNfts, setOwnedNfts] = useState<any[]>([])
  const [storageBalance, setStorageBalance] = useState<{ total: string; available: string } | null>(null)

  const action = watch('action')

  useEffect(() => {
    if (!account) return

    const client = new NFTKeysContractClient({
      account,
      contractId: process.env.NEXT_PUBLIC_NFT_KEYS_CONTRACT!
    })
    setContractClient(client)
  }, [account])

  useEffect(() => {
    if (!contractClient || !account) return

    const loadData = async () => {
      try {
        const [allNfts, userNfts, balance] = await Promise.all([
          contractClient.nftTokens({}),
          contractClient.nftTokensForOwner({
            account_id: account.accountId,
            from_index: "0",
            limit: 100,
          }),
          contractClient.getStorageBalanceOf(account.accountId),
        ])

        setNfts(allNfts)
        setOwnedNfts(userNfts)
        setStorageBalance(balance)
      } catch (error) {
        setMessage({ type: 'error', content: `Error loading data: ${error}` })
      }
    }

    loadData()
  }, [contractClient, account])

  const handleMint = async () => {
    if (!contractClient) return
    setIsProcessing(true)
    try {
      const tokenId = await contractClient.mint()
      setMessage({ type: 'success', content: `Minted token ID: ${tokenId}` })
      // Refresh NFT lists after minting
      const allNfts = await contractClient.nftTokens({})
      setNfts(allNfts)
      if (account) {
        const userNfts = await contractClient.nftTokensForOwner({
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

  const handleStorageDeposit = async (data: FormData) => {
    if (!contractClient || !data.amount || !account) return

    const amount = parseNearAmount(data.amount)

    if (!amount) return

    console.log({ amount })

    setIsProcessing(true)
    try {
      await contractClient.storageDeposit(account.accountId, false, "100000000000000", amount)
      const balance = await contractClient.getStorageBalanceOf(account.accountId)
      setStorageBalance(balance)
      setMessage({ type: 'success', content: "Storage deposit successful" })
      reset()
    } catch (error) {
      setMessage({ type: 'error', content: `Error depositing storage: ${error}` })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStorageWithdraw = async () => {
    if (!contractClient) return
    setIsProcessing(true)
    try {
      await contractClient.storageWithdraw()
      if (account) {
        const balance = await contractClient.getStorageBalanceOf(account.accountId)
        setStorageBalance(balance)
      }
      setMessage({ type: 'success', content: "Storage withdrawal successful" })
    } catch (error) {
      setMessage({ type: 'error', content: `Error withdrawing storage: ${error}` })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStorageUnregister = async () => {
    if (!contractClient) return
    setIsProcessing(true)
    try {
      await contractClient.storageUnregister({ force: true })
      setStorageBalance(null)
      setMessage({ type: 'success', content: "Storage unregistration successful" })
    } catch (error) {
      setMessage({ type: 'error', content: `Error unregistering storage: ${error}` })
    } finally {
      setIsProcessing(false)
    }
  }

  const onSubmit = (data: FormData) => {
    switch (data.action) {
      case 'storageDeposit':
        handleStorageDeposit(data)
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
              {/* Add more NFT details as needed */}
            </div>
          ))}
        </div>
        {ownedNfts.length === 0 && (
          <p className="text-gray-400">You don't own any NFT keys yet.</p>
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
            { value: 'storageDeposit', label: 'Storage Deposit' },
          ]}
          placeholder="Select an action"
          {...register("action", { required: true })}
          className="mb-4"
        />
        {action === 'storageDeposit' && (
          <Input
            label="Storage Amount (in NEAR)"
            {...register("amount", { required: true })}
            placeholder="Enter amount for storage deposit"
            className="mb-4"
          />
        )}

        <Button type="submit" isLoading={isProcessing}>
          {action === 'approve' ? 'Approve' : action === 'revoke' ? 'Revoke' : 'Deposit'}
        </Button>
      </form>

      <div className="mt-6 gap-4 flex">
        <Button onClick={handleStorageWithdraw} variant="secondary" isLoading={isProcessing}>
          Storage Withdraw
        </Button>
        <Button onClick={handleStorageUnregister} variant="danger" isLoading={isProcessing}>
          Storage Unregister
        </Button>
      </div>

      {message && (
        <div className={`mt-6 p-4 rounded-lg ${message.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          <p className="text-white">{message.content}</p>
        </div>
      )}
    </div>
  )
}