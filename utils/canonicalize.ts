import canonicalize from "canonicalize";
import pickBy from "lodash.pickby";
import { KeyDerivationPath } from "multichain-tools";

export const getCanonicalizedDerivationPath = (
  derivationPath: KeyDerivationPath
): string =>
  canonicalize(
    pickBy(
      {
        chain: derivationPath.chain,
        domain: derivationPath.domain,
        meta: derivationPath.meta,
      },
      (v: any) => v !== undefined && v !== null
    )
  ) ?? "";
