use crate::*;

use btc::PreparedBitcoinTransaction;
use near_sdk::{
    env,
    Gas, 
    NearToken, 
    Promise,
    PromiseError,
};
use omni_transaction::bitcoin::types::Witness;
use crate::signer::{SignRequest, SignResult, ext_signer};

// TODO: Should be provided by the caller as it's dynamic
const NO_DEPOSIT: NearToken = NearToken::from_yoctonear(50000);
const XCC_GAS: Gas = Gas::from_tgas(300);

#[near]
impl Contract {
    pub fn swap_btc(&mut self, input_utxos: Vec<UTXO>, output_utxos: Vec<UTXO>) ->Promise {
        log!("Swap starting");
        let prepared_bitcoin_transaction = self.prepare_btc_tx(&input_utxos, &output_utxos);
        
        let sign_request = SignRequest::new(
            prepared_bitcoin_transaction.sighashes[0].try_into().expect("Invalid sighash length"),
            "".to_string(),
            1
        );

        ext_signer::ext(self.signer_account.clone())
            .with_attached_deposit(NO_DEPOSIT)
            .sign(sign_request)
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(XCC_GAS)
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
            
            // Create witness data with signature and public key
            let mut witness_data = Vec::new();
            witness_data.extend_from_slice(&hex::decode(&signature.big_r.affine_point).expect("Invalid big_r hex"));
            witness_data.extend_from_slice(&hex::decode(&signature.s.scalar).expect("Invalid s hex"));
            
            // Create witness and add it to transaction
            let witness = Witness::from_slice(&[&witness_data]);
            let mut final_tx = prepared_bitcoin_transaction.tx;
            final_tx.input[0].witness = witness;

            // Convert transaction to hex for broadcasting
            let serialized = final_tx.serialize();
            let tx_hex = hex::encode(serialized);
            log!("Final transaction hex: {}", tx_hex);
            // 020000000001017053bc4f12b37901db04da385e1db5bd7371a8953dbb78f1990f1216a4e0d3b90100000000ffffffff027800000000000000160014d3ae5a5de66aa44e7d5723b74e590340b3212f466e8f0600000000001600140d7d0223d302b4e8ef37050b5200b1c3306ae7ab0247304402207cfcb5bcfb3c8c677416b1520471cc25a643a6ef901ac42c6f82e14a9a0add5b0220617c62b5764327d15eab37c04816fec585478e2ffe0c93b0f160336b8756e1a4012102b12224ecec8184dbff10316a889ebee9f7871bd6de358c5323fbecce9d84fd2400000000
            
            // Return transaction hex that needs to be broadcasted
            tx_hex
        } else {
            log!("Failed to get signature from signer");
            panic!("Failed to get signature from signer");
        }
    }
}