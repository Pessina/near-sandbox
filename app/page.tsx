"use client";

import React, { useState } from "react";
import { Account } from "near-api-js";
import Loader from "@/components/Loader";
import { sign } from "@/utils/near";
import useInitNear from "@/hooks/useInitNear";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const { account, isLoading: isNearLoading } = useInitNear();

  async function callContractFunction(account: Account) {
    setIsLoading(true);
    try {
      const result = await sign(
        account,
        [
          0, 1, 2, 3, 4, 5, 6, 77, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2,
          3, 4, 5, 6, 7, 8, 9, 0, 1,
        ],
        "test"
      );

      if (result) {
        console.log(JSON.parse(result));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="h-screen w-full flex justify-center items-center">
      {!account || isLoading || isNearLoading ? (
        <Loader />
      ) : (
        <button onClick={() => callContractFunction(account)}>Call Sign</button>
      )}
    </div>
  );
}
