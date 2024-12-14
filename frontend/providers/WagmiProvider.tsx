"use client"

import { WagmiProvider as WagmiConfig, createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const config = createConfig({
    chains: [sepolia],
    transports: {
        [sepolia.id]: http()
    },
})

const queryClient = new QueryClient();

export const WagmiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    return (
        <WagmiConfig config={config}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiConfig>
    )
}
