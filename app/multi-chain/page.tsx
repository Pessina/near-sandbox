"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import Loader from "@/components/Loader";
import useInitNear from "@/hooks/useInitNear";
import Input from "@/components/Input";
import Select from "@/components/Select";

import Button from "@/components/Button";
import { LuCopy } from "react-icons/lu";
import { toast } from "react-toastify";
import {
  fetchBTCFeeProperties,
  fetchDerivedBTCAddressAndPublicKey,
  fetchDerivedEVMAddress,
  fetchEVMFeeProperties,
  signAndSendBTCTransaction,
  signAndSendEVMTransaction,
  ChainSignaturesContract,
  Cosmos,
  fetchDerivedCosmosAddressAndPublicKey, 
} from "multichain-tools";
import { ethers } from "ethers";
import { getBalance } from "@/utils/balance";

const chainsConfig = {
  ethereum: {
    providerUrl:
      "https://sepolia.infura.io/v3/6df51ccaa17f4e078325b5050da5a2dd",
    scanUrl: "https://etherscan.io",
    name: "ETH",
  },
  bsc: {
    providerUrl: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
    scanUrl: "https://testnet.bscscan.com",
    name: "BNB",
  },
  btc: {
    name: "BTC",
    networkType: "testnet" as const,
    // API ref: https://github.com/Blockstream/esplora/blob/master/API.md
    rpcEndpoint: "https://blockstream.info/testnet/api/",
    scanUrl: "https://blockstream.info",
  },
  cosmos: {
    name: "COSMOS",
    rpcEndpoint: "https://rpc.osmotest5.osmosis.zone/",
    restEndpoint: "https://lcd.osmotest5.osmosis.zone/",
    chainId: "osmo-test-5",
    scanUrl: "https://explorer.osmotest5.osmosis.zone",
    bech32Prefix: "osmo",
    denom: "uosmo",
    slip44: 118,
  },
};

enum Chain {
  ETH = "ETH",
  BNB = "BNB",
  BTC = "BTC",
  COSMOS = "COSMOS",
}

export default function Home() {
  const { register, handleSubmit } = useForm<Transaction>();
  const [isSendingTransaction, setIsSendingTransaction] = useState(false);
  const { account, isLoading: isNearLoading, connection } = useInitNear();
  const [derivedPath, setDerivedPath] = useState("");
  const [derivedAddress, setDerivedAddress] = useState("");
  const [accountBalance, setAccountBalance] = useState("");
  const [chain, setChain] = useState<Chain>(Chain.ETH);
  const [mpcPublicKey, setMpcPublicKey] = useState("");

  useEffect(() => {
    const getMpcPublicKey = async () => {
      if (!account) {
        return;
      }

      const mpcPublicKey = await ChainSignaturesContract.getRootPublicKey(
        process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
        'testnet',
      );

      if (!mpcPublicKey) {
        throw new Error("MPC Public Key not found");
      }  

      setMpcPublicKey(mpcPublicKey);
    };

    getMpcPublicKey();
  }, [account]);


  const onSubmit = useCallback(
    async (data: Transaction) => {
      if (!account?.accountId || !derivedPath || !mpcPublicKey || !connection) {
        throw new Error(
          "Required account information is missing. Please ensure that the account ID, derived path, MPC public key, and connection are available."
        );
      }

      setIsSendingTransaction(true);

      try {
        const nearAuthentication = {
          networkId: "testnet" as const,
          keypair: await connection.config.keyStore.getKey(
            "testnet",
            process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID!
          ), 
          accountId: account.accountId,
        };

        switch (chain) {
          case Chain.BNB:
          case Chain.ETH:
            await signAndSendEVMTransaction({
              transaction: {
                to: data.to,
                value: ethers.parseEther(data.value).toString(),
              },
              chainConfig: {
                providerUrl: chain === Chain.ETH ? chainsConfig.ethereum.providerUrl : chainsConfig.bsc.providerUrl,
                contract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
              },
              nearAuthentication,
              derivationPath: {
                chain: 60,
                domain: "",
                meta: {
                  path: derivedPath,
                }
              }
            }); 
            break;
          case Chain.BTC:
            await signAndSendBTCTransaction({
              chainConfig: {
                providerUrl: chainsConfig.btc.rpcEndpoint,
                contract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
                network: "testnet",
              },
              transaction: {
                to: data.to,
                value: data.value,
              },
              derivationPath: {
                chain: 0,
                domain: "",
                meta: {
                  path: derivedPath,
                }
              },
              nearAuthentication,
            });
            break;
          case Chain.COSMOS:
            const cosmos = new Cosmos({
              contract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
              chainId: chainsConfig.cosmos.chainId as any,
            });
            await cosmos.handleTransaction(
              {
                messages: [
                  {
                    typeUrl: "/cosmos.bank.v1beta1.MsgSend",
                    value: {
                      fromAddress: derivedAddress,
                      toAddress: data.to,
                      amount: [{ denom: "uosmo", amount: data.value }],
                    },
                  },
                ],
                memo: data.data || "",
              },
              nearAuthentication,
              {
                chain: 118,
                domain: "",
                meta: {
                  path: derivedPath,
                },
              }
            );
            break;
          default:
            throw new Error("Unsupported chain selected");
        }
      } catch (e) {
        console.error("Transaction failed:", e);
        // You might want to show an error message to the user here
      } finally {
        setIsSendingTransaction(false);
      }
    },
    [account?.accountId, chain, connection, derivedPath, mpcPublicKey, derivedAddress]
  );

  useEffect(() => {
    const getAddress = async () => {
      if (!account || !mpcPublicKey) {
        setDerivedAddress("");
        return;
      }

      let address = "";
      switch (chain) {
        case "BNB":
        case "ETH":
          console.log({account, derivedPath, contract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!})
          address = await fetchDerivedEVMAddress({
            signerId: account.accountId,
            path: {
              chain: 60,
              domain: "",
              meta: {
                path: derivedPath,
              }
            },
            nearNetworkId: "testnet",
            multichainContractId: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!
          });
          break;
        case "BTC":
          address = (
            await fetchDerivedBTCAddressAndPublicKey({
              signerId: account.accountId,
              path: {
                chain: 0,
                domain: "",
                meta: {
                  path: derivedPath,
                }
              },
              btcNetworkId:  'testnet',
              nearNetworkId: "testnet",
              multichainContractId: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!
            })
          ).address;
          break;
        case "COSMOS":
          const { address: cosmosAddress } = await fetchDerivedCosmosAddressAndPublicKey({
            signerId: account.accountId,
            path: {
              chain: 118,
              domain: "",
              meta: {
                path: derivedPath,
              }
            },
            nearNetworkId: "testnet",
            multichainContractId: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
            prefix: "osmo",
          });
          address = cosmosAddress;
          break;
      }

      setDerivedAddress(address);
    };

    getAddress();
  }, [account, chain, derivedPath, mpcPublicKey]);

  const getAccountBalance = useCallback(async () => {
    let balance = "";
    try {
      switch (chain) {
        case "ETH":
          balance = await getBalance("ETH", chainsConfig.ethereum.providerUrl, derivedAddress);
          balance = `${parseFloat(balance).toFixed(8)} ETH`;
          break;
        case "BTC":
          balance = await getBalance("BTC", chainsConfig.btc.rpcEndpoint, derivedAddress);
          balance = `${balance} BTC`;
          break;
        case "BNB":
          balance = await getBalance("BNB", chainsConfig.bsc.providerUrl, derivedAddress);
          balance = `${parseFloat(balance).toFixed(8)} BNB`;
          break;
        case "COSMOS":
          balance = await getBalance("COSMOS", chainsConfig.cosmos.restEndpoint, derivedAddress, { denom: "uosmo" });
          balance = `${balance} COSMOS`;
          break;
        default:
          throw new Error('Unsupported chain');
      }
      setAccountBalance(balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setAccountBalance('Error');
    }
  }, [chain, derivedAddress]);

  const getFeeRate = useCallback(async () => {
    let feeRate: any;
    switch (chain) {
      case "BNB":
      case "ETH":
        feeRate = await fetchEVMFeeProperties(
          chainsConfig.ethereum.providerUrl,
          {
            to: "0x0987654321098765432109876543210987654321",
            value: ethers.parseEther("1"),
          }
        );
        break;
      case "BTC":
        feeRate = await fetchBTCFeeProperties(
          chainsConfig.btc.rpcEndpoint,
          "tb1qz9f5pqk3t0lhrsuppyzrctdtrtlcewjhy0jngu",
          [{ address: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2", value: 10000 }]
        );
        break;
      case "COSMOS":
        // Implement COSMOS fee rate fetching here
        feeRate = "Not implemented for COSMOS";
        break;
    }

    console.log({ feeRate });
  }, [chain]);

  return (
    <div className="h-screen w-full flex justify-center items-center">
      {!account || isNearLoading || !mpcPublicKey ? (
        <Loader />
      ) : (
        <div className="flex flex-col gap-4">
          <Select
            label="Chain"
            placeholder="Select chain"
            className="mb-2"
            value={chain}
            onChange={(e) => {
              setAccountBalance("");
              setChain(e.target.value as Chain);
            }}
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
                onClick: () => {
                  navigator.clipboard.writeText(derivedAddress ?? "");
                  toast.success("Text copied!");
                },
              }}
            />
            <Button onClick={getAccountBalance} className="h-[38px] self-end">
              Check Balance
            </Button>
            <Input
              label="Balance"
              name="balance"
              value={accountBalance}
              disabled
            />
            <Button onClick={getFeeRate} className="h-[38px] self-end">
              Check fee rate
            </Button>
          </div>
          <h2 className="text-white text-2xl font-bold">Transaction</h2>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <Input
              label="Address"
              {...register("to")}
              placeholder="To Address"
            />
            <Input label="Value" {...register("value")} placeholder="Value" />
            <Input label="Data" {...register("data")} placeholder="0x" />
            <Button type="submit" isLoading={isSendingTransaction}>
              Send Transaction
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
