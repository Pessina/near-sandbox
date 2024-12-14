"use client";

import { CHAINS } from "@/constants/chains";
import { getCanonicalizedDerivationPath } from "@/lib/canonicalize";
import { Chain } from "@/constants/chains";

export const getPath = (chain: Chain, derivedPath: string) => {
  const chainConfig = CHAINS[chain];
  return getCanonicalizedDerivationPath({
    chain: chainConfig.slip44,
    domain: "",
    meta: { path: derivedPath },
  });
};
