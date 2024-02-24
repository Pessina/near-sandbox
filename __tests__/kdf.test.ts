import { describe, it, expect } from "vitest";
import { deriveEpsilon, deriveKey } from "../utils/kdf/kdf";
import { Account } from "near-api-js";
import { beforeEach } from "node:test";
import initNear from "@/config/near";

let account: Account;

beforeEach(() => {
  const account = initNear("felipe-sandbox.testnet");
});

describe("KDF Utilities", () => {});
