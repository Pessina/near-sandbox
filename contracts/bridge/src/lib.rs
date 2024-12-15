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
    pub fn swap(&mut self, input_utxos: Vec<UTXO>, output_utxos: Vec<UTXO>) {
        log!("Swap starting");
        let swap = swap::prepare_btc_tx(&input_utxos, &output_utxos);
    }
}

