import { ethers } from "ethers";

async function createAndTransfer() {
  if (
    !process.env.NEXT_PUBLIC_MNEMONIC ||
    !process.env.NEXT_PUBLIC_INFURA_URL
  ) {
    throw new Error("Please set a valid mnemonic and Infura URL");
  }

  const provider = new ethers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_INFURA_URL
  );

  const wallet = ethers.Wallet.fromPhrase(
    process.env.NEXT_PUBLIC_MNEMONIC
  ).connect(provider);

  for (let i = 0; i < 3; i++) {
    const hdNode = ethers.HDNodeWallet.fromMnemonic(
      ethers.Mnemonic.fromPhrase(process.env.NEXT_PUBLIC_MNEMONIC),
      `m/44'/60'/0'/0/${i}`
    );
    if (i === 0) console.log(hdNode.address);
    if (i === 1) console.log(hdNode.address);
    if (i === 2) console.log(hdNode.address);
  }

  // // Transfer Ether from the wallet to another address
  // // In Ethers.js v6, the transaction sending process remains the same
  // const tx = await wallet.sendTransaction({
  //   to: randomWallet1.address, // Replace with a valid Ethereum address
  //   value: ethers.parseEther("0.01"),
  // });

  // console.log(`Transfer successful: ${tx.hash}`);
}

export { createAndTransfer };
