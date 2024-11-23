import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface RegisterMarketplaceCardProps {
    onRegister: () => void
    isProcessing: boolean
}

export function RegisterMarketplaceCard({ onRegister, isProcessing }: RegisterMarketplaceCardProps) {
    return (
        <Card className="max-w-md mx-auto mt-20">
            <CardHeader>
                <CardTitle>Marketplace Registration</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-4">
                    Register to start trading NFT Keys on our marketplace.
                </p>
                <Button onClick={onRegister} disabled={isProcessing} className="w-full">
                    {isProcessing ? 'Registering...' : 'Register to Marketplace'}
                </Button>
            </CardContent>
        </Card>
    )
} 