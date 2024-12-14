"use client"

import Bridge from "./_components/Bridge"
import TxParser from "./_components/TxParser"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function BridgePage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6 text-center">Cross-Chain Bridge</h1>
            <Tabs defaultValue="bridge" className="w-full max-w-4xl mx-auto">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="bridge">Bridge Tokens</TabsTrigger>
                    <TabsTrigger value="parser">Transaction Parser</TabsTrigger>
                </TabsList>
                <TabsContent value="bridge">
                    <Bridge />
                </TabsContent>
                <TabsContent value="parser">
                    <TxParser />
                </TabsContent>
            </Tabs>
        </div>
    )
}