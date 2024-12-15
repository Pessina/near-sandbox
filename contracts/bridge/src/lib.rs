use near_sdk::{log, near, PanicOnDefault};
use swap::UTXO;

pub mod swap;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    transaction_list: String, // Type is wrong, should be a list of transaction and corresponding status (pending, signed...)
    balance: String, // Type is wrong, should be the balance of each pool
}

#[near]
impl Contract {
    pub fn swap(&mut self, utxos: Vec<UTXO>, receiver_address_str: String, spend_amount: u64) {
        log!("Swap starting");
        let swap = swap::prepare_btc_tx(&utxos, &receiver_address_str, spend_amount);
    }
}

