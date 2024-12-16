use crate::*;

use btc::{PreparedBitcoinTransaction, UTXO};
use near_sdk::{
    env,
    Gas, 
    NearToken, 
    Promise,
    PromiseError,
};
use crate::signer::{SignRequest, SignResult, ext_signer};

// TODO: Should be provided by the caller as it's dynamic
const STATIC_DEPOSIT: NearToken = NearToken::from_yoctonear(50000000000000000000);
const SIGN_GAS: Gas = Gas::from_tgas(100);
const SWAP_CALLBACK_GAS: Gas = Gas::from_tgas(10);

#[near]
impl Contract {

    #[payable]
    pub fn swap_btc(&mut self, input_utxos: Vec<UTXO>, output_utxos: Vec<UTXO>) ->Promise {
        log!("Swap starting");
        let prepared_bitcoin_transaction = self.prepare_btc_tx(input_utxos, output_utxos);
        
        let sign_request = SignRequest::new(
            prepared_bitcoin_transaction.sighashes[0].try_into().expect("Invalid sighash length"),
            "".to_string(),
            0
        );

        log!("Sign request: {:?}", sign_request);

        ext_signer::ext(self.signer_account.clone())
            .with_attached_deposit(STATIC_DEPOSIT)
            .with_static_gas(SIGN_GAS)
            .sign(sign_request)
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(SWAP_CALLBACK_GAS)
                    .with_unused_gas_weight(0)
                    .swap_btc_callback(
                        prepared_bitcoin_transaction
                    )
            )
    }

    #[private]
    pub fn swap_btc_callback(
        &mut self,
        prepared_bitcoin_transaction: PreparedBitcoinTransaction,
        #[callback_result] sign_result: Result<SignResult, PromiseError>
    ) -> String {
        if let Ok(signature) = sign_result {
            log!("Got signature from signer {:?}", signature);
            self.finalize_btc_tx(prepared_bitcoin_transaction.tx, signature)
        } else {
            log!("Failed to get signature from signer");
            panic!("Failed to get signature from signer");
        }
    }
}