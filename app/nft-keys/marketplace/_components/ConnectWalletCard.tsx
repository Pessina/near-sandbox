import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet } from 'lucide-react'

export function ConnectWalletCard() {
    return (
        <Card className="max-w-md mx-auto mt-20">
            <CardHeader>
                <CardTitle>Not Connected</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-4">
                    Please connect your NEAR wallet to access the NFT Keys Marketplace.
                </p>
                <Button className="w-full">
                    <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
                </Button>
            </CardContent>
        </Card>
    )
} 