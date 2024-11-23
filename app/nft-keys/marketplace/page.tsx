"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import useInitNear from "@/hooks/useInitNear"
import { createMarketplaceContract } from "../_contract/NFTKeysMarketplaceContract"
import Button from "@/components/Button"
import Input from "@/components/Input"
import Select from "@/components/Select"
import Link from "@/components/Link"
import Loader from "@/components/Loader"
import { parseNearAmount, formatNearAmount } from "near-api-js/lib/utils/format"
import { NFTKeysMarketplaceContract } from "../_contract/NFTKeysMarketplaceContract/types"
import { NEAR_MAX_GAS, ONE_YOCTO_NEAR } from "../_contract/constants"

type FormData = {
    action: string
    nftContractId?: string
    tokenId?: string
    approvalId?: string
    saleToken?: string
    saleAmount?: string
    accountId?: string
    fromIndex?: string
    limit?: string
    amount?: string
}

export default function NFTKeysMarketplacePage() {
    const { register, handleSubmit, watch, reset } = useForm<FormData>()
    const { account, isLoading } = useInitNear()
    const [marketplaceContract, setMarketplaceContract] = useState<NFTKeysMarketplaceContract>()
    const [message, setMessage] = useState<{ type: 'success' | 'error', content: string } | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [sales, setSales] = useState<any[]>([])
    const [storageBalance, setStorageBalance] = useState<{ total: string; available: string } | null>(null)

    const action = watch('action')

    useEffect(() => {
        if (!account) return

        const contract = createMarketplaceContract({
            account,
            contractId: process.env.NEXT_PUBLIC_NFT_KEYS_MARKETPLACE_CONTRACT!
        })
        setMarketplaceContract(contract)
    }, [account])

    useEffect(() => {
        if (!marketplaceContract || !account) return

        const loadData = async () => {
            try {
                const [balance, userSales] = await Promise.all([
                    marketplaceContract.storage_balance_of({ account_id: account.accountId }),
                    marketplaceContract.get_sales_by_owner_id({
                        account_id: account.accountId,
                        from_index: "0",
                        limit: 100
                    })
                ])

                setStorageBalance({ total: balance, available: "0" })
                setSales(userSales)
            } catch (error) {
                setMessage({ type: 'error', content: `Error loading data: ${error}` })
            }
        }

        loadData()
    }, [marketplaceContract, account])

    const handleListForSale = async (data: FormData) => {
        if (!marketplaceContract || !data.nftContractId || !data.tokenId || !data.approvalId || !data.saleToken || !data.saleAmount) return
        setIsProcessing(true)
        try {
            await marketplaceContract.list_nft_for_sale({
                args: {
                    nft_contract_id: data.nftContractId,
                    token_id: data.tokenId,
                    approval_id: parseInt(data.approvalId),
                    sale_conditions: {
                        token: data.saleToken,
                        amount: parseFloat(data.saleAmount)
                    }
                }
            })
            setMessage({ type: 'success', content: 'NFT listed for sale successfully' })
            reset()
        } catch (error) {
            setMessage({ type: 'error', content: `Error listing NFT: ${error}` })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleRemoveSale = async (data: FormData) => {
        if (!marketplaceContract || !data.nftContractId || !data.tokenId) return
        setIsProcessing(true)
        try {
            await marketplaceContract.remove_sale({
                args: {
                    nft_contract_id: data.nftContractId,
                    token_id: data.tokenId
                }
            })
            setMessage({ type: 'success', content: 'Sale removed successfully' })
            reset()
        } catch (error) {
            setMessage({ type: 'error', content: `Error removing sale: ${error}` })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleOffer = async (data: FormData) => {
        if (!marketplaceContract || !data.nftContractId || !data.tokenId || !data.saleToken || !data.saleAmount) return
        setIsProcessing(true)
        try {
            await marketplaceContract.offer({
                args: {
                    nft_contract_id: data.nftContractId,
                    token_id: data.tokenId,
                    offer_price: {
                        token: data.saleToken,
                        amount: parseFloat(data.saleAmount)
                    }
                }
            })
            setMessage({ type: 'success', content: 'Offer made successfully' })
            reset()
        } catch (error) {
            setMessage({ type: 'error', content: `Error making offer: ${error}` })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleStorageDeposit = async (data: FormData) => {
        if (!marketplaceContract || !data.amount) return
        const amount = parseNearAmount(data.amount)
        if (!amount) return

        setIsProcessing(true)
        try {
            const result = await marketplaceContract.storage_deposit({
                args: {},
                amount
            })
            setStorageBalance(result)
            setMessage({ type: 'success', content: 'Storage deposit successful' })
            reset()
        } catch (error) {
            setMessage({ type: 'error', content: `Error depositing storage: ${error}` })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleStorageWithdraw = async () => {
        if (!marketplaceContract) return
        setIsProcessing(true)
        try {
            const result = await marketplaceContract.storage_withdraw({})
            setStorageBalance(result)
            setMessage({ type: 'success', content: 'Storage withdrawal successful' })
        } catch (error) {
            setMessage({ type: 'error', content: `Error withdrawing storage: ${error}` })
        } finally {
            setIsProcessing(false)
        }
    }

    const onSubmit = (data: FormData) => {
        switch (data.action) {
            case 'listForSale':
                handleListForSale(data)
                break
            case 'removeSale':
                handleRemoveSale(data)
                break
            case 'makeOffer':
                handleOffer(data)
                break
            case 'storageDeposit':
                handleStorageDeposit(data)
                break
            case 'storageWithdraw':
                handleStorageWithdraw()
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
                        Please connect your NEAR wallet to access NFT Keys Marketplace.
                    </p>
                    <Link href="#">Connect Wallet</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 max-w-3xl">
            <h1 className="text-3xl font-bold mb-6 text-white">NFT Keys Marketplace</h1>

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
                <h2 className="text-xl font-bold mb-4 text-white">Your Listed NFTs</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sales.map((sale, index) => (
                        <div key={index} className="p-4 bg-gray-700 rounded-lg">
                            <p className="text-white">Contract: {sale.nft_contract_id}</p>
                            <p className="text-white">Token ID: {sale.token_id}</p>
                            <p className="text-white">Price: {sale.sale_conditions.amount} {sale.sale_conditions.token}</p>
                        </div>
                    ))}
                </div>
                {sales.length === 0 && (
                    <p className="text-gray-400">You haven&apos;t listed any NFTs for sale.</p>
                )}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-800 p-6 rounded-lg shadow-lg space-y-4">
                <h2 className="text-xl font-bold mb-4 text-white">Marketplace Actions</h2>

                <Select
                    label="Action"
                    options={[
                        { value: 'listForSale', label: 'List NFT for Sale' },
                        { value: 'removeSale', label: 'Remove Sale' },
                        { value: 'makeOffer', label: 'Make Offer' },
                        { value: 'storageDeposit', label: 'Storage Deposit' },
                        { value: 'storageWithdraw', label: 'Storage Withdraw' },
                    ]}
                    placeholder="Select an action"
                    {...register("action", { required: true })}
                    className="mb-4"
                />

                {['listForSale', 'removeSale', 'makeOffer'].includes(action) && (
                    <>
                        <Input
                            label="NFT Contract ID"
                            {...register("nftContractId", { required: true })}
                            placeholder="Enter NFT contract ID"
                            className="mb-4"
                        />
                        <Input
                            label="Token ID"
                            {...register("tokenId", { required: true })}
                            placeholder="Enter token ID"
                            className="mb-4"
                        />
                    </>
                )}

                {action === 'listForSale' && (
                    <>
                        <Input
                            label="Approval ID"
                            {...register("approvalId", { required: true })}
                            placeholder="Enter approval ID"
                            className="mb-4"
                        />
                        <Input
                            label="Sale Token"
                            {...register("saleToken", { required: true })}
                            placeholder="Enter sale token (e.g., 'near')"
                            className="mb-4"
                        />
                        <Input
                            label="Sale Amount"
                            {...register("saleAmount", { required: true })}
                            placeholder="Enter sale amount"
                            className="mb-4"
                        />
                    </>
                )}

                {action === 'makeOffer' && (
                    <>
                        <Input
                            label="Offer Token"
                            {...register("saleToken", { required: true })}
                            placeholder="Enter offer token (e.g., 'near')"
                            className="mb-4"
                        />
                        <Input
                            label="Offer Amount"
                            {...register("saleAmount", { required: true })}
                            placeholder="Enter offer amount"
                            className="mb-4"
                        />
                    </>
                )}

                {action === 'storageDeposit' && (
                    <Input
                        label="Amount (in NEAR)"
                        {...register("amount", { required: true })}
                        placeholder="Enter amount for storage deposit"
                        className="mb-4"
                    />
                )}

                <Button type="submit" isLoading={isProcessing}>
                    Submit
                </Button>
            </form>

            {message && (
                <div className={`mt-6 p-4 rounded-lg ${message.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
                    <p className="text-white">{message.content}</p>
                </div>
            )}
        </div>
    )
}
