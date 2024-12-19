use crate::*;

use ethabi::{decode, ParamType, Token};
use hex;
use sha3::{Digest, Keccak256};
use near_sdk::{near, serde::{Deserialize, Serialize}};
use schemars::JsonSchema;

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct KernelResponse {
    pub price: String,
    pub transaction: Transaction,
    pub premium: String,
    pub liquidity: Liquidity,
    pub lp_pubkey: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Transaction {
    pub verified: bool,
    pub receipt: Receipt,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Receipt {
    pub from: String,
    pub to: String,
    pub status: u8,
    pub block_hash: String,
    pub block_number: u64,
    pub transaction_hash: String,
    pub transaction_index: u64,
    pub gas_used: u64,
    pub cumulative_gas_used: u64,
    pub effective_gas_price: u64,
    pub type_field: u8,
    pub root: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Liquidity {
    pub balance: String,
    pub total_input_amount: String,
    pub required_amount: String,
    pub change_amount: String,
    pub estimated_fee: String,
    pub actual_fee: String,
    pub sufficient: bool,
    pub utxos: Vec<Utxo>,
    pub fees: Fees,
    pub input_utxos: Vec<IoUtxo>,
    pub output_utxos: Vec<IoUtxo>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Fees {
    pub fastest_fee: u64,
    pub half_hour_fee: u64,
    pub hour_fee: u64,
    pub economy_fee: u64,
    pub minimum_fee: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Status {
    pub confirmed: bool,
    pub block_hash: String,
    pub block_height: u64,
    pub block_time: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Utxo {
    pub txid: String,
    pub vout: u64,
    pub status: Status,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct IoUtxo {
    pub txid: String,
    pub vout: u64,
    pub value: String,
    pub script_pubkey: String,
}

fn decode_hex(hex_str: &str) -> Vec<u8> {
    hex::decode(hex_str.trim_start_matches("0x")).unwrap()
}

#[near]
impl Contract {
    pub fn is_krnl_authorized(
        &self,
        auth: String,
        sender: String,
        recipient: String,
        kernel_response: String,
    ) -> bool {
        let sender = decode_hex(&sender);
        let recipient_script = recipient.as_bytes();
        let auth = decode_hex(&auth);
        let kernel_response = decode_hex(&kernel_response);

        let signature_token_type = ParamType::Bytes;
        let nonce_type = ParamType::FixedBytes(32);
        let auth_args = vec![signature_token_type, nonce_type];

        let unpacked = match decode(&auth_args, &auth) {
            Ok(u) => u,
            Err(e) => {
                println!("Error unpacking auth: {:?}", e);
                return false;
            }
        };

        let signature_token = match &unpacked[0] {
            Token::Bytes(b) => b.clone(),
            _ => {
                println!("signature token is not bytes");
                return false;
            }
        };

        let nonce = match &unpacked[1] {
            Token::FixedBytes(n) => n.clone(),
            _ => {
                println!("nonce is not bytes32");
                return false;
            }
        };

        let mut nonce_bytes = [0u8; 32];
        nonce_bytes.copy_from_slice(&nonce);

        let kernel_responses_digest = {
            let hash = Keccak256::digest(&kernel_response);
            let mut out = [0u8; 32];
            out.copy_from_slice(&hash);
            out
        };

        let data_digest = {
            let mut hasher = Keccak256::new();
            hasher.update(&nonce_bytes);
            hasher.update(&sender);
            hasher.update(&recipient_script);
            hasher.update(&kernel_responses_digest);
            let hash = hasher.finalize();
            let mut out = [0u8; 32];
            out.copy_from_slice(&hash);
            out
        };

        let recovered_addr = {
            use k256::ecdsa::{RecoveryId, Signature as K256Signature, VerifyingKey};
            if signature_token.len() != 65 {
                println!("Invalid signature length: {}", signature_token.len());
                return false;
            }
            let (r_s_bytes, v_byte) = signature_token.split_at(64);
            let v = v_byte[0];
            let rec_id = if v >= 27 { v - 27 } else { v };

            let signature = match K256Signature::try_from(r_s_bytes) {
                Ok(sig) => sig,
                Err(e) => {
                    println!("Error parsing signature: {:?}", e);
                    return false;
                }
            };

            let recovery_id = match RecoveryId::try_from(rec_id) {
                Ok(rid) => rid,
                Err(e) => {
                    println!("Error parsing recovery id: {:?}", e);
                    return false;
                }
            };

            let verifying_key =
                match VerifyingKey::recover_from_prehash(&data_digest, &signature, recovery_id) {
                    Ok(vk) => vk,
                    Err(e) => {
                        println!("Error recovering verifying key: {:?}", e);
                        return false;
                    }
                };

            let public_key = verifying_key.to_encoded_point(false);
            let mut hasher = Keccak256::new();
            hasher.update(&public_key.as_bytes()[1..]);
            let hash = hasher.finalize();
            let mut addr = [0u8; 20];
            addr.copy_from_slice(&hash[12..32]);
            addr
        };

        if recovered_addr == sender.as_slice() {
            println!("signature verification successful");
            true
        } else {
            println!("signature verification failed");
            false
        }
    }

    pub fn decode_krnl_response(&self, kernel_response: String) -> KernelResponse {
        let kernel_response = decode_hex(&kernel_response);

        // Define the complete ABI structure once
        let kernel_resp_type = {
            use ethabi::ParamType;

            // Receipt tuple
            let receipt_type = ParamType::Tuple(vec![
                ParamType::Address,                                  // from
                ParamType::Address,                                  // to
                ParamType::Uint(8),                                 // status
                ParamType::FixedBytes(32),                          // blockHash
                ParamType::Uint(64),                                // blockNumber
                ParamType::FixedBytes(32),                          // transactionHash
                ParamType::Uint(64),                                // transactionIndex
                ParamType::Uint(64),                                // gasUsed
                ParamType::Uint(64),                                // cumulativeGasUsed
                ParamType::Uint(64),                                // effectiveGasPrice
                ParamType::Uint(8),                                 // type
                ParamType::FixedBytes(32),                          // root
                ParamType::Array(Box::new(ParamType::Array(Box::new(ParamType::Bytes)))),    
            ]);

            // Transaction tuple
            let transaction_type = ParamType::Tuple(vec![
                ParamType::Bool,                                    // verified
                receipt_type,                                       // receipt
            ]);

            // UTXO status tuple
            let utxo_status_type = ParamType::Tuple(vec![
                ParamType::Bool,                                    // confirmed
                ParamType::String,                                  // blockHash
                ParamType::Uint(64),                               // blockHeight
                ParamType::Uint(64),                               // blockTime
            ]);

            // UTXO tuple
            let utxo_type = ParamType::Tuple(vec![
                ParamType::String,                                  // txid
                ParamType::Uint(64),                               // vout
                utxo_status_type,                                  // status
                ParamType::Uint(256),                              // value
            ]);

            // Fees tuple
            let fees_type = ParamType::Tuple(vec![
                ParamType::Uint(64),                               // fastestFee
                ParamType::Uint(64),                               // halfHourFee
                ParamType::Uint(64),                               // hourFee
                ParamType::Uint(64),                               // economyFee
                ParamType::Uint(64),                               // minimumFee
            ]);

            // Input/Output UTXO tuple
            let io_utxo_type = ParamType::Tuple(vec![
                ParamType::String,                                  // txid
                ParamType::Uint(64),                               // vout
                ParamType::Uint(256),                              // value
                ParamType::String,                                 // scriptPubkey
            ]);

            // Liquidity tuple
            let liquidity_type = ParamType::Tuple(vec![
                ParamType::String,                                  // balance
                ParamType::String,                                  // totalInputAmount
                ParamType::String,                                  // requiredAmount
                ParamType::String,                                  // changeAmount
                ParamType::String,                                  // estimatedFee
                ParamType::String,                                  // actualFee
                ParamType::Bool,                                    // sufficient
                ParamType::Array(Box::new(utxo_type)),             // utxos[]
                fees_type,                                          // fees
                ParamType::Array(Box::new(io_utxo_type.clone())),   // inputUtxos[]
                ParamType::Array(Box::new(io_utxo_type.clone())),   // outputUtxos[]
            ]);

            // Complete kernel response tuple
            ParamType::Tuple(vec![
                ParamType::String,                                  // price
                transaction_type,                                   // transaction
                ParamType::String,                                  // premium
                liquidity_type,                                     // liquidity
                ParamType::String,                                  // lpPubkey
            ])
        };

        let tokens = decode(&[kernel_resp_type], &kernel_response).unwrap();
        let kernel_resp_tuple = tokens[0].clone().into_tuple().unwrap();

        let price = kernel_resp_tuple[0].clone().into_string().unwrap();
        let transaction_tuple = kernel_resp_tuple[1].clone().into_tuple().unwrap();
        let premium = kernel_resp_tuple[2].clone().into_string().unwrap();
        let liquidity_tuple = kernel_resp_tuple[3].clone().into_tuple().unwrap();
        let lp_pubkey = kernel_resp_tuple[4].clone().into_string().unwrap();

        let verified = transaction_tuple[0].clone().into_bool().unwrap();
        let receipt_tuple = transaction_tuple[1].clone().into_tuple().unwrap();

        let receipt = Receipt {
            from: format!("0x{:x}", receipt_tuple[0].clone().into_address().unwrap()),
            to: format!("0x{:x}", receipt_tuple[1].clone().into_address().unwrap()),
            status: receipt_tuple[2].clone().into_uint().unwrap().as_u64() as u8,
            block_hash: format!("0x{}", hex::encode(receipt_tuple[3].clone().into_fixed_bytes().unwrap())),
            block_number: receipt_tuple[4].clone().into_uint().unwrap().as_u64(),
            transaction_hash: format!("0x{}", hex::encode(receipt_tuple[5].clone().into_fixed_bytes().unwrap())),
            transaction_index: receipt_tuple[6].clone().into_uint().unwrap().as_u64(),
            gas_used: receipt_tuple[7].clone().into_uint().unwrap().as_u64(),
            cumulative_gas_used: receipt_tuple[8].clone().into_uint().unwrap().as_u64(),
            effective_gas_price: receipt_tuple[9].clone().into_uint().unwrap().as_u64(),
            type_field: receipt_tuple[10].clone().into_uint().unwrap().as_u64() as u8,
            root: format!("0x{}", hex::encode(receipt_tuple[11].clone().into_fixed_bytes().unwrap())),
        };

        let liquidity = Liquidity {
            balance: liquidity_tuple[0].clone().into_string().unwrap(),
            total_input_amount: liquidity_tuple[1].clone().into_string().unwrap(),
            required_amount: liquidity_tuple[2].clone().into_string().unwrap(),
            change_amount: liquidity_tuple[3].clone().into_string().unwrap(),
            estimated_fee: liquidity_tuple[4].clone().into_string().unwrap(),
            actual_fee: liquidity_tuple[5].clone().into_string().unwrap(),
            sufficient: liquidity_tuple[6].clone().into_bool().unwrap(),
            utxos: liquidity_tuple[7].clone().into_array().unwrap().into_iter().map(|utxo_token| {
                let utxo_tuple = utxo_token.into_tuple().unwrap();
                let status_tuple = utxo_tuple[2].clone().into_tuple().unwrap();
                Utxo {
                    txid: utxo_tuple[0].clone().into_string().unwrap(),
                    vout: utxo_tuple[1].clone().into_uint().unwrap().as_u64(),
                    status: Status {
                        confirmed: status_tuple[0].clone().into_bool().unwrap(),
                        block_hash: status_tuple[1].clone().into_string().unwrap(),
                        block_height: status_tuple[2].clone().into_uint().unwrap().as_u64(),
                        block_time: status_tuple[3].clone().into_uint().unwrap().as_u64(),
                    },
                    value: utxo_tuple[3].clone().into_uint().unwrap().to_string(),
                }
            }).collect(),
            fees: {
                let fees_tuple = liquidity_tuple[8].clone().into_tuple().unwrap();
                Fees {
                    fastest_fee: fees_tuple[0].clone().into_uint().unwrap().as_u64(),
                    half_hour_fee: fees_tuple[1].clone().into_uint().unwrap().as_u64(),
                    hour_fee: fees_tuple[2].clone().into_uint().unwrap().as_u64(),
                    economy_fee: fees_tuple[3].clone().into_uint().unwrap().as_u64(),
                    minimum_fee: fees_tuple[4].clone().into_uint().unwrap().as_u64(),
                }
            },
            input_utxos: liquidity_tuple[9].clone().into_array().unwrap().into_iter().map(|iu_token| {
                let iu_tuple = iu_token.into_tuple().unwrap();
                IoUtxo {
                    txid: iu_tuple[0].clone().into_string().unwrap(),
                    vout: iu_tuple[1].clone().into_uint().unwrap().as_u64(),
                    value: iu_tuple[2].clone().into_uint().unwrap().to_string(),
                    script_pubkey: iu_tuple[3].clone().into_string().unwrap(),
                }
            }).collect(),
            output_utxos: liquidity_tuple[10].clone().into_array().unwrap().into_iter().map(|ou_token| {
                let ou_tuple = ou_token.into_tuple().unwrap();
                IoUtxo {
                    txid: ou_tuple[0].clone().into_string().unwrap(),
                    vout: ou_tuple[1].clone().into_uint().unwrap().as_u64(),
                    value: ou_tuple[2].clone().into_uint().unwrap().to_string(),
                    script_pubkey: ou_tuple[3].clone().into_string().unwrap(),
                }
            }).collect(),
        };

        KernelResponse {
            price,
            transaction: Transaction {
                verified,
                receipt,
            },
            premium,
            liquidity,
            lp_pubkey,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_krnl() {
        let auth = "0000000000000000000000000000000000000000000000000000000000000040fabf7defe52f452b51b27254203181349ff854addae2768c104fc3840937379f000000000000000000000000000000000000000000000000000000000000004164245338014c81a1b70a4d84be8054ffdb7abdce4a568bdad6ae31f62d8809b0374d18a4765257a933af12c3d9a4526c7a5871979c5c51496cad5b469ebe97950100000000000000000000000000000000000000000000000000000000000000";
        let sender ="889E6a9d863373A7A735AB71Cd481e63ef8d64A4";
        let recipient ="tb1qh4tnh45v4ulprt0ruyct6p33ej3mh28jsd656k";
        let kernel_response = "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000002e000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000000000000000e40000000000000000000000000000000000000000000000000000000000000000a302e30303033363230340000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000040000000000000000000000000889e6a9d863373a7a735ab71cd481e63ef8d64a4000000000000000000000000889e6a9d863373a7a735ab71cd481e63ef8d64a400000000000000000000000000000000000000000000000000000000000000019f450d2b17ba679992e662a246056050c312893019a6d7ccc48ac6d11eee1fb700000000000000000000000000000000000000000000000000000000006f765cfe7d12888b2bffa36869689673b02b65911f1a1e30035f6050ed445ca21b6334000000000000000000000000000000000000000000000000000000000000006e00000000000000000000000000000000000000000000000000000000000052080000000000000000000000000000000000000000000000000000000000d8a19c000000000000000000000000000000000000000000000000000000400d539aac0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e30313031303230300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000000220000000000000000000000000000000000000000000000000000000000000026000000000000000000000000000000000000000000000000000000000000002a000000000000000000000000000000000000000000000000000000000000002e000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000036000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000056000000000000000000000000000000000000000000000000000000000000006e0000000000000000000000000000000000000000000000000000000000000000a302e303032393139373600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e303032393139373600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e303030333635303800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e303032353534363800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e303030303033303800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e303030303033303800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000004748800000000000000000000000000000000000000000000000000000000000000403330373735616431663663633363383431626536643264313531396361336662393934366464656632636261353561363332623663306536633335633535323800000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000e53e0000000000000000000000000000000000000000000000000000000067641b010000000000000000000000000000000000000000000000000000000000000040303030303030303038396661306666333337623938316438363638633966656636613830336635633137636236393438323864303237343430373431623234660000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000004748800000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004033303737356164316636636333633834316265366432643135313963613366623939343664646566326362613535613633326236633065366333356335353238000000000000000000000000000000000000000000000000000000000000002c303031343565343738623432623232313837313630396232363064633135346232393461303631356564346400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008d6800000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004062613136376533643661373734336237323865316336373037333465323064653366376536613765663938313964636330383663396134613535623064613536000000000000000000000000000000000000000000000000000000000000002c3030313462643537336264363863616633653131616465336531333062643036333163636133626261386632000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000003e5ec00000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004062613136376533643661373734336237323865316336373037333465323064653366376536613765663938313964636330383663396134613535623064613536000000000000000000000000000000000000000000000000000000000000004632313032366363393734623332336434363265363230353338626335313563336233613933613236666133326131336530643531313337646436346335623665316537646163000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004062613136376533643661373734336237323865316336373037333465323064653366376536613765663938313964636330383663396134613535623064613536000000000000000000000000000000000000000000000000000000000000001436613038663964363538343166393436396133370000000000000000000000000000000000000000000000000000000000000000000000000000000000000042303236636339373462333233643436326536323035333862633531356333623361393361323666613332613133653064353131333764643634633562366531653764000000000000000000000000000000000000000000000000000000000000";

        let contract = Contract::new("example.testnet".parse().unwrap());
        let is_authorized = contract.is_krnl_authorized(
            auth.to_string(),
            sender.to_string(),
            recipient.to_string(),
            kernel_response.to_string(),
        );

        assert!(is_authorized);

        let decoded_response = contract.decode_krnl_response(kernel_response.to_string());

       println!("Decoded response: {:?}", decoded_response);
    }
}
