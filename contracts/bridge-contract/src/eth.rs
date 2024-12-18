use crate::*;

use ethers_core::utils::keccak256;
use near_sdk::{log, near, serde::{Deserialize, Serialize}};
use schemars::JsonSchema;
use omni_transaction::{
    evm::{evm_transaction::EVMTransaction, types::Signature as OmniSignature, utils::parse_eth_address},
    transaction_builder::{TransactionBuilder, TxBuilder},
    types::EVM,
};
use signer::SignResult;
use alloy_primitives::hex;

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct PreparedEthereumTransaction {
    pub omni_eth_tx: EVMTransaction,
    pub tx_hash: [u8; 32]
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct EthereumTransaction {
    pub nonce: u64,
    pub to: String,
    pub value: u128,
    pub max_priority_fee_per_gas: u128,
    pub max_fee_per_gas: u128,
    pub gas_limit: u128,
    pub chain_id: u64,
    pub data: Vec<u8>
}

#[near]
impl Contract {
    pub fn prepare_eth_tx(&mut self, tx: EthereumTransaction) -> PreparedEthereumTransaction {
        log!("Starting prepare_eth_tx");

        let to_address = parse_eth_address(if tx.to.starts_with("0x") { &tx.to[2..] } else { &tx.to });

        let omni_eth_tx = TransactionBuilder::new::<EVM>()
            .nonce(tx.nonce)
            .to(to_address)
            .value(tx.value)
            .input(tx.data)
            .max_priority_fee_per_gas(tx.max_priority_fee_per_gas)
            .max_fee_per_gas(tx.max_fee_per_gas) 
            .gas_limit(tx.gas_limit)
            .chain_id(tx.chain_id)
            .build();

        let encoded_tx = omni_eth_tx.build_for_signing();
        let tx_hash = keccak256(&encoded_tx);

        PreparedEthereumTransaction {
            omni_eth_tx,
            tx_hash
        }
    }

    pub fn finalize_eth_tx(
        &self,
        omni_eth_tx: EVMTransaction,
        signature: SignResult
    ) -> String {
        let omni_signature = OmniSignature {
            v: signature.recovery_id as u64,
            r: hex::decode(&signature.big_r.affine_point).expect("Invalid r hex"),
            s: hex::decode(&signature.s.scalar).expect("Invalid s hex")
        };

        let tx = omni_eth_tx.build_with_signature(&omni_signature);

        hex::encode_prefixed(tx)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use signer::{SerializableAffinePoint, SerializableScalar};

    #[test]
    fn test_eth_tx() {
        let input_tx = EthereumTransaction {
            to: "0x4174678c78fEaFd778c1ff319D5D326701449b25".to_string(),
            value: 100000000000000u128,
            nonce: 25,
            max_priority_fee_per_gas: 25302576,
            max_fee_per_gas: 32696584884,
            gas_limit: 21000,
            chain_id: 11155111,
            data: vec![]
        };

        let mut contract = Contract::new("v1.signer-prod.testnet".parse().unwrap());

        let prepared_eth_transaction = contract.prepare_eth_tx(input_tx);

        assert_eq!(prepared_eth_transaction.tx_hash, [38, 103, 33, 156, 97, 194, 72, 153, 8, 59, 220, 33, 11, 153, 166, 25, 59, 108, 178, 166, 180, 29, 180, 174, 6, 153, 143, 81, 103, 98, 180, 61]);

        // This would be a valid signature for the transaction above
        // let signature = SignResult {
        //     big_r: SerializableAffinePoint {
        //         affine_point: "a29ac1caa8a3a6b0d6d4d7a4c3a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0".to_string(),
        //     },
        //     s: SerializableScalar {
        //         scalar: "b1c0d9e8f7a6b5c4d3e2f1a0a29ac1caa8a3a6b0d6d4d7a4c3a8b7c6d5e4f3a2".to_string(),
        //     },
        //     recovery_id: 0,
        // };

        // let final_tx = contract.finalize_eth_tx(prepared_eth_transaction.omni_eth_tx, signature);

        // The expected transaction hex would go here
        // assert_eq!(final_tx, "expected_tx_hex");
    }
}

