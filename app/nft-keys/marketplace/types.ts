import { Chain } from "@/constants/chains";
import { KeyDerivationPath } from "multichain-tools";
import { NFT } from "../_contract/NFTKeysContract";

export interface NFTWithPrice extends NFT {
  price?: string;
  token?: string;
  path?: KeyDerivationPath;
}

export interface FormData {
  tokenId: string;
  path: string;
  token: Chain;
  saleConditions: {
    token: Chain;
    amount: string;
  };
}

export interface TransactionData {
  to: string;
  value: string;
}

export interface DerivedKeys {
  address: string;
  publicKey: string;
}
