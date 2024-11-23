import { useForm, UseFormHandleSubmit, UseFormRegister, UseFormWatch } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { watch } from "fs"
import { register } from "module"

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
    console.log({ action })

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage NFT Keys</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Select
                        value={watch('action')}
                        onValueChange={(value) => {
                            register('action').onChange({
                                target: { value, name: 'action' }
                            })
                        }}
                    >
                        <SelectTrigger>
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

                    {['getPublicKey', 'signHash', 'approve', 'checkApproval', 'revoke', 'revokeAll', 'transfer'].includes(action) && (
                        <Input
                            placeholder="Enter token ID"
                            {...register("tokenId", { required: true })}
                        />
                    )}

                    {['getPublicKey', 'signHash'].includes(action) && (
                        <Input
                            placeholder="Enter derivation path (optional)"
                            {...register("path")}
                        />
                    )}

                    {action === 'signHash' && (
                        <Input
                            placeholder="Enter payload numbers (comma-separated)"
                            {...register("payload", { required: true })}
                        />
                    )}

                    {['approve', 'checkApproval', 'revoke', 'transfer'].includes(action) && (
                        <Input
                            placeholder="Enter account ID"
                            {...register("accountId", { required: true })}
                        />
                    )}

                    {['approve'].includes(action) && (
                        <Input
                            placeholder="Enter message"
                            {...register("msg")}
                        />
                    )}

                    {['signHash', 'checkApproval', 'transfer'].includes(action) && (
                        <Input
                            placeholder="Enter approval ID (optional)"
                            {...register("approvalId")}
                        />
                    )}

                    {['transfer'].includes(action) && (
                        <Input
                            placeholder="Enter memo (optional)"
                            {...register("memo")}
                        />
                    )}

                    {action === 'storageDeposit' && (
                        <Input
                            placeholder="Enter amount for storage deposit"
                            {...register("amount", { required: true })}
                        />
                    )}

                    {action === 'storageWithdraw' && (
                        <Input
                            placeholder="Enter amount for storage withdrawal"
                            {...register("amount", { required: true })}
                        />
                    )}

                    <Button type="submit" disabled={isProcessing}>
                        {isProcessing ? "Processing..." : "Submit"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
} 