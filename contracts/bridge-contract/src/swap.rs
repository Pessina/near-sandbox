use crate::*;

use btc::{PreparedBitcoinTransaction, UTXO};
use near_sdk::{env, log, near, Gas, Promise};
use crate::signer::{SignRequest, SignResult, ext_signer};

const SIGN_GAS: Gas = Gas::from_tgas(100);
const SWAP_CALLBACK_GAS: Gas = Gas::from_tgas(10);

#[near]
impl Contract {
    fn promise_sign(&self, sighash: [u8; 32]) -> Promise {
        // TODO: Should be customizable by the caller
        let sign_request = SignRequest::new(
            sighash,
            "".to_string(),
            0
        );

        log!("Sign request: {:?}", sign_request);

        ext_signer::ext(self.signer_account.clone())
            // TODO: The current min deposit should be provided by the caller
            .with_attached_deposit(env::attached_deposit())
            .with_static_gas(SIGN_GAS)
            .sign(sign_request)
    }

    #[payable]
    pub fn swap_btc(&mut self, input_utxos: Vec<UTXO>, output_utxos: Vec<UTXO>, sender_public_key: String) -> Promise {
        log!("Swap starting");
        let prepared_bitcoin_transaction = self.prepare_btc_tx(input_utxos, output_utxos);
        
        let mut combined_promise = self.promise_sign(prepared_bitcoin_transaction.sighashes[0]);

        for sighash in prepared_bitcoin_transaction.sighashes.iter().skip(1) {
            let sign_promise = self.promise_sign(*sighash);
            combined_promise = combined_promise.and(sign_promise);
        }

        let promises_len = prepared_bitcoin_transaction.sighashes.len() as u64;
        combined_promise.then(
            Self::ext(env::current_account_id())
                .with_static_gas(SWAP_CALLBACK_GAS.into())
                .swap_btc_callback(
                    prepared_bitcoin_transaction,
                    sender_public_key,
                    promises_len
                )
        )
    }

    #[private]
    pub fn swap_btc_callback(
        &mut self,
        prepared_bitcoin_transaction: PreparedBitcoinTransaction,
        sender_public_key: String,
        num_signatures: u64,
    ) -> String {
        let mut signatures = Vec::with_capacity(num_signatures as usize);

        for i in 0..num_signatures {
            match env::promise_result(i) {
                near_sdk::PromiseResult::Successful(value) => {
                    if let Ok(signature) = near_sdk::serde_json::from_slice::<SignResult>(&value) {
                        log!("Got signature from signer {:?}", signature);
                        signatures.push(signature);
                    } else {
                        log!("Failed to deserialize signature");
                        panic!("Failed to deserialize signature");
                    }
                }
                near_sdk::PromiseResult::Failed => {
                    log!("Failed to get signature from signer");
                    panic!("Failed to get signature from signer");
                }
            }
        }

        let tx_hex = self.finalize_btc_tx(
            prepared_bitcoin_transaction.tx,
            signatures,
            sender_public_key
        );
        log!("Finalized BTC transaction hex: {:?}", tx_hex);
        tx_hex
    }
}