"use client";

import React, { useState, useCallback } from "react";
import useInitNear from "@/hooks/useInitNear";
import { useAccountBalance } from "./_hooks/useAccountBalance";
import { useDerivedAddress } from "./_hooks/useDerivedAddress";
import { TransactionForm } from "./_components/TransactionForm";
import { Chain } from "./_constants/chains";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Copy, Wallet } from 'lucide-react';

export default function MultiChain() {
  const { account, isLoading: isNearLoading } = useInitNear();
  const [derivedPath, setDerivedPath] = useState("");
  const [chain, setChain] = useState<Chain>(Chain.ETH);
  const { toast } = useToast();

  const derivedAddress = useDerivedAddress(account, chain, derivedPath);
  const { accountBalance, getAccountBalance } = useAccountBalance(chain, derivedAddress);

  const handleChainChange = useCallback((value: string) => {
    setChain(value as Chain);
  }, []);

  const handleCopyAddress = useCallback(() => {
    if (derivedAddress) {
      navigator.clipboard.writeText(derivedAddress);
      toast({
        title: "Address copied!",
        description: "The derived address has been copied to your clipboard.",
      });
    }
  }, [derivedAddress, toast]);

  if (!account || isNearLoading) {
    return (
      <div className="h-screen w-full flex justify-center items-center bg-gray-900">
        <Skeleton className="h-[600px] w-[400px] rounded-xl" />
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
                  value={derivedAddress || ""}
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