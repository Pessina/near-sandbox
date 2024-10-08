"use client";

import React from "react";
import { useForm } from "react-hook-form";
import Button from "@/components/Button";
import Input from "@/components/Input";
import useInitNear from "@/hooks/useInitNear";
import {
  encodeSignedDelegate,
  Action,
  FunctionCall,
} from "@near-js/transactions";
import { BN } from "bn.js";

type FormsData = {
  message: string;
};

const NearPage = () => {
  const { register, handleSubmit } = useForm<FormsData>();

  const { account } = useInitNear();

  const showNonce = async () => {
    if (!account) return;

    const keys = await account.findAccessKey("", []);
    console.log("Access key nonce: ", keys.accessKey.nonce);
  };

  const onSubmit = async (data: FormsData) => {
    if (!account) return;

    try {
      const keys = await account.findAccessKey("", []);
      console.log("Access key nonce: ", keys.accessKey.nonce);

      const signedDelegate = await account.signedDelegate({
        receiverId: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
        actions: [
          new Action({
            functionCall: new FunctionCall({
              methodName: "sign",
              args: new Uint8Array(Array.from(
                JSON.stringify({
                  payload: [
                    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
                    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2,
                  ],
                  path: "test",
                })
              ).map((char) => char.charCodeAt(0))),
              gas: BigInt("300000000000000"),
              deposit: BigInt("0"),
            })
          })
        ],
        blockHeightTtl: 60,
      });

      console.log(
        "Signed delegate nonce: ",
        signedDelegate.delegateAction.nonce
      );

      const res = await fetch(
        "http://near-relayer-testnet.api.pagoda.co/relay",
        {
          method: "POST",
          mode: "cors",
          body: JSON.stringify(
            Array.from(encodeSignedDelegate(signedDelegate))
          ),
          headers: new Headers({ "Content-Type": "application/json" }),
        }
      );

      console.log(await res.text());
    } catch (error) {
      console.error("Error sending delegate action:", error);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="w-full max-w-xs">
        <h1 className="text-center text-2xl font-bold mb-4">
          NEAR Delegate Example
        </h1>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Message"
            {...register("message")}
            placeholder="Enter a message"
            className="mb-4"
          />
          <Button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Delegate
          </Button>
        </form>
        <Button
          type="button"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          onClick={showNonce}
        >
          Nonce
        </Button>
      </div>
    </div>
  );
};

export default NearPage;
