import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { NFT, FormData, SUPPORTED_TOKENS } from "../types"

interface ListNFTDialogProps {
    nft: NFT
    isProcessing: boolean
    onList: (data: FormData) => void
}

export function ListNFTDialog({ nft, isProcessing, onList }: ListNFTDialogProps) {
    const { register, handleSubmit, setValue } = useForm<FormData>({
        defaultValues: {
            token: "near",
            tokenId: nft.token_id
        }
    })

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full">List for Sale</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>List NFT for Sale</DialogTitle>
                    <DialogDescription>Enter the price and select the token for your NFT listing.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onList)} className="space-y-4">
                    <input type="hidden" {...register("tokenId")} value={nft.token_id} />
                    <div className="flex gap-4">
                        <Input
                            {...register("price", { required: true })}
                            placeholder="Price"
                            type="number"
                            step="0.1"
                            className="flex-1"
                        />
                        <Select
                            defaultValue="near"
                            onValueChange={(value) => setValue("token", value)}
                        >
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Select token" />
                            </SelectTrigger>
                            <SelectContent>
                                {SUPPORTED_TOKENS.map(token => (
                                    <SelectItem key={token.id} value={token.id}>
                                        {token.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isProcessing}>
                            {isProcessing ? 'Processing...' : 'List NFT'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
} 