import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface NFTToken {
    token_id: string
}

interface NFTKeysGridProps {
    title: string
    nfts: NFTToken[]
    emptyMessage: string
}

export function NFTKeysGrid({ title, nfts, emptyMessage }: NFTKeysGridProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {nfts.map((nft) => (
                        <Card key={nft.token_id}>
                            <CardContent className="pt-6">
                                <Badge variant="secondary">Token ID: {nft.token_id}</Badge>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                {nfts.length === 0 && (
                    <p className="text-muted-foreground">{emptyMessage}</p>
                )}
            </CardContent>
        </Card>
    )
} 