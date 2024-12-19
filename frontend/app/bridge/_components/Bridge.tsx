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

        await handleSwapBTC({
            inputUtxos,
            outputUtxos,
            senderPublicKey: btcBridgeAddressAndPk.publicKey
        })
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

        handleSwapBTCKrnl({
            auth: "0x0000000000000000000000000000000000000000000000000000000000000040a5e14fba86592759a836757c2a09c43cf3e85e98bb47d4d74ea47017d50c884c0000000000000000000000000000000000000000000000000000000000000041c1e2ae4c77b84e1c518cac9df66ee84e8f640a4a12f634f546c7b0cd24dd14456db346d952b3896867e71f2ae963f5496e98b327882e28a918963648dae73e2c0000000000000000000000000000000000000000000000000000000000000000",
            sender: "889E6a9d863373A7A735AB71Cd481e63ef8d64A4",
            recipient: "0267ec0b1f94cea5a22511f0925e27fd7de087dfe13d4abe243ded4c94b1573ff0",
            kernelResponse: "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000000a302e30303033363132300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000040000000000000000000000000889e6a9d863373a7a735ab71cd481e63ef8d64a4000000000000000000000000889e6a9d863373a7a735ab71cd481e63ef8d64a400000000000000000000000000000000000000000000000000000000000000019f450d2b17ba679992e662a246056050c312893019a6d7ccc48ac6d11eee1fb700000000000000000000000000000000000000000000000000000000006f765cfe7d12888b2bffa36869689673b02b65911f1a1e30035f6050ed445ca21b6334000000000000000000000000000000000000000000000000000000000000006e00000000000000000000000000000000000000000000000000000000000052080000000000000000000000000000000000000000000000000000000000d8a19c000000000000000000000000000000000000000000000000000000400d539aac0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e30313031303230300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000240000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000002c0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000038000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000076000000000000000000000000000000000000000000000000000000000000008e00000000000000000000000000000000000000000000000000000000000000d00000000000000000000000000000000000000000000000000000000000000000a302e303035313733343700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e303035303030303000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e303030333634303800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e303034363335393200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e303030303033303800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e3030303030333038000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000007a12000000000000000000000000000000000000000000000000000000000000000403065666434363237643363393735613564353833636232326663333664643538653533383163386136633930636238366364356539643566306138316630643000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000e35f000000000000000000000000000000000000000000000000000000006760365e0000000000000000000000000000000000000000000000000000000000000040303030303030303036663838366661636131363362356433316633663361373734396136363662366433336638393739363130633063613739633236626439610000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000043c300000000000000000000000000000000000000000000000000000000000000406464663831303163343634383435643463303235613235653036336437303137313333386337643132643930646631323637376465653566306231386237373500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000e35f000000000000000000000000000000000000000000000000000000006760365e0000000000000000000000000000000000000000000000000000000000000040303030303030303036663838366661636131363362356433316633663361373734396136363662366433336638393739363130633063613739633236626439610000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000007a12000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004030656664343632376433633937356135643538336362323266633336646435386535333831633861366339306362383663643565396435663061383166306430000000000000000000000000000000000000000000000000000000000000002c303031346264353733626436386361663365313161646533653133306264303633316363613362626138663200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008d0400000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000040643331303766383438366263643535613738306635383739393163383232333533666161646238666632326434353334396466333032646630316130643934360000000000000000000000000000000000000000000000000000000000000028626435373362643638636166336531316164653365313330626430363331636361336262613866320000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000712e800000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000000406433313037663834383662636435356137383066353837393931633832323335336661616462386666323264343533343964663330326466303161306439343600000000000000000000000000000000000000000000000000000000000000286264353733626436386361663365313161646533653133306264303633316363613362626138663200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000000406433313037663834383662636435356137383066353837393931633832323335336661616462386666323264343533343964663330326466303161306439343600000000000000000000000000000000000000000000000000000000000000143661303833656666643933616366383336336634000000000000000000000000000000000000000000000000000000000000000000000000000000000000002862643537336264363863616633653131616465336531333062643036333163636133626261386632000000000000000000000000000000000000000000000000"
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