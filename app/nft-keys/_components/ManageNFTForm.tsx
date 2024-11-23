import { useForm, UseFormHandleSubmit, UseFormRegister, UseFormWatch } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface FormData {
    tokenId: string
    accountId: string
    amount?: string
    action: string
    path?: string
    payload?: string
    msg?: string
    approvalId?: string
    memo?: string
}

interface ManageNFTFormProps {
    onSubmit: (data: FormData) => void
    isProcessing: boolean
    register: UseFormRegister<FormData>
    handleSubmit: UseFormHandleSubmit<FormData>
    watch: UseFormWatch<FormData>
}

export function ManageNFTForm({ onSubmit, isProcessing, register, handleSubmit, watch }: ManageNFTFormProps) {
    const action = watch('action') || ''

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Manage NFT Keys</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="action">Action</Label>
                        <Select
                            value={action}
                            onValueChange={(value) => {
                                register('action').onChange({
                                    target: { value, name: 'action' }
                                })
                            }}
                        >
                            <SelectTrigger id="action">
                                <SelectValue placeholder="Select an action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="getPublicKey">Get Public Key</SelectItem>
                                <SelectItem value="signHash">Sign Hash</SelectItem>
                                <SelectItem value="approve">Approve</SelectItem>
                                <SelectItem value="checkApproval">Check Approval</SelectItem>
                                <SelectItem value="revoke">Revoke Approval</SelectItem>
                                <SelectItem value="revokeAll">Revoke All Approvals</SelectItem>
                                <SelectItem value="transfer">Transfer NFT</SelectItem>
                                <SelectItem value="storageDeposit">Storage Deposit</SelectItem>
                                <SelectItem value="storageWithdraw">Storage Withdraw</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="details">
                            <AccordionTrigger>Action Details</AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-4">
                                    {['getPublicKey', 'signHash', 'approve', 'checkApproval', 'revoke', 'revokeAll', 'transfer'].includes(action) && (
                                        <div className="space-y-2">
                                            <Label htmlFor="tokenId">Token ID</Label>
                                            <Input
                                                id="tokenId"
                                                placeholder="Enter token ID"
                                                {...register("tokenId", { required: true })}
                                            />
                                        </div>
                                    )}

                                    {['getPublicKey', 'signHash'].includes(action) && (
                                        <div className="space-y-2">
                                            <Label htmlFor="path">Derivation Path (optional)</Label>
                                            <Input
                                                id="path"
                                                placeholder="Enter derivation path"
                                                {...register("path")}
                                            />
                                        </div>
                                    )}

                                    {action === 'signHash' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="payload">Payload</Label>
                                            <Input
                                                id="payload"
                                                placeholder="Enter payload numbers (comma-separated)"
                                                {...register("payload", { required: true })}
                                            />
                                        </div>
                                    )}

                                    {['approve', 'checkApproval', 'revoke', 'transfer'].includes(action) && (
                                        <div className="space-y-2">
                                            <Label htmlFor="accountId">Account ID</Label>
                                            <Input
                                                id="accountId"
                                                placeholder="Enter account ID"
                                                {...register("accountId", { required: true })}
                                            />
                                        </div>
                                    )}

                                    {['approve'].includes(action) && (
                                        <div className="space-y-2">
                                            <Label htmlFor="msg">Message</Label>
                                            <Input
                                                id="msg"
                                                placeholder="Enter message"
                                                {...register("msg")}
                                            />
                                        </div>
                                    )}

                                    {['signHash', 'checkApproval', 'transfer'].includes(action) && (
                                        <div className="space-y-2">
                                            <Label htmlFor="approvalId">Approval ID (optional)</Label>
                                            <Input
                                                id="approvalId"
                                                placeholder="Enter approval ID"
                                                {...register("approvalId")}
                                            />
                                        </div>
                                    )}

                                    {['transfer'].includes(action) && (
                                        <div className="space-y-2">
                                            <Label htmlFor="memo">Memo (optional)</Label>
                                            <Input
                                                id="memo"
                                                placeholder="Enter memo"
                                                {...register("memo")}
                                            />
                                        </div>
                                    )}

                                    {['storageDeposit', 'storageWithdraw'].includes(action) && (
                                        <div className="space-y-2">
                                            <Label htmlFor="amount">Amount</Label>
                                            <Input
                                                id="amount"
                                                placeholder="Enter amount"
                                                {...register("amount", { required: true })}
                                            />
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <Button type="submit" disabled={isProcessing} className="w-full">
                        {isProcessing ? "Processing..." : "Submit"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}