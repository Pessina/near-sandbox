use crate::*;

use near_sdk::{
    env,
    Gas, 
    NearToken, 
    Promise,
    PromiseError,
};
use crate::signer::{SignRequest, SignResult, ext_signer};

// TODO: Should be provided by the caller as it's dynamic
const NO_DEPOSIT: NearToken = NearToken::from_yoctonear(0);
const XCC_GAS: Gas = Gas::from_tgas(300);

#[near]
impl Contract {
    pub fn swap(&mut self, input_utxos: Vec<UTXO>, output_utxos: Vec<UTXO>) ->Promise {
        log!("Swap starting");
        let sighashes = self.prepare_btc_tx(&input_utxos, &output_utxos);
        
        let sign_request = SignRequest::new(
            sighashes[0].try_into().expect("Invalid sighash length"),
            "".to_string(), // Empty path as requested
            1
        );

        // Make cross-contract call to signer
        ext_signer::ext(self.signer_account.clone())
            .with_attached_deposit(NO_DEPOSIT)
            .sign(sign_request)
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(XCC_GAS)
                    .with_unused_gas_weight(0)
                    .swap_callback(
                        input_utxos,
                        output_utxos
                    )
            )
    }

    #[private]
    pub fn swap_callback(
        &mut self,
        input_utxos: Vec<UTXO>,
        output_utxos: Vec<UTXO>,
        #[callback_result] sign_result: Result<SignResult, PromiseError>
    ) {
        if let Ok(signature) = sign_result {
            log!("Got signature from signer");
            // TODO: Process signature and broadcast transaction
        } else {
            log!("Failed to get signature from signer");
        }
    }
}