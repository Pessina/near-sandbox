import Web3 from "web3";
import { ethers } from "ethers";

async function createAndTransfer() {
  // Initialize web3 with Infura
  const web3 = new Web3(process.env.NEXT_PUBLIC_INFURA_URL);
  const wallet = ethers.Wallet.fromMnemonic(process.env.NEXT_PUBLIC_MNEMONIC);

  // Create two accounts
  const account1 = web3.eth.accounts.create();
  const account2 = web3.eth.accounts.create();

  // Transfer Ether from the wallet to account1
  // const transfer = await web3.eth.sendTransaction({
  //   from: wallet.address,
  //   to: account1.address,
  //   value: web3.utils.toWei("0.01", "ether"),
  //   gas: "21000",
  //   gasPrice: "30000000000",
  // });

  // console.log(`Transfer successful: ${transfer.transactionHash}`);

  // Display account details
  console.log(`Account 1 Address: ${account1.address}`);
  console.log(`Account 2 Address: ${account2.address}`);
}

export { createAndTransfer };
