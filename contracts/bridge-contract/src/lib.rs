use near_sdk::{near, AccountId, PanicOnDefault};

pub mod btc;
pub mod evm;
pub mod krnl;
pub mod swap_krnl;
pub mod signer;
pub mod sign;

#[derive(Debug, PanicOnDefault)]
#[near(contract_state)]
pub struct Contract {
    pub signer_account: AccountId,
    // transaction_list: String, // Type is wrong, should be a list of transaction and corresponding status (pending, signed...)
    // balance: String, // Type is wrong, should be the balance of each pool
    // lp_list: String, // Type is wrong, should be a list of lp and corresponding status (pending, signed...) {risk, addresses, ...}
}

#[near]
impl Contract {
    #[private]
    #[init]
    pub fn new(signer_account: AccountId) -> Self {
        Self {
            signer_account,
        }
    }

    pub fn get_signer_account(&self) -> AccountId {
        self.signer_account.clone()
    }
}

