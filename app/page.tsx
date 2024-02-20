"use client";

import React, { useEffect, useState } from "react";
import initNear from "../config/near";
import { Account } from "near-api-js";
import Loader from "@/components/Loader";

export default function Home() {
  const [account, setAccount] = useState<Account | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { account } = await initNear();
      setAccount(account);
    };

    init();
  }, []);

  async function callContractFunction(account: Account) {
    setIsLoading(true);
    const result = await account.functionCall({
      contractId: "multichain-testnet-2.testnet",
      methodName: "sign",
      args: {
        payload: Array.from({ length: 32 }, () =>
          Math.floor(Math.random() * 64)
        ),
        path: "test",
      },
      gas: "100000000000000",
      attachedDeposit: "0",
    });

    if ("SuccessValue" in (result.status as any)) {
      const successValue = (result.status as any).SuccessValue;
      const decodedValue = Buffer.from(successValue, "base64").toString(
        "utf-8"
      );

      console.log(JSON.parse(decodedValue));
    }

    setIsLoading(false);
  }

  return (
    <div className="h-screen w-full flex justify-center items-center">
      {!account || isLoading ? (
        <Loader />
      ) : (
        <button onClick={() => callContractFunction(account)}>
          Send transaction
        </button>
      )}
    </div>
  );
}
