import axios from 'axios';
import { ethers } from 'ethers';

export async function getEVMBalance(providerUrl: string, address: string): Promise<string> {
  const provider = new ethers.JsonRpcProvider(providerUrl);
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

export async function getBTCBalance(rpcEndpoint: string, address: string): Promise<string> {
  try {
    const response = await axios.get(`https://blockstream.info/testnet/api/address/${address}/utxo`);
    const utxos = response.data;
    const totalSatoshis = utxos.reduce((acc: number, utxo: any) => acc + utxo.value, 0);
    return (totalSatoshis / 100000000).toFixed(8); // Convert satoshis to BTC and format to 8 decimal places
  } catch (error) {
    console.error('Error fetching BTC balance:', error);
    return '0';
  }
}

export async function fetchCosmosBalance(
  address: string,
  restUrl: string,
  denom?: string
): Promise<string> {
  try {
    if (!denom) {
      throw new Error('Denom is required for Cosmos balance fetching')
    }

    const balanceUrl = `${restUrl}/cosmos/bank/v1beta1/balances/${address}`
    const response = await axios.get(balanceUrl)

    const balances = response.data.balances
    const balance = balances.find((b: any) => b.denom === denom)

    if (balance) {
      return balance.amount
    } else {
      return '0'
    }
  } catch (error) {
    console.error('Failed to fetch Cosmos balance:', error)
    throw new Error('Failed to fetch Cosmos balance')
  }
}

export async function getBalance(chain: string, providerUrl: string, address: string, config?: {
  denom?: string
}): Promise<string> {
  switch (chain) {
    case 'ETH':
    case 'BNB':
      return await getEVMBalance(providerUrl, address);
    case 'BTC':
      return await getBTCBalance(providerUrl, address);
    case 'COSMOS':
      return await fetchCosmosBalance(address, providerUrl, config?.denom);
    default:
      throw new Error('Unsupported chain');
  }
}
