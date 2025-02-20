import { Chain } from "@/constants/chains";
import { KeyDerivationPath } from "signet.js";
import { NFT } from "../../../contracts/NFTKeysContract";

interface SaleConditions {
  token: string;
  amount: string;
}

export interface NFTListed extends NFT {
  token?: string;
  path?: KeyDerivationPath;
  saleConditions?: SaleConditions;
}

export interface FormData {
  tokenId: string;
  path: string;
  token: Chain;
  saleConditions: SaleConditions;
}

export interface TransactionData {
  to: string;
  value: string;
}

export interface DerivedKeys {
  address: string;
  publicKey: string;
}
