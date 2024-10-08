// src/pages/index.tsx
"use client";

import React, { useState, useCallback } from "react";
import Loader from "@/components/Loader";
import useInitNear from "@/hooks/useInitNear";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Button from "@/components/Button";
import { LuCopy } from "react-icons/lu";
import { toast } from "react-toastify";
import { TransactionForm } from "./components/TransactionForm";
import { Chain } from "./constants/chains";
import { useAccountBalance } from "./hooks/useAccountBalance";
import { useDerivedAddress } from "./hooks/useDerivedAddress";
import { useMpcPublicKey } from "./hooks/useMpcPublicKey";

export default function Home() {
  const { account, isLoading: isNearLoading } = useInitNear();
  const [derivedPath, setDerivedPath] = useState("");
  const [chain, setChain] = useState<Chain>(Chain.ETH);

  const mpcPublicKey = useMpcPublicKey(account);
  const derivedAddress = useDerivedAddress(account, chain, derivedPath, mpcPublicKey);
  const { accountBalance, getAccountBalance } = useAccountBalance(chain, derivedAddress);

  const handleChainChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setChain(e.target.value as Chain);
  }, []);

  const handleCopyAddress = useCallback(() => {
    navigator.clipboard.writeText(derivedAddress ?? "");
    toast.success("Address copied!");
  }, [derivedAddress]);

  if (!account || isNearLoading || !mpcPublicKey) {
    return (
      <div className="h-screen w-full flex justify-center items-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex justify-center items-center">
      <div className="flex flex-col gap-4 w-full max-w-md p-6 bg-gray-800 rounded-lg shadow-xl">
        <Select
          label="Chain"
          placeholder="Select chain"
          className="mb-2"
          value={chain}
          onChange={handleChainChange}
          options={[
            { value: Chain.ETH, label: "ETH" },
            { value: Chain.BTC, label: "BTC" },
            { value: Chain.BNB, label: "BNB" },
            { value: Chain.COSMOS, label: "COSMOS" },
          ]}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Path"
            name="derivedPath"
            value={derivedPath}
            onChange={(e) => setDerivedPath(e.target.value)}
          />
          <Input
            label="Derived Address"
            name="derivedAddress"
            value={derivedAddress}
            disabled
            icon={{
              icon: <LuCopy />,
              onClick: handleCopyAddress,
            }}
          />
          <Button onClick={getAccountBalance} className="flex-1">
            Check Balance
          </Button>
          <Input
            label="Balance"
            name="balance"
            value={accountBalance}
            disabled
            className="flex-1"
          />
        </div>
        <h2 className="text-white text-2xl font-bold mt-6">Transaction</h2>
        <TransactionForm
          chain={chain}
          derivedPath={derivedPath}
        />
      </div></div>
  );
}