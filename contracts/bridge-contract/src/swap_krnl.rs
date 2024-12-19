use crate::*;

use btc::UTXO;
use near_sdk::Promise;

#[near]
impl Contract {
    pub fn swap_btc_krnl(&mut self, auth: String, sender: String, recipient: String, kernel_response: String) -> Promise {
        let is_authorized = self.is_krnl_authorized(auth, sender, recipient, kernel_response.clone());
        let kernel_response = self.decode_krnl_response(kernel_response);

        if !is_authorized {
            panic!("Unauthorized");
        }

        let input_utxos: Vec<UTXO> = kernel_response.liquidity.input_utxos.iter().map(|utxo| UTXO {
            txid: utxo.txid.clone(),
            vout: utxo.vout as u32,
            value: utxo.value.parse::<u64>().unwrap(),
            script_pubkey: utxo.script_pubkey.clone()
        }).collect();

        let output_utxos: Vec<UTXO> = kernel_response.liquidity.output_utxos.iter().map(|utxo| UTXO {
            txid: utxo.txid.clone(), 
            vout: utxo.vout as u32,
            value: utxo.value.parse::<u64>().unwrap(),
            script_pubkey: utxo.script_pubkey.clone()
        }).collect();

        let sender_public_key = kernel_response.liquidity.lp_pubkey;

        self.swap_btc(input_utxos, output_utxos, sender_public_key)
    }
}