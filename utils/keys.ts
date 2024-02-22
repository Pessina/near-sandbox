import * as borsh from "borsh";

const schema = {
  struct: {
    asset: "string",
    domain: "string",
  },
};

export function serializeKeyPath(asset: string, domain: string): string {
  const serializedData = borsh.serialize(schema, { asset, domain });
  const base64EncodedData = Buffer.from(serializedData).toString("base64");

  return base64EncodedData;
}
