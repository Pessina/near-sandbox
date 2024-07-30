import { Account, Connection, Contract } from '@near-js/accounts'
import { InMemoryKeyStore } from '@near-js/keystores'
import BN from 'bn.js'

type MultiChainContract = Contract & {
  public_key: () => Promise<string>
  sign: (args: {
    args: {
      payload: number[]
      path: string
      key_version: number
    }
    gas: BN
  }) => Promise<[string, string]>
}

const getMultichainContract = (
  account: Account,
  contract: string
): MultiChainContract => {
  return new Contract(account, contract, {
    viewMethods: ['public_key'],
    changeMethods: ['sign'],
  }) as MultiChainContract
}

export async function getRootPublicKey(
  account: Account,
  contract: string
): Promise<string | undefined> {
  const multichainContractAcc = getMultichainContract(account, contract)

  try {
    return await multichainContractAcc.public_key()
  } catch (error) {
    console.error("Error fetching root public key:", error)
    return undefined
  }
}
