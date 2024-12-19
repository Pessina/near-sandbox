use crate::*;

use btc::{BtcInput, BtcOutput, BitcoinTransactionRequest};
use near_sdk::{log, Promise};

#[near]
impl Contract {

    #[payable]
    pub fn swap_btc_krnl(&mut self, auth: String, sender: String, recipient: String, kernel_response: String) -> Promise {
        let is_authorized = self.is_krnl_authorized(auth, sender, recipient, kernel_response.clone());
        let kernel_response = self.decode_krnl_response(kernel_response);

        if !is_authorized {
            panic!("Unauthorized");
        }

        let input_utxos = kernel_response.liquidity.input_utxos.iter().map(|utxo| BtcInput {
            txid: utxo.txid.clone(),
            vout: utxo.vout as u32,
            value: utxo.value.parse::<u64>().unwrap(),
            script_pubkey: utxo.script_pubkey.clone()
        }).collect();

        let output_utxos = kernel_response.liquidity.output_utxos.iter().map(|utxo| BtcOutput {
            value: utxo.value.parse::<u64>().unwrap(),
            script_pubkey: utxo.script_pubkey.clone()
        }).collect();
        let sender_public_key = kernel_response.lp_pubkey;

        log!("Input UTXOs: {:?}", input_utxos);
        log!("Output UTXOs: {:?}", output_utxos);
        log!("Sender Public Key: {:?}", sender_public_key);

        self.sign_btc(BitcoinTransactionRequest {
            inputs: input_utxos,
            outputs: output_utxos,
            signer_public_key: sender_public_key
        })
    }
}
