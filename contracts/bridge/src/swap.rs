pub struct DepositData { 
    pub to: String, 
    pub amount: String,
    pub chain: u64,
}

pub struct UTXO {
    pub tx_hash: String,
    pub index: u64,
    pub amount: u64,
}

pub struct Swap {
    pub deposit_tx: DepositData,
    pub price: String, 
    pub utxos: Vec<UTXO>,
}