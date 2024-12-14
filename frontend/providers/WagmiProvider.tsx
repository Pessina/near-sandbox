"use client"

import { WagmiProvider as WagmiConfig, createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { type ReactNode } from 'react'
import { metaMask } from 'wagmi/connectors'

const config = createConfig({
    chains: [sepolia],
    transports: {
        [sepolia.id]: http()
    },
    connectors: [
        metaMask()
    ]
})

export function WagmiProvider({ children }: { children: ReactNode }) {
    return (
        <WagmiConfig config={config}>
            {children}
        </WagmiConfig>
    )
}
