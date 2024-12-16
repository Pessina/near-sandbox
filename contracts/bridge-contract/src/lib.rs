use near_sdk::{log, near, AccountId, PanicOnDefault};
use btc::UTXO;

pub mod signer;
pub mod btc;
pub mod swap;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    signer_account: AccountId,
    transaction_list: String, // Type is wrong, should be a list of transaction and corresponding status (pending, signed...)
    balance: String, // Type is wrong, should be the balance of each pool
}

#[near]
impl Contract {

    #[init]
    pub fn new() -> Self {
        Self {
            // TODO: Change to the actual signer account
            signer_account: "v1.signer-prod.testnet".parse().unwrap(),
            transaction_list: String::new(),
            balance: String::new(),
        }
    }

    pub fn set_signer_account(&mut self, signer_account: AccountId) {
        self.signer_account = signer_account;
    }
}

