use crate::*;

use btc::{BitcoinTransactionRequest, PreparedBitcoinTransaction};
use evm::EvmTransactionRequest;
use near_sdk::{env, log, near, Gas, NearToken, Promise, PromiseError};
use signer::{SignRequest, SignResult, ext_signer};

const SIGN_GAS: Gas = Gas::from_tgas(100);
const SWAP_CALLBACK_GAS: Gas = Gas::from_tgas(10);

#[near]
impl Contract {
    fn promise_sign(&self, hash: [u8; 32], deposit: NearToken) -> Promise {
        // TODO: Should be customizable by the caller
        let sign_request = SignRequest::new(
            hash,
            "".to_string(),
            0
        );

        ext_signer::ext(self.signer_account.clone())
            .with_attached_deposit(deposit)
            .with_static_gas(SIGN_GAS)
            .sign(sign_request)
    }

    #[private]
    #[payable]
    pub fn sign_btc(&mut self, tx_request: BitcoinTransactionRequest) -> Promise {
        let input_utxos_len = tx_request.inputs.len() as u128;
        let sign_deposit = env::attached_deposit().saturating_div(input_utxos_len);

        let prepared_bitcoin_transaction = self.prepare_btc_tx(tx_request.clone());
        let mut combined_promise = self.promise_sign(prepared_bitcoin_transaction.sighashes[0], sign_deposit);

        for sighash in prepared_bitcoin_transaction.sighashes.iter().skip(1) {
            let sign_promise = self.promise_sign(*sighash, sign_deposit);
            combined_promise = combined_promise.and(sign_promise);
        }

        let promises_len = prepared_bitcoin_transaction.sighashes.len() as u64;
        combined_promise.then(
            Self::ext(env::current_account_id())
                .with_static_gas(SWAP_CALLBACK_GAS.into())
                .sign_btc_callback(
                    prepared_bitcoin_transaction,
                    tx_request.signer_public_key,
                    promises_len
                )
        )
    }

    #[private]
    pub fn sign_btc_callback(
        &mut self,
        prepared_bitcoin_transaction: PreparedBitcoinTransaction,
        signer_public_key: String,
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
            signer_public_key
        );

        log!("Finalized BTC transaction hex: {:?}", tx_hex);
        tx_hex
    }

    #[private]
    #[payable]
    pub fn sign_evm(
        &mut self,
        tx_request: EvmTransactionRequest,
    ) -> near_sdk::Promise {
        log!("Starting sign_evm");

        let prepared_evm_transaction = self.prepare_evm_tx(tx_request);
        log!("Prepared EVM transaction with hash: {:?}", prepared_evm_transaction.tx_hash);

        self.promise_sign(prepared_evm_transaction.tx_hash, env::attached_deposit())
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(SWAP_CALLBACK_GAS.into())
                    .sign_evm_callback(
                        prepared_evm_transaction.omni_evm_tx
                    )
            )
    }

    #[private]
    pub fn sign_evm_callback(
        &mut self,
        omni_evm_tx: omni_transaction::evm::evm_transaction::EVMTransaction,
        #[callback_result] result: Result<SignResult, PromiseError>
    ) -> String {
        match result {
            Ok(signature) => {
                log!("Got signature from signer {:?}", signature);
                let tx_hex = self.finalize_evm_tx(
                    omni_evm_tx,
                    signature
                );
                log!("Finalized EVM transaction hex: {:?}", tx_hex);
                tx_hex
            }
            Err(e) => {
                log!("Failed to get signature from signer: {:?}", e);
                panic!("Failed to get signature from signer");
            }
        }
    }
}