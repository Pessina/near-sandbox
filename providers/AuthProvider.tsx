"use client";

import { NetworkId, setupWalletSelector, WalletSelector } from '@near-wallet-selector/core';
// import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
    walletSelector: WalletSelector | null;
    accountId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [walletSelector, setWalletSelector] =
        useState<WalletSelector | null>(null);
    const [accountId, setAccountId] = useState<string | null>(null);

    useEffect(() => {
        async function init() {
            const selector = await setupWalletSelector({
                network: process.env.NEXT_PUBLIC_NETWORK_ID! as NetworkId,
                modules: [
                    setupMyNearWallet(),
                ],
            });

            setWalletSelector(selector)
        }

        init();
    }, []);

    useEffect(() => {
        const fetchAccountId = async () => {
            const wallet = await walletSelector?.wallet();
            wallet?.getAccounts().then((accounts) => {
                setAccountId(accounts[0]?.accountId || null)
            })
        }

        fetchAccountId();
    }, [walletSelector])

    return (
        <AuthContext.Provider
            value={{
                walletSelector,
                accountId,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};
