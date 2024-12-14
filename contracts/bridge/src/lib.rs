use near_sdk::{log, near, PanicOnDefault};

pub mod swap;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    transaction_list: String, // Type is wrong, should be a list of transaction and corresponding status (pending, signed...)
    balance: String, // Type is wrong, should be the balance of each pool
}

#[near]
impl Contract {
    pub fn swap(&mut self, ) {
        log!("Swap starting");
        
    }
}

