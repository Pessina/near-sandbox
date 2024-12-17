"use client"

import { useToast } from "@/hooks/use-toast"
import Bridge from "./_components/Bridge"
import { usePrices } from "./_hooks/usePrices"
import { useETHTxData } from "./_hooks/useETHTxData"
import { Chain, CHAINS } from "@/constants/chains"

export default function BridgePage() {
    const { toast } = useToast()
    const { getPrices } = usePrices()
    const { getTxData: getEthTxData } = useETHTxData()

    const handleSuccess = async (txHash: `0x${string}`) => {
        const explorerUrl = `${CHAINS[Chain.ETH].explorerUrl}/tx/${txHash}`

        const txData = await getEthTxData(txHash)
        console.log("Transaction Data:", txData)

        try {
            const priceData = await getPrices(Chain.ETH, Chain.BTC)
            console.log("Price Data:", priceData)


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
        <div className="grow flex flex-col justify-center items-center">
            <Bridge onSuccess={handleSuccess} onError={handleError} />
        </div>
    )
}