"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRightLeft, Wallet, Loader2 } from 'lucide-react'
import { useAccount, useConnect, useSendTransaction } from 'wagmi'
import { parseEther, encodeAbiParameters } from 'viem'
import { useForm } from "react-hook-form"
import { metaMask } from 'wagmi/connectors'
import { Badge } from "@/components/ui/badge"
import { Chain, CHAINS } from "@/constants/chains"
import { useMounted } from "@/hooks/useMounted"

import type { UseSendTransactionParameters } from 'wagmi'
import type { Config } from '@wagmi/core'
import { useBridgeContract } from "../../../contracts/BridgeContract/useBridgeContract"
import { useDeriveAddressAndPublicKey } from "@/hooks/useDeriveAddressAndPublicKey"
import { useChains } from "@/hooks/useChains"
import { Bitcoin } from "multichain-tools"
import { EvmTransaction } from "@/contracts/BridgeContract"

type FormData = {
    amount: string
    toAddress: string
    sourceChain: Chain
    destChain: Chain
}

interface BridgeProps {
    onSuccess: NonNullable<UseSendTransactionParameters<Config>['mutation']>['onSuccess'];
    onError: NonNullable<UseSendTransactionParameters<Config>['mutation']>['onError'];
}

export default function Bridge({ onSuccess, onError }: BridgeProps) {
    const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            sourceChain: Chain.ETH,
            destChain: Chain.BTC
        }
    })
    const { address, isConnected } = useAccount()
    const { connect, isPending: isConnectPending } = useConnect()
    const formValues = watch()
    const mounted = useMounted()
    const { handleSwapBTC, handleSwapEVM, handleSwapBTCKrnl } = useBridgeContract()
    const { btc, evm } = useChains()

    const { sendTransaction, isPending } = useSendTransaction({
        mutation: {
            onSuccess,
            onError
        }
    })

    const btcBridgeAddressAndPk = useDeriveAddressAndPublicKey("felipe-bridge-contract.testnet", Chain.BTC, "")
    const evmBridgeAddressAndPk = useDeriveAddressAndPublicKey("felipe-bridge-contract.testnet", Chain.ETH, "")

    const onSubmit = async (data: FormData) => {
        // if (!isConnected) {
        //     const error = new Error("Please connect your wallet first.")
        //     toast({
        //         title: "Wallet Not Connected",
        //         description: error.message,
        //         variant: "destructive",
        //     })
        //     throw error
        // }

        // const encodedData = encodeAbiParameters(
        //     [
        //         { name: 'to', type: 'string' },
        //         { name: 'chain', type: 'uint256' }
        //     ],
        //     [data.toAddress, BigInt(CHAINS[data.destChain].slip44)]
        // )

        // sendTransaction({
        //     to: data.bridgeAddress as `0x${string}`,
        //     value: parseEther(data.amount),
        //     data: encodedData,
        //     chainId: 11155111
        // })

        if (!btcBridgeAddressAndPk) return

        const psbt = await btc.createPSBT({
            transactionRequest: {
                publicKey: btcBridgeAddressAndPk.publicKey,
                from: btcBridgeAddressAndPk.address,
                to: data.toAddress,
                value: Bitcoin.toSatoshi(Number(data.amount)).toString()
            }
        })

        const inputUtxos = await Promise.all(psbt.data.inputs.map(async (input, index) => {
            if (!input.witnessUtxo) {
                throw new Error(`Missing witnessUtxo for input ${index}`)
            }

            return {
                txid: Buffer.from(psbt.txInputs[index].hash).reverse().toString('hex'),
                vout: psbt.txInputs[index].index,
                value: input.witnessUtxo.value,
                script_pubkey: input.witnessUtxo.script.toString('hex')
            }
        }))

        const outputUtxos = psbt.txOutputs.map((output, index) => {
            return {
                txid: '',
                vout: index,
                value: output.value,
                script_pubkey: output.script.toString('hex')
            }
        })

        console.log(inputUtxos, outputUtxos, btcBridgeAddressAndPk.publicKey)

        // await handleSwapBTC({
        //     inputUtxos,
        //     outputUtxos,
        //     senderPublicKey: btcBridgeAddressAndPk.publicKey
        // })
    }

    const handleSwapETH = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        if (!evmBridgeAddressAndPk) return

        const { transaction, mpcPayloads } = await evm.getMPCPayloadAndTransaction({
            to: "0x4174678c78fEaFd778c1ff319D5D326701449b25",
            from: evmBridgeAddressAndPk.address,
            value: BigInt("10000"),
        })

        const mockEvmTransaction: EvmTransaction = {
            nonce: Number(transaction.nonce) || 0,
            to: transaction.to || "0x0000000000000000000000000000000000000000",
            value: (transaction.value?.toString() || "0"),
            max_priority_fee_per_gas: (transaction.maxPriorityFeePerGas?.toString() || "0"),
            max_fee_per_gas: (transaction.maxFeePerGas?.toString() || "0"),
            gas_limit: (transaction.gasLimit?.toString() || "0"),
            chain_id: Number(transaction.chainId) || 1,
        };

        await handleSwapEVM({
            tx: mockEvmTransaction
        });
    }

    const handleSwapBTCKrnl1 = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        if (!btcBridgeAddressAndPk) return

        await handleSwapBTCKrnl({
            auth: "0x00000000000000000000000000000000000000000000000000000000000000406b3ce4c52a0935925a0002d0da01d7be0c326fe92e0aae5c1e5deeed9db0d5a70000000000000000000000000000000000000000000000000000000000000041c83de55e72da68c80a711bf859cf2b4d7d35921f32be3639748bd9d3e033a64b139956e4e7f1d28beeaa843198c45fd79851732f3f45535bbee199f55651b1ad0000000000000000000000000000000000000000000000000000000000000000",
            sender: "889E6a9d863373A7A735AB71Cd481e63ef8d64A4",
            recipient: "0267ec0b1f94cea5a22511f0925e27fd7de087dfe13d4abe243ded4c94b1573ff0",
            kernelResponse: "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000000a302e30303033363235340000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000040000000000000000000000000889e6a9d863373a7a735ab71cd481e63ef8d64a4000000000000000000000000889e6a9d863373a7a735ab71cd481e63ef8d64a400000000000000000000000000000000000000000000000000000000000000019f450d2b17ba679992e662a246056050c312893019a6d7ccc48ac6d11eee1fb700000000000000000000000000000000000000000000000000000000006f765cfe7d12888b2bffa36869689673b02b65911f1a1e30035f6050ed445ca21b6334000000000000000000000000000000000000000000000000000000000000006e00000000000000000000000000000000000000000000000000000000000052080000000000000000000000000000000000000000000000000000000000d8a19c000000000000000000000000000000000000000000000000000000400d539aac0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e30313031303230300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000240000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000002c0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000038000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000076000000000000000000000000000000000000000000000000000000000000008e00000000000000000000000000000000000000000000000000000000000000d20000000000000000000000000000000000000000000000000000000000000000a302e303036303631363800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e303033313431393200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e303030333636303800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e303032373735383400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e303030303033303800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e3030303030333038000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000004cb5000000000000000000000000000000000000000000000000000000000000000406662326631653561613562316465326466306131613238653763323938333762376539336431313461643934376433663437393733626332343034393635393100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000e4a4000000000000000000000000000000000000000000000000000000006762dc090000000000000000000000000000000000000000000000000000000000000040303030303030303030333936346165343734373134616633313130323030313033333464643363363633303238666131333036653338306536653264396138310000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000004748800000000000000000000000000000000000000000000000000000000000000403330373735616431663663633363383431626536643264313531396361336662393934366464656632636261353561363332623663306536633335633535323800000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000e53e0000000000000000000000000000000000000000000000000000000067641b010000000000000000000000000000000000000000000000000000000000000040303030303030303038396661306666333337623938316438363638633966656636613830336635633137636236393438323864303237343430373431623234660000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000004cb5000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004066623266316535616135623164653264663061316132386537633239383337623765393364313134616439343764336634373937336263323430343936353931000000000000000000000000000000000000000000000000000000000000002c303031343565343738623432623232313837313630396232363064633135346232393461303631356564346400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008dcc00000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004035353339373734626132386533353963613530306330313632376439393331363061633334346336623536646662613335346133326335323163333566643931000000000000000000000000000000000000000000000000000000000000002c30303134626435373362643638636166336531316164653365313330626430363331636361336262613866320000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000043c5000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004035353339373734626132386533353963613530306330313632376439393331363061633334346336623536646662613335346133326335323163333566643931000000000000000000000000000000000000000000000000000000000000004632313032366363393734623332336434363265363230353338626335313563336233613933613236666133326131336530643531313337646436346335623665316537646163000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004035353339373734626132386533353963613530306330313632376439393331363061633334346336623536646662613335346133326335323163333566643931000000000000000000000000000000000000000000000000000000000000001436613038366164656130353839656134353835330000000000000000000000000000000000000000000000000000000000000000000000000000000000000042303236636339373462333233643436326536323035333862633531356333623361393361323666613332613133653064353131333764643634633562366531653764000000000000000000000000000000000000000000000000000000000000"
        })
    }

    if (!mounted) return null

    return (
        <Card className="w-full max-w-md mx-auto" >
            <CardHeader>
                <CardTitle className="text-2xl font-bold">Cross-Chain Bridge</CardTitle>
                <CardDescription>Transfer your assets securely across blockchains</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {!isConnected ? (
                    <Button
                        onClick={() => connect({ connector: metaMask() })}
                        disabled={isConnectPending}
                        className="w-full"
                    >
                        <Wallet className="mr-2 h-4 w-4" /> Connect MetaMask
                    </Button>
                ) : (
                    <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
                        <span className="text-sm font-medium">Connected Wallet</span>
                        <Badge variant="secondary">
                            {address?.slice(0, 6)}...{address?.slice(-4)}
                        </Badge>
                    </div>
                )
                }
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">From</label>
                            <Select
                                value={formValues.sourceChain}
                                onValueChange={(value) => register("sourceChain").onChange({ target: { value: value as Chain } })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Source Chain" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={Chain.ETH}>{CHAINS[Chain.ETH].name}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">To</label>
                            <Select
                                value={formValues.destChain}
                                onValueChange={(value) => register("destChain").onChange({ target: { value: value as Chain } })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Destination Chain" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={Chain.BTC}>{CHAINS[Chain.BTC].name}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="toAddress" className="text-sm font-medium mb-1 block">Recipient Address</label>
                        <Input
                            id="toAddress"
                            {...register("toAddress", { required: "To address is required" })}
                            type="text"
                            placeholder="Destination address"
                        />
                        {errors.toAddress && (
                            <p className="text-sm text-red-500 mt-1">{errors.toAddress.message}</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="amount" className="text-sm font-medium mb-1 block">Amount</label>
                        <Input
                            id="amount"
                            {...register("amount", {
                                required: "Amount is required",
                                pattern: {
                                    value: /^[0-9]*\.?[0-9]*$/,
                                    message: "Please enter a valid number"
                                }
                            })}
                            type="text"
                            placeholder="0.0"
                        />
                        {errors.amount && (
                            <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
                        )}
                    </div>
                    <Button type="submit" disabled={!isConnected || isPending} className="w-full">
                        {isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                        )}
                        Initiate Bridge
                    </Button>
                    <Button onClick={handleSwapETH} disabled={!isConnected || isPending} className="w-full">Withdraw</Button>
                    <Button onClick={handleSwapBTCKrnl1} disabled={!isConnected || isPending} className="w-full">KRNL</Button>
                </form>
            </CardContent >
        </Card >
    )
}   