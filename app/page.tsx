"use client";

import React, { useEffect, useState } from "react";
import initNear from "../config/near";
import { Account } from "near-api-js";

async function callContractFunction(account: Account) {
  const result = await account.functionCall({
    contractId: "multichain-testnet-2.testnet",
    methodName: "sign",
    args: {
      payload: [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3,
        4, 5, 6, 7, 8, 9, 0, 2,
      ],
      path: "test",
    },
    gas: "100000000000000",
    attachedDeposit: "0",
  });

  console.log("Function call result:", result);
}

export default function Home() {
  const [account, setAccount] = useState<Account | undefined>(undefined);

  useEffect(() => {
    const init = async () => {
      const { account } = await initNear();
      setAccount(account);
    };

    init();
  }, []);

  if (!account) return <div>Loading...</div>;

  return (
    <button onClick={() => callContractFunction(account)}>
      Log Account Keys
    </button>
  );
}
