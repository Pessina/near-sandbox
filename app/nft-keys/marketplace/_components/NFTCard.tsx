import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FormData, NFTWithPrice } from "../types"
import { Tag, XCircle, Key, Lock, Wallet, Copy } from 'lucide-react'
import { NFTListDialog } from "./NFTListDialog"
import { NFTOfferDialog } from "./NFTOfferDialog"
import { useDeriveAddressAndPublicKey } from "@/hooks/useDeriveAddressAndPublicKey"
import { useAccountBalance } from "@/hooks/useAccountBalance"
import { Chain } from "@/app/constants/chains"
import { useCopy } from "@/hooks/useCopy"
import { useEffect } from "react"
import { useEnv } from "@/hooks/useEnv"
import { getPath } from "../_utils/getPath"

interface NFTCardProps {
    nft: NFTWithPrice
    isProcessing: boolean
    onList?: (data: FormData) => Promise<void>
    onRemoveListing?: (nft: NFTWithPrice) => Promise<void>
    onOffer?: (data: { purchaseTokenId: string, offerTokenId: string, path: string }) => Promise<void>
    variant: "listed" | "owned"
}

export function NFTCard({ nft, isProcessing, onList, onRemoveListing, onOffer, variant }: NFTCardProps) {
    const { copyToClipboard } = useCopy()
    const chain = nft.token?.toLowerCase() === 'btc' ? Chain.BTC :
        nft.token?.toLowerCase() === 'eth' ? Chain.ETH :
            nft.token?.toLowerCase() === 'bnb' ? Chain.BNB :
                nft.token?.toLowerCase() === 'osmo' ? Chain.OSMOSIS : Chain.ETH

    const { nftKeysContract } = useEnv()
    const derivedAddress = useDeriveAddressAndPublicKey(
        nftKeysContract,
        chain,
        getPath(nft.token_id, nft.path || "")
    )

    const { accountBalance, getAccountBalance } = useAccountBalance(chain, derivedAddress?.address ?? "")

    useEffect(() => {
        getAccountBalance()
    }, [getAccountBalance])

    const truncateAddress = (address: string) => {
        if (address.length <= 13) return address
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    return (
        <Card className="overflow-hidden transition-all hover:shadow-lg">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                        <Key className="h-8 w-8 mr-2" />
                        <h3 className="font-semibold text-lg">NFT Key #{nft.token_id}</h3>
                    </div>
                    {nft.price && (
                        <Badge variant="secondary">
                            <Tag className="mr-1 h-3 w-3" />
                            {nft.price} {nft.token?.toUpperCase() || 'NEAR'}
                        </Badge>
                    )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">{nft.metadata.description || "This NFT Key holds funds on other chains"}</p>
                <div className="flex flex-col gap-2">
                    {derivedAddress && (
                        <div className="flex items-center justify-between text-muted-foreground text-sm bg-secondary/50 p-2 rounded-md">
                            <div className="flex items-center">
                                <Wallet className="h-4 w-4 mr-1" />
                                <span className="truncate" title={derivedAddress.address}>
                                    Address: {truncateAddress(derivedAddress.address)}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => copyToClipboard(derivedAddress.address)}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                    {accountBalance && (
                        <div className="flex items-center text-muted-foreground text-sm">
                            <Tag className="h-4 w-4 mr-1" />
                            <span>Balance: {accountBalance}</span>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="p-4 flex flex-col gap-2">
                {variant === "listed" && (
                    <>
                        {onOffer && (
                            <NFTOfferDialog
                                isProcessing={isProcessing}
                                onOffer={onOffer}
                                nftId={nft.token_id}
                            />
                        )}
                    </>
                )}
                {variant === "owned" && (
                    <>
                        {nft.price ? (
                            <Button onClick={() => onRemoveListing && onRemoveListing(nft)} disabled={isProcessing} variant="destructive" className="w-full">
                                <XCircle className="mr-2 h-4 w-4" />
                                {isProcessing ? 'Processing...' : 'Remove Listing'}
                            </Button>
                        ) : (
                            onList && <NFTListDialog
                                isProcessing={isProcessing}
                                onList={onList}
                                tokenId={nft.token_id}
                            />
                        )}
                    </>
                )}
            </CardFooter>
        </Card>
    )
}