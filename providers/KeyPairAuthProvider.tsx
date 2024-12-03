"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Account, Near } from 'near-api-js';
import useInitNear from '@/hooks/useInitNear';

interface KeyPairAuthContextType {
    selectedAccount: Account | null;
    setSelectedAccount: (account: Account | null) => void;
    accounts: Account[];
    isLoading: boolean;
    connection: Near | undefined;
}

const KeyPairAuthContext = createContext<KeyPairAuthContextType | undefined>(undefined);

export const KeyPairAuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const { accounts, connection, isLoading } = useInitNear({ isViewOnly: false });

    useEffect(() => {
        if (!selectedAccount && accounts && accounts.length > 0) {
            setSelectedAccount(accounts[0]);
        }
    }, [accounts, selectedAccount]);

    return (
        <KeyPairAuthContext.Provider
            value={{
                selectedAccount,
                setSelectedAccount,
                accounts: accounts || [],
                isLoading,
                connection
            }}
        >
            {children}
        </KeyPairAuthContext.Provider>
    );
};

export const useKeyPairAuth = (): KeyPairAuthContextType => {
    const context = useContext(KeyPairAuthContext);
    if (context === undefined) {
        throw new Error('useKeyPairAuth must be used within a KeyPairAuthProvider');
    }
    return context;
};
