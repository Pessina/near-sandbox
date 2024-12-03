import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FormData, NFTListed } from "../types"
import { Tag, XCircle, Key, Lock, Wallet, Copy } from 'lucide-react'
import { NFTListDialog } from "./NFTListDialog"
import { NFTOfferDialog } from "./NFTOfferDialog"
import { NFTTransactionDialog } from "./NFTTransactionDialog"
import { useDeriveAddressAndPublicKey } from "@/hooks/useDeriveAddressAndPublicKey"
import { useAccountBalance } from "@/hooks/useAccountBalance"
import { Chain } from "@/constants/chains"
import { useCopy } from "@/hooks/useCopy"
import { useEffect } from "react"
import { useEnv } from "@/hooks/useEnv"
import { getPath } from "../_utils/getPath"
import { formatTokenAmount } from "../_utils/chains"
import { NFT } from "../../_contract/NFTKeysContract"
import { ListNFTArgs, OfferNFTArgs, TransactionArgs, RemoveListingArgs } from "../_hooks/useNFTMarketplace"

interface NFTCardProps {
    nft: NFTListed
    isProcessing: boolean
    onList?: (args: ListNFTArgs) => Promise<void>
    onRemoveListing?: (args: RemoveListingArgs) => Promise<void>
    onOffer?: (args: OfferNFTArgs) => Promise<void>
    onTransaction?: (args: TransactionArgs) => Promise<void>
    variant: "listed" | "owned"
    ownedNfts?: NFT[]
}

export function NFTCard({ nft, isProcessing, onList, onRemoveListing, onOffer, onTransaction, variant, ownedNfts = [] }: NFTCardProps) {
    const { copyToClipboard } = useCopy()

    const { nftKeysContract } = useEnv()
    const derivedAddressAndPublicKey = useDeriveAddressAndPublicKey(
        nftKeysContract,
        nft.token as Chain,
        getPath(nft.token_id, nft.path || "")
    )

    const { accountBalance, getAccountBalance } = useAccountBalance(nft.token as Chain, derivedAddressAndPublicKey?.address ?? "")

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
                    {nft.saleConditions?.amount && (
                        <Badge variant="secondary">
                            <Tag className="mr-1 h-3 w-3" />
                            {formatTokenAmount(nft.saleConditions.amount, nft.saleConditions.token as Chain)} {nft.saleConditions.token.toUpperCase()}
                        </Badge>
                    )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">{nft.metadata.description || "This NFT Key holds funds on other chains"}</p>
                <div className="flex flex-col gap-2">
                    {derivedAddressAndPublicKey && (
                        <div className="flex items-center justify-between text-muted-foreground text-sm bg-secondary/50 p-2 rounded-md">
                            <div className="flex items-center">
                                <Wallet className="h-4 w-4 mr-1" />
                                <span className="truncate" title={derivedAddressAndPublicKey.address}>
                                    Address: {truncateAddress(derivedAddressAndPublicKey.address)}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => copyToClipboard(derivedAddressAndPublicKey.address)}
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
                        {onOffer && derivedAddressAndPublicKey && (
                            <NFTOfferDialog
                                isProcessing={isProcessing}
                                onOffer={onOffer}
                                nftId={nft.token_id}
                                ownedNfts={ownedNfts}
                                chain={nft.saleConditions?.token as Chain}
                            />
                        )}
                    </>
                )}
                {variant === "owned" && (
                    <>
                        {nft.saleConditions?.amount ? (
                            <Button onClick={() => onRemoveListing && onRemoveListing({ nft })} disabled={isProcessing} variant="destructive" className="w-full">
                                <XCircle className="mr-2 h-4 w-4" />
                                {isProcessing ? 'Processing...' : 'Remove Listing'}
                            </Button>
                        ) : (
                            <>
                                {onList && <NFTListDialog
                                    isProcessing={isProcessing}
                                    onList={onList}
                                    tokenId={nft.token_id}
                                />}
                                {onTransaction && derivedAddressAndPublicKey && <NFTTransactionDialog
                                    nft={nft}
                                    isProcessing={isProcessing}
                                    onTransaction={onTransaction}
                                    path={nft.path || ""}
                                    chain={nft.token || ""}
                                />}
                            </>
                        )}
                    </>
                )}
            </CardFooter>
        </Card>
    )
}