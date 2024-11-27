"use client";

import React, { useState, useCallback } from "react";
import { useAccountBalance } from "./_hooks/useAccountBalance";
import { useDeriveAddressAndPublicKey } from "./_hooks/useDeriveAddressAndPublicKey";
import { TransactionForm } from "./_components/TransactionForm";
import { Chain } from "./_constants/chains";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Copy, Wallet } from 'lucide-react';
import { useAuth } from "@/providers/AuthProvider";

export default function MultiChain() {
  const { accountId, walletSelector } = useAuth()
  const [derivedPath, setDerivedPath] = useState("");
  const [chain, setChain] = useState<Chain>(Chain.ETH);
  const { toast } = useToast();

  const derivedAddressAndPublicKey = useDeriveAddressAndPublicKey(accountId ?? '', chain, derivedPath);
  const { accountBalance, getAccountBalance } = useAccountBalance(chain, derivedAddressAndPublicKey?.address ?? '');

  const handleChainChange = useCallback((value: string) => {
    setChain(value as Chain);
  }, []);

  const handleCopyAddress = useCallback(() => {
    if (derivedAddressAndPublicKey?.address) {
      navigator.clipboard.writeText(derivedAddressAndPublicKey.address);
      toast({
        title: "Address copied!",
        description: "The derived address has been copied to your clipboard.",
      });
    }
  }, [derivedAddressAndPublicKey?.address, toast]);

  if (!walletSelector?.isSignedIn()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="mb-4">Please sign in to continue</div>
        <Button
          onClick={async () => {
            const wallet = await walletSelector?.wallet('my-near-wallet');
            await wallet?.signIn({
              contractId: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
              accounts: []
            });
          }}
        >
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex justify-center items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">MultiChain Signatures</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Select value={chain} onValueChange={handleChainChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select chain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={Chain.ETH}>ETH</SelectItem>
              <SelectItem value={Chain.BTC}>BTC</SelectItem>
              <SelectItem value={Chain.BNB}>BNB</SelectItem>
              <SelectItem value={Chain.OSMOSIS}>OSMOSIS</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="derivedPath" className="text-sm font-medium text-gray-200">Path</label>
              <Input
                id="derivedPath"
                value={derivedPath}
                onChange={(e) => setDerivedPath(e.target.value)}
                placeholder="Enter derived path"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="derivedAddress" className="text-sm font-medium text-gray-200">Derived Address</label>
              <div className="relative">
                <Input
                  id="derivedAddress"
                  value={derivedAddressAndPublicKey?.address || ""}
                  readOnly
                  className="pr-10"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-0 top-0 h-full"
                  onClick={handleCopyAddress}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button onClick={getAccountBalance} className="w-full">
                <Wallet className="mr-2 h-4 w-4" />
                Check Balance
              </Button>
              <Input
                value={accountBalance || ""}
                readOnly
                className="text-right"
                placeholder="Balance"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Transaction</h2>
            <TransactionForm
              chain={chain}
              derivedPath={derivedPath}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}