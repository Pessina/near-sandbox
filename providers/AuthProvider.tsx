import { setupWalletSelector, WalletSelector } from '@near-wallet-selector/core';
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import React, { createContext, useContext, useEffect, useState } from 'react';

const networkId = (import.meta as any).env.VITE_NETWORK_ID || 'testnet';

interface AuthContextType {
    walletSelector: WalletSelector | null;
    signedIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [walletSelector, setWalletSelector] =
        useState<WalletSelector | null>(null);
    const [signedIn, setSignedIn] = useState(false);

    useEffect(() => {
        async function init() {
            const selector = await setupWalletSelector({
                network: networkId,
                modules: [
                    setupMeteorWallet(),
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
                setSignedIn(!!accounts[0]?.accountId)
            })
        }

        fetchAccountId();
    }, [walletSelector])

    return (
        <AuthContext.Provider
            value={{
                walletSelector,
                signedIn,
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
