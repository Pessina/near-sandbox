"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useInitNear from "@/hooks/useInitNear";
import BN from "bn.js";
import {
    encodeSignedDelegate,
    Action,
    FunctionCall,
} from "@near-js/transactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useKeyPairAuth } from "@/providers/KeyPairAuthProvider";

type FormsData = {
    message: string;
};

const NearPage = () => {
    const { register, handleSubmit } = useForm<FormsData>();

    const { accounts } = useKeyPairAuth();
    const account = accounts?.[0];

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
                            args: new Uint8Array(
                                Array.from(
                                    JSON.stringify({
                                        payload: [
                                            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
                                            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2,
                                        ],
                                        path: "test",
                                    })
                                ).map((char) => char.charCodeAt(0))
                            ),
                            gas: BigInt("300000000000000"),
                            deposit: BigInt("0"),
                        }),
                    }),
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
        <div className="grow flex flex-col items-center justify-center">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">NEAR Delegate Example</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {!account && (
                        <p className="text-red-500 mb-4 text-center">
                            Please connect your NEAR wallet to continue
                        </p>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="message" className="text-sm font-medium text-gray-200">
                                Message
                            </label>
                            <Input
                                id="message"
                                {...register("message")}
                                placeholder="Enter your message here"
                            />
                        </div>

                        <div className="flex flex-col gap-4">
                            <Button
                                type="submit"
                                disabled={!account}
                                className="w-full"
                            >
                                Sign & Delegate
                            </Button>

                            <Button
                                type="button"
                                onClick={showNonce}
                                disabled={!account}
                                variant="secondary"
                                className="w-full"
                            >
                                Show Nonce
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default NearPage;
