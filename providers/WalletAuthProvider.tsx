"use client";

import { useEnv } from '@/hooks/useEnv';
import { NetworkId, setupWalletSelector, WalletSelector } from '@near-wallet-selector/core';
// import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import React, { createContext, useContext, useEffect, useState } from 'react';

interface WalletAuthContextType {
    walletSelector: WalletSelector | null;
    accountId: string | null;
}

const WalletAuthContext = createContext<WalletAuthContextType | undefined>(undefined);

export const WalletAuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [walletSelector, setWalletSelector] =
        useState<WalletSelector | null>(null);
    const [accountId, setAccountId] = useState<string | null>(null);
    const { nearNetworkId } = useEnv();

    useEffect(() => {
        async function init() {
            const selector = await setupWalletSelector({
                network: nearNetworkId,
                modules: [
                    setupMyNearWallet(),
                ],
            });

            setWalletSelector(selector)
        }

        init();
    }, [nearNetworkId]);

    useEffect(() => {
        // TODO: cache the accountId (maybe React Query)
        const fetchAccountId = async () => {
            const wallet = await walletSelector?.wallet();
            wallet?.getAccounts().then((accounts) => {
                setAccountId(accounts[0]?.accountId || null)
            })
        }

        fetchAccountId();
    }, [walletSelector])

    return (
        <WalletAuthContext.Provider
            value={{
                walletSelector,
                accountId,
            }}
        >
            {children}
        </WalletAuthContext.Provider>
    );
};

export const useWalletAuth = (): WalletAuthContextType => {
    const context = useContext(WalletAuthContext);
    if (context === undefined) {
        throw new Error('useWalletAuth must be used within an WalletAuthProvider');
    }

    return context;
};
