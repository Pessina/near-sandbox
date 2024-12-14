"use client"

import { WagmiProvider as WagmiConfig, createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { type ReactNode } from 'react'

const config = createConfig({
    chains: [mainnet, sepolia],
    transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http()
    }
})

export function WagmiProvider({ children }: { children: ReactNode }) {
    return (
        <WagmiConfig config={config}>
            {children}
        </WagmiConfig>
    )
}
