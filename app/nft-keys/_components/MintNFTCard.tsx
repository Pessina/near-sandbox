import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface MintNFTCardProps {
    onMint: () => Promise<void>
    isProcessing: boolean
}

export function MintNFTCard({ onMint, isProcessing }: MintNFTCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Mint New NFT Key</CardTitle>
            </CardHeader>
            <CardContent>
                <Button onClick={onMint} disabled={isProcessing}>
                    {isProcessing ? "Processing..." : "Mint New NFT Key"}
                </Button>
            </CardContent>
        </Card>
    )
} 