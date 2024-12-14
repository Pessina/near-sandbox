"use client"

import { useToast } from "@/hooks/use-toast"
import Bridge from "./_components/Bridge"
import { usePrices } from "./_hooks/usePrices"
import { useGetTxData } from "./_hooks/useGetTxData"
import { useBTCInfo } from "./_hooks/useBTCInfo"
import { Chain, chainsConfig } from "@/constants/chains"

export default function BridgePage() {
    const { toast } = useToast()
    const { getPrice } = usePrices()
    const { getTxData } = useGetTxData()
    const { getBTCInfo } = useBTCInfo()

    const handleSuccess = async (data: `0x${string}`) => {
        const explorerUrl = `${chainsConfig.ethereum.explorerUrl}/tx/${data}`

        const txData = await getTxData(data)
        console.log("Transaction Data:", txData)

        try {
            const priceData = await getPrice(Chain.ETH, Chain.BTC)
            console.log("Price Data:", priceData)

            const btcInfo = await getBTCInfo('tb1qp47syg7nq26w3mehq594yq93cvcx4eatrvrtmc')
            console.log("BTC Info:", btcInfo)

        } catch (err) {
            console.error("Failed to fetch price or BTC info:", err)
        }

        toast({
            title: "Bridge Initiated",
            description: (
                <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                >
                    View on Explorer
                </a>
            ),
        })
    }

    const handleError = async (error: any) => {
        toast({
            title: "Bridge Failed",
            description: error.message,
            variant: "destructive",
        })
        throw error
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6 text-center">Cross-Chain Bridge</h1>
            <Bridge onSuccess={handleSuccess} onError={handleError} />
        </div>
    )
}