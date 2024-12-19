use crate::*;

use ethabi::{decode, ParamType, Token};
use hex;
use bech32;
use sha3::{Digest, Keccak256};
use serde::Serialize;

fn decode_hex(hex_str: &str) -> Vec<u8> {
    hex::decode(hex_str.trim_start_matches("0x")).unwrap()
}

#[derive(Serialize, Debug)]
pub struct KernelResponse {
    pub price: String,
    pub transaction: Transaction,
    pub premium: String,
    pub liquidity: Liquidity,
}

#[derive(Serialize, Debug)]
pub struct Transaction {
    pub verified: bool,
    pub receipt: Receipt,
}

#[derive(Serialize, Debug)]
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
    pub logs: Vec<Log>,
}

#[derive(Serialize, Debug)]
pub struct Log {
    pub address: String,
    pub topics: Vec<String>,
    pub data: String,
    pub block_number: u64,
    pub transaction_hash: String,
    pub transaction_index: u64,
    pub block_hash: String,
    pub log_index: u64,
    pub removed: bool,
}

#[derive(Serialize, Debug)]
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
    pub input_utxos: Vec<InputUtxo>,
    pub output_utxos: Vec<OutputUtxo>,
    pub lp_pubkey: String,
}

#[derive(Serialize, Debug)]
pub struct Fees {
    pub fastest_fee: u64,
    pub half_hour_fee: u64,
    pub hour_fee: u64,
    pub economy_fee: u64,
    pub minimum_fee: u64,
}

#[derive(Serialize, Debug)]
pub struct Status {
    pub confirmed: bool,
    pub block_hash: String,
    pub block_height: u64,
    pub block_time: u64,
}

#[derive(Serialize, Debug)]
pub struct Utxo {
    pub txid: String,
    pub vout: u64,
    pub status: Status,
    pub value: String,
}

#[derive(Serialize, Debug)]
pub struct InputUtxo {
    pub txid: String,
    pub vout: u64,
    pub value: String,
    pub script_pubkey: String,
}

#[derive(Serialize, Debug)]
pub struct OutputUtxo {
    pub txid: String,
    pub vout: u64,
    pub value: String,
    pub script_pubkey: String,
}

fn decode_bech32_address(addr: &str) -> Vec<u8> {
    let (hrp, data, variant) = bech32::decode(addr).expect("invalid bech32 address");

    near_sdk::log!("hrp: {}", hrp);
    // We expect hrp to be "tb1" for testnet4
    assert!(hrp == "tb", "Expected testnet4 address starting with tb1");
    assert!(variant == bech32::Variant::Bech32 || variant == bech32::Variant::Bech32m);

    let data_u5: Vec<bech32::u5> = data
        .into_iter()
        .map(|x| bech32::u5::try_from_u8(x.into()).unwrap())
        .collect();

    let witness_version = data_u5[0].to_u8();
    if witness_version != 0 {
        panic!("Unexpected witness version, expected 0");
    }

    let wp = bech32::convert_bits(&data_u5[1..], 5, 8, false)
        .expect("invalid witness program conversion");
    wp
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
        let recipient_script = decode_bech32_address(&recipient);
        near_sdk::log!("recipient_script: {:?}", hex::encode(&recipient_script));
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

        println!("sender: 0x{}", hex::encode(&sender));
        println!("recipient: {}", recipient);
        println!("nonce: 0x{}", hex::encode(&nonce_bytes));
        println!("kernelResponse: 0x{}", hex::encode(&kernel_response));
        println!("signatureToken: 0x{}", hex::encode(&signature_token));

        let kernel_responses_digest = {
            let hash = Keccak256::digest(&kernel_response);
            let mut out = [0u8; 32];
            out.copy_from_slice(&hash);
            out
        };

        // Important: match the order used in the Go code
        // Go: dataDigest = keccak256(nonce, sender, recipient.ScriptAddress(), kernelResponsesDigest)
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

        println!("recoveredAddr: 0x{}", hex::encode_upper(&recovered_addr));
        println!("sender: 0x{}", hex::encode_upper(&sender));

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

            // Log tuple
            let log_type = ParamType::Tuple(vec![
                ParamType::Address,                                    // address
                ParamType::Array(Box::new(ParamType::FixedBytes(32))), // topics[]
                ParamType::Bytes,                                     // data
                ParamType::Uint(64),                                 // blockNumber
                ParamType::FixedBytes(32),                           // transactionHash
                ParamType::Uint(64),                                 // transactionIndex
                ParamType::FixedBytes(32),                           // blockHash
                ParamType::Uint(64),                                 // logIndex
                ParamType::Bool,                                     // removed
            ]);

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
                ParamType::Array(Box::new(log_type)),               // logs[]
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
                ParamType::String,                                  // lpPubkey
            ]);

            // Complete kernel response tuple
            ParamType::Tuple(vec![
                ParamType::String,                                  // price
                transaction_type,                                   // transaction
                ParamType::String,                                  // premium
                liquidity_type,                                     // liquidity
            ])
        };

        // Decode the response using the defined ABI
        let tokens = decode(&[kernel_resp_type], &kernel_response).unwrap();
        let kernel_resp_tuple = tokens[0].clone().into_tuple().unwrap();

        // Convert decoded tokens into KernelResponse struct
        let price = kernel_resp_tuple[0].clone().into_string().unwrap();
        let transaction_tuple = kernel_resp_tuple[1].clone().into_tuple().unwrap();
        let premium = kernel_resp_tuple[2].clone().into_string().unwrap();
        let liquidity_tuple = kernel_resp_tuple[3].clone().into_tuple().unwrap();

        // Build Transaction
        let verified = transaction_tuple[0].clone().into_bool().unwrap();
        let receipt_tuple = transaction_tuple[1].clone().into_tuple().unwrap();

        // Build Receipt
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
            logs: receipt_tuple[12].clone().into_array().unwrap().into_iter().map(|log_token| {
                let log_tuple = log_token.into_tuple().unwrap();
                Log {
                    address: format!("0x{:x}", log_tuple[0].clone().into_address().unwrap()),
                    topics: log_tuple[1].clone().into_array().unwrap().into_iter()
                        .map(|t| format!("0x{}", hex::encode(t.into_fixed_bytes().unwrap())))
                        .collect(),
                    data: format!("0x{}", hex::encode(log_tuple[2].clone().into_bytes().unwrap())),
                    block_number: log_tuple[3].clone().into_uint().unwrap().as_u64(),
                    transaction_hash: format!("0x{}", hex::encode(log_tuple[4].clone().into_fixed_bytes().unwrap())),
                    transaction_index: log_tuple[5].clone().into_uint().unwrap().as_u64(),
                    block_hash: format!("0x{}", hex::encode(log_tuple[6].clone().into_fixed_bytes().unwrap())),
                    log_index: log_tuple[7].clone().into_uint().unwrap().as_u64(),
                    removed: log_tuple[8].clone().into_bool().unwrap(),
                }
            }).collect(),
        };

        // Build Liquidity
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
                InputUtxo {
                    txid: iu_tuple[0].clone().into_string().unwrap(),
                    vout: iu_tuple[1].clone().into_uint().unwrap().as_u64(),
                    value: iu_tuple[2].clone().into_uint().unwrap().to_string(),
                    script_pubkey: iu_tuple[3].clone().into_string().unwrap(),
                }
            }).collect(),
            output_utxos: liquidity_tuple[10].clone().into_array().unwrap().into_iter().map(|ou_token| {
                let ou_tuple = ou_token.into_tuple().unwrap();
                OutputUtxo {
                    txid: ou_tuple[0].clone().into_string().unwrap(),
                    vout: ou_tuple[1].clone().into_uint().unwrap().as_u64(),
                    value: ou_tuple[2].clone().into_uint().unwrap().to_string(),
                    script_pubkey: ou_tuple[3].clone().into_string().unwrap(),
                }
            }).collect(),
            lp_pubkey: liquidity_tuple[11].clone().into_string().unwrap(),
        };

        KernelResponse {
            price,
            transaction: Transaction {
                verified,
                receipt,
            },
            premium,
            liquidity,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_example() {
        // You will provide `auth` and other fields later
        let auth = "0000000000000000000000000000000000000000000000000000000000000040e8cee009703ea25599a200dafd4ac1343ec6129e004edb98099db5a531b5238500000000000000000000000000000000000000000000000000000000000000415f8cc7a1fcc88fe84073574aaf4f07d7349dacb06f92b5653a1bb36e63b908580837ddbb2a4819437764ee3c9c1920bf21ce9d18b5bd189aec20aa1280ab8c9e0000000000000000000000000000000000000000000000000000000000000000";
        let sender ="889E6a9d863373A7A735AB71Cd481e63ef8d64A4";
        let recipient ="tb1qh4tnh45v4ulprt0ruyct6p33ej3mh28jsd656k";
        let kernel_response ="0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000000a302e30303033363834330000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000040000000000000000000000000889e6a9d863373a7a735ab71cd481e63ef8d64a4000000000000000000000000889e6a9d863373a7a735ab71cd481e63ef8d64a400000000000000000000000000000000000000000000000000000000000000019f450d2b17ba679992e662a246056050c312893019a6d7ccc48ac6d11eee1fb700000000000000000000000000000000000000000000000000000000006f765cfe7d12888b2bffa36869689673b02b65911f1a1e30035f6050ed445ca21b6334000000000000000000000000000000000000000000000000000000000000006e00000000000000000000000000000000000000000000000000000000000052080000000000000000000000000000000000000000000000000000000000d8a19c000000000000000000000000000000000000000000000000000000400d539aac0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e30313031303230300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000240000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000002c0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000038000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000076000000000000000000000000000000000000000000000000000000000000008e00000000000000000000000000000000000000000000000000000000000000d00000000000000000000000000000000000000000000000000000000000000000a302e303035313733343700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e303035303030303000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e303030333731303800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e303034363238393200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e303030303033303800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e3030303030333038000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000043c300000000000000000000000000000000000000000000000000000000000000406464663831303163343634383435643463303235613235653036336437303137313333386337643132643930646631323637376465653566306231386237373500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000e35f000000000000000000000000000000000000000000000000000000006760365e0000000000000000000000000000000000000000000000000000000000000040303030303030303036663838366661636131363362356433316633663361373734396136363662366433336638393739363130633063613739633236626439610000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000007a12000000000000000000000000000000000000000000000000000000000000000403065666434363237643363393735613564353833636232326663333664643538653533383163386136633930636238366364356539643566306138316630643000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000e35f000000000000000000000000000000000000000000000000000000006760365e0000000000000000000000000000000000000000000000000000000000000040303030303030303036663838366661636131363362356433316633663361373734396136363662366433336638393739363130633063613739633236626439610000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000007a12000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004030656664343632376433633937356135643538336362323266633336646435386535333831633861366339306362383663643565396435663061383166306430000000000000000000000000000000000000000000000000000000000000002c303031346264353733626436386361663365313161646533653133306264303633316363613362626138663200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008fc000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000000403461623333303839636363616463303133656664653633323136353331303263666466656466663566616631653561353932396162613463333632393537616300000000000000000000000000000000000000000000000000000000000000286264353733626436386361663365313161646533653133306264303633316363613362626138663200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000007102c00000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000000403461623333303839636363616463303133656664653633323136353331303263666466656466663566616631653561353932396162613463333632393537616300000000000000000000000000000000000000000000000000000000000000286264353733626436386361663365313161646533653133306264303633316363613362626138663200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000000403461623333303839636363616463303133656664653633323136353331303263666466656466663566616631653561353932396162613463333632393537616300000000000000000000000000000000000000000000000000000000000000143661303836386635326266636263386566353134000000000000000000000000000000000000000000000000000000000000000000000000000000000000002862643537336264363863616633653131616465336531333062643036333163636133626261386632000000000000000000000000000000000000000000000000";

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
