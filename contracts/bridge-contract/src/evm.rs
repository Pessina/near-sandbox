use crate::*;

use near_sdk::{env::keccak256, log, near, serde::{Deserialize, Serialize}};
use schemars::JsonSchema;
use omni_transaction::{
    evm::{evm_transaction::EVMTransaction, types::Signature as OmniSignature, utils::parse_eth_address},
    transaction_builder::{TransactionBuilder, TxBuilder},
    types::EVM,
};
use signer::SignResult;
use hex;

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct PreparedEvmTransaction {
    pub omni_evm_tx: EVMTransaction,
    pub tx_hash: [u8; 32]
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct EvmTransaction {
    pub nonce: u64,
    pub to: String,
    pub value: String,
    pub max_priority_fee_per_gas: String,
    pub max_fee_per_gas: String,
    pub gas_limit: String,
    pub chain_id: u64,
    pub data: Option<Vec<u8>>,
}

#[near]
impl Contract {
    pub fn prepare_evm_tx(&mut self, tx: EvmTransaction) -> PreparedEvmTransaction {
        log!("Starting prepare_evm_tx");

        let to_address = parse_eth_address(tx.to.trim_start_matches("0x"));

        let omni_evm_tx = TransactionBuilder::new::<EVM>()
            .nonce(tx.nonce)
            .to(to_address)
            .value(tx.value.parse::<u128>().unwrap())
            .input(tx.data.unwrap_or(vec![]))
            .max_priority_fee_per_gas(tx.max_priority_fee_per_gas.parse::<u128>().unwrap())
            .max_fee_per_gas(tx.max_fee_per_gas.parse::<u128>().unwrap()) 
            .gas_limit(tx.gas_limit.parse::<u128>().unwrap())
            .chain_id(tx.chain_id)
            .build();

        let encoded_tx = omni_evm_tx.build_for_signing();
        let tx_hash = keccak256(&encoded_tx);

        PreparedEvmTransaction {
            omni_evm_tx,
            tx_hash: tx_hash.try_into().expect("Array conversion failed")
        }
    }

    pub fn finalize_evm_tx(
        &self,
        omni_evm_tx: EVMTransaction,
        signature: SignResult
    ) -> String {
        let mut r_bytes = hex::decode(&signature.big_r.affine_point).expect("Invalid r hex");
        r_bytes = r_bytes[1..].to_vec();
    
        let s_bytes = hex::decode(&signature.s.scalar).expect("Invalid s hex");
    
        let v = signature.recovery_id as u64;
    
        let omni_signature = OmniSignature { v, r: r_bytes, s: s_bytes };
        let tx = omni_evm_tx.build_with_signature(&omni_signature);
    
        format!("0x{}", hex::encode(tx))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use signer::{SerializableAffinePoint, SerializableScalar};

    #[test]
    fn test_evm_tx() {
        let input_tx = EvmTransaction {
            to: "0x4174678c78fEaFd778c1ff319D5D326701449b25".to_string(),
            value: "1000000000000".to_string(),
            nonce: 26,
            max_priority_fee_per_gas: "25302576".to_string(),
            max_fee_per_gas: "63015311300".to_string(),
            gas_limit: "21000".to_string(),
            chain_id: 11155111,
            data: None
        };

        let mut contract = Contract::new("v1.signer-prod.testnet".parse().unwrap());

        let prepared_evm_transaction = contract.prepare_evm_tx(input_tx);

        assert_eq!(prepared_evm_transaction.tx_hash, [50, 172, 153, 187, 22, 209, 9, 234, 4, 113, 24, 3, 39, 17, 96, 234, 218, 104, 205, 240, 26, 39, 255, 75, 99, 21, 218, 76, 158, 98, 60, 244]);

        let signature = SignResult {
            big_r: SerializableAffinePoint {
                affine_point: "030F8DCFE487CC9173251A101B4A10B74831EDB4293C9338041B8F7DDE538454D9".to_string(),
            },
            s: SerializableScalar {
                scalar: "1405C2DC3048D279BED72C70AAF65FCEE65B6FCC4116B0942601BBF60ED0E136".to_string(),
            },
            recovery_id: 1,
        };

        let final_tx = contract.finalize_evm_tx(prepared_evm_transaction.omni_evm_tx, signature);

        assert_eq!(final_tx, "0x02f87383aa36a71a8401821630850eac0157c4825208944174678c78feafd778c1ff319d5d326701449b2585e8d4a5100080c001a00f8dcfe487cc9173251a101b4a10b74831edb4293c9338041b8f7dde538454d9a01405c2dc3048d279bed72c70aaf65fcee65b6fcc4116b0942601bbf60ed0e136".to_string());
    }
}

