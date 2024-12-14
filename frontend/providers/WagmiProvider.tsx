"use client"

import { WagmiProvider as WagmiConfig, createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'

const config = createConfig({
    chains: [sepolia],
    transports: {
        [sepolia.id]: http()
    },
})

export const WagmiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    return (
        <WagmiConfig config={config}>
            {children}
        </WagmiConfig>
    )
}
