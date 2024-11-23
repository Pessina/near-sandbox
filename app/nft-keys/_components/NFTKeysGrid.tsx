import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Key } from 'lucide-react'

interface NFTToken {
    token_id: string
}

interface NFTKeysGridProps {
    nfts: NFTToken[]
    emptyMessage: string
}

export function NFTKeysGrid({ nfts, emptyMessage }: NFTKeysGridProps) {
    return (
        <div className="space-y-4">
            {nfts.length === 0 ? (
                <p className="text-muted-foreground text-center">{emptyMessage}</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nfts.map((nft) => (
                        <Card key={nft.token_id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex items-center space-x-4">
                                <Key className="h-8 w-8 text-primary" />
                                <div>
                                    <h3 className="font-semibold">NFT Key</h3>
                                    <Badge variant="secondary" className="mt-1">
                                        ID: {nft.token_id}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}