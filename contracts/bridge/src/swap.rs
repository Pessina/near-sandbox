pub struct DepositTx { 
    pub to: String, 
    pub amount: String,
}

pub struct UTXO {
    pub tx_hash: String,
    pub index: u64,
    pub amount: u64,
}

pub struct Swap {
    pub deposit_tx_hex: String,
    pub price: String, 
    pub utxos: Vec<UTXO>,
}