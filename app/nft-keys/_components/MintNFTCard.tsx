import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CoinsIcon as Coin } from 'lucide-react'

interface MintNFTCardProps {
    onMint: () => Promise<void>
    isProcessing: boolean
}

export function MintNFTCard({ onMint, isProcessing }: MintNFTCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <Coin className="h-5 w-5" />
                    <span>Mint New NFT Key</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Button onClick={onMint} disabled={isProcessing} className="w-full">
                    {isProcessing ? "Minting..." : "Mint New NFT Key"}
                </Button>
            </CardContent>
        </Card>
    )
}