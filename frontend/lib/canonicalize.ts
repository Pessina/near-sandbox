import canonicalize from "canonicalize";
import pickBy from "lodash.pickby";

export const getCanonicalizedDerivationPath = (derivationPath: {
  chain: number;
  domain: string;
  meta: {
    path: string;
  };
}): string =>
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
