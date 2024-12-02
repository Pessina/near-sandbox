import axios from "axios";

interface KrnlResponse {
  jsonrpc: string;
  id: string;
  result?: {
    kernel_params: string;
    kernel_responses: string;
    auth: string;
  };
  error?: {
    code: number;
    message: string;
  };
}

export async function getBalanceBTC(address: string): Promise<KrnlResponse> {
  try {
    const response = await axios.post<KrnlResponse>(
      "https://devnet.node.lat:8545/",
      {
        jsonrpc: "2.0",
        id: "krnl",
        method: "krnl_executeKernels",
        params: [
          "0x195345301a3b0a0b8fa2d0319ca801e0830e2b6ae174b1214b142542f9a1da5f",
          "0x30440220296818987f4ad64da4dc42232efa8f92080feebfa8a55ce773c324ead709b2ac022037af35e777c616114ef2fbb9a3e4fbf3f5a6c1078fd596733c747c919809e604",
          {
            senderAddress: "0x4174678c78fEaFd778c1ff319D5D326701449b25",
            kernelPayload: {
              "268": {
                parameters: {
                  header: {},
                  body: {},
                  query: {},
                  path: { addr: address },
                },
              },
            },
          },
          "0x00000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000000000000000001",
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
    throw error;
  }
}

export async function getBalanceETH(address: string): Promise<KrnlResponse> {
  try {
    const response = await axios.post<KrnlResponse>(
      "https://devnet.node.lat:8545/",
      {
        jsonrpc: "2.0",
        id: "krnl",
        method: "krnl_executeKernels",
        params: [
          "0xaa5c890cea8863a932f36f1147502b3da726958163dcacc12eae5a5a4e716fe9",
          "0x3044022016c353d8f767b5470d4a6625c1cee5369643d4afff03699b147a89c2b404148c02207aecb3c00af39fffa99c61f7a31cab4d7749607c92aa7cd10f137d82bfe49920",
          {
            senderAddress: "0x4174678c78fEaFd778c1ff319D5D326701449b25",
            kernelPayload: {
              "269": {
                parameters: {
                  header: {},
                  body: {},
                  query: {},
                  path: { addr: address },
                },
              },
            },
          },
          "0x00000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000000000000000001",
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
    throw error;
  }
}
