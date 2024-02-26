// import { ECPair, payments, Psbt, networks } from 'bitcoinjs-lib';
// import * as crypto from 'crypto';

// class BitcoinTransactionUtilV6 {
//   network: networks.Network;

//   constructor(network: networks.Network) {
//     this.network = network;
//   }

//   createSerializeHashAndConvertToByteArray(
//     inputs: Array<{ txId: string; vout: number; amount: number }>, // Include amount for inputs
//     outputs: Array<{ address: string; satoshis: number }>,
//     privateKey: string // Private key in WIF format
//   ): Buffer {
//     const keyPair = ECPair.fromWIF(privateKey, this.network);
//     const psbt = new Psbt({ network: this.network });

//     // Add inputs
//     inputs.forEach(input => {
//       psbt.addInput({
//         hash: input.txId,
//         index: input.vout,
//         nonWitnessUtxo: Buffer.alloc(0), // Placeholder, in real use you need the actual UTXO transaction
//         // For segwit inputs, use witnessUtxo instead of nonWitnessUtxo
//       });
//     });

//     // Add outputs
//     outputs.forEach(output => {
//       psbt.addOutput({
//         address: output.address,
//         value: output.satoshis,
//       });
//     });

//     // Sign inputs
//     inputs.forEach((input, index) => {
//       psbt.signInput(index, keyPair);
//     });

//     // Finalize the inputs
//     inputs.forEach((input, index) => {
//       psbt.finalizeInput(index);
//     });

//     // Extract the transaction
//     const tx = psbt.extractTransaction();

//     // Serialize the transaction
//     const txHex = tx.toHex();

//     // Hash the serialized transaction using SHA256
//     const txHash = crypto.createHash('sha256').update(Buffer.from(txHex, 'hex')).digest();

//     return txHash;
//   }
// }

// // Example usage
// const network = networks.testnet; // Use networks.bitcoin for mainnet
// const bitcoinUtil = new BitcoinTransactionUtilV6(network);

// const inputs = [
//   { txId: 'your_utxo_txid', vout: 0, amount: 100000 } // Amount in satoshis
// ];
// const outputs = [
//   { address: 'recipient_BTC_address', satoshis: 90000 } // Amount in satoshis
// ];
// const privateKey = 'your_private_key_WIF';

// const txHashBuffer = bitcoinUtil.createSerializeHashAndConvertToByteArray(inputs, outputs, privateKey);
// console.log('Serialized, Hashed, and Converted Transaction:', txHashBuffer);
