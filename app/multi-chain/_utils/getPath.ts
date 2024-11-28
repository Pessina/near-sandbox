import { CHAIN_CONFIGS } from "@/app/constants/chains";
import { getCanonicalizedDerivationPath } from "@/lib/canonicalize";
import { Chain } from "@/app/constants/chains";

export const getPath = (chain: Chain, derivedPath: string) => {
  const chainConfig = CHAIN_CONFIGS[chain];
  return getCanonicalizedDerivationPath({
    chain: chainConfig.chainId,
    domain: "",
    meta: { path: derivedPath },
  });
};
