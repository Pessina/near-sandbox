use crate::*;

use ethabi::{decode, ParamType, Token};
use hex;
use bech32;
use sha3::{Digest, Keccak256};
use serde::Serialize;
use serde_json::Value;

fn decode_hex(hex_str: &str) -> Vec<u8> {
    hex::decode(hex_str.trim_start_matches("0x")).unwrap()
}

fn bytes_to_hex(data: &[u8]) -> String {
    format!("0x{}", hex::encode(data))
}

fn big_int_to_string(token: &Token) -> String {
    match token {
        Token::Uint(num) => num.to_string(),
        Token::Int(num) => num.to_string(),
        _ => panic!("Not a numeric token"),
    }
}

fn fixed_bytes_to_hex(data: &[u8]) -> Value {
    match data.len() {
        20 => {
            // 20-byte arrays as Ethereum addresses
            Value::String(bytes_to_hex(data))
        },
        32 => {
            // 32-byte arrays as hashes
            Value::String(bytes_to_hex(data))
        },
        _ => {
            // Otherwise just hex-encode
            Value::String(bytes_to_hex(data))
        }
    }
}

#[derive(Serialize)]
struct KernelResponse {
    Price: String,
    Transaction: Transaction,
    Premium: String,
    Liquidity: Liquidity,
}

#[derive(Serialize)]
struct Transaction {
    Verified: bool,
    Receipt: Receipt,
}

#[derive(Serialize)]
struct Receipt {
    From: String,
    To: String,
    Status: u8,
    BlockHash: String,
    BlockNumber: u64,
    TransactionHash: String,
    TransactionIndex: u64,
    GasUsed: u64,
    CumulativeGasUsed: u64,
    EffectiveGasPrice: u64,
    Type: u8,
    Root: String,
    Logs: Vec<Log>,
}

#[derive(Serialize)]
struct Log {
    Address: String,
    Topics: Vec<String>,
    Data: String,
    BlockNumber: u64,
    TransactionHash: String,
    TransactionIndex: u64,
    BlockHash: String,
    LogIndex: u64,
    Removed: bool,
}

#[derive(Serialize)]
struct Liquidity {
    Balance: String,
    TotalInputAmount: String,
    RequiredAmount: String,
    ChangeAmount: String,
    EstimatedFee: String,
    ActualFee: String,
    Sufficient: bool,
    Utxos: Vec<Utxo>,
    Fees: Fees,
    InputUtxos: Vec<InputUtxo>,
    OutputUtxos: Vec<OutputUtxo>,
    LpPubkey: String,
}

#[derive(Serialize)]
struct Fees {
    FastestFee: u64,
    HalfHourFee: u64,
    HourFee: u64,
    EconomyFee: u64,
    MinimumFee: u64,
}

#[derive(Serialize)]
struct Status {
    Confirmed: bool,
    BlockHash: String,
    BlockHeight: u64,
    BlockTime: u64,
}

#[derive(Serialize)]
struct Utxo {
    Txid: String,
    Vout: u64,
    Status: Status,
    Value: String,
}

#[derive(Serialize)]
struct InputUtxo {
    Txid: String,
    Vout: u64,
    Value: String,
    ScriptPubkey: String,
}

#[derive(Serialize)]
struct OutputUtxo {
    Txid: String,
    Vout: u64,
    Value: String,
    ScriptPubkey: String,
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

    pub fn decode_krnl_response(&self, kernel_response: String) -> String {
        let kernel_response = decode_hex(&kernel_response);

        // Decode tokens
        // kernelResp tuple: (String, (Bool, receipt), String, liquidity)
        // We'll decode using ethabi::decode with the ParamTypes you defined earlier.
        let tokens = {
            use ethabi::ParamType;

            // Define all ParamTypes as before (omitted for brevity, assume same as your initial code).
            // Here we only decode once since we already know the structure is correct.

            // logs[]: each log is a tuple
            let log_type = ParamType::Tuple(vec![
                ParamType::Address,
                ParamType::Array(Box::new(ParamType::FixedBytes(32))),
                ParamType::Bytes,
                ParamType::Uint(64),
                ParamType::FixedBytes(32),
                ParamType::Uint(64),
                ParamType::FixedBytes(32),
                ParamType::Uint(64),
                ParamType::Bool,
            ]);

            // receipt: a tuple
            let receipt_type = ParamType::Tuple(vec![
                ParamType::Address,
                ParamType::Address,
                ParamType::Uint(8),
                ParamType::FixedBytes(32),
                ParamType::Uint(64),
                ParamType::FixedBytes(32),
                ParamType::Uint(64),
                ParamType::Uint(64),
                ParamType::Uint(64),
                ParamType::Uint(64),
                ParamType::Uint(8),
                ParamType::FixedBytes(32),
                ParamType::Array(Box::new(log_type)),
            ]);

            // transaction: tuple(verified:bool, receipt:receipt_type)
            let transaction_type = ParamType::Tuple(vec![
                ParamType::Bool,
                receipt_type,
            ]);

            // utxos[]: each utxo is (string, uint64, (bool,string,uint64,uint64), uint256)
            let utxo_status_type = ParamType::Tuple(vec![
                ParamType::Bool,
                ParamType::String,
                ParamType::Uint(64),
                ParamType::Uint(64),
            ]);

            let utxo_type = ParamType::Tuple(vec![
                ParamType::String,
                ParamType::Uint(64),
                utxo_status_type,
                ParamType::Uint(256),
            ]);

            // fees tuple
            let fees_type = ParamType::Tuple(vec![
                ParamType::Uint(64),
                ParamType::Uint(64),
                ParamType::Uint(64),
                ParamType::Uint(64),
                ParamType::Uint(64),
            ]);

            // input_utxos[]: each (txid:string, vout:uint64, value:uint256, script_pubkey:string)
            let input_utxo_type = ParamType::Tuple(vec![
                ParamType::String,
                ParamType::Uint(64),
                ParamType::Uint(256),
                ParamType::String,
            ]);

            // output_utxos[]: same structure as input_utxos
            let output_utxo_type = input_utxo_type.clone();

            // liquidity tuple
            let liquidity_type = ParamType::Tuple(vec![
                ParamType::String,                     // balance
                ParamType::String,                     // total_input_amount
                ParamType::String,                     // required_amount
                ParamType::String,                     // change_amount
                ParamType::String,                     // estimated_fee
                ParamType::String,                     // actual_fee
                ParamType::Bool,                       // sufficient
                ParamType::Array(Box::new(utxo_type)), // utxos
                fees_type,                             // fees
                ParamType::Array(Box::new(input_utxo_type)),  // input_utxos
                ParamType::Array(Box::new(output_utxo_type)), // output_utxos
                ParamType::String,                     // lp_pubkey
            ]);

            // kernelResp tuple
            let kernel_resp_type = ParamType::Tuple(vec![
                ParamType::String,      // price
                transaction_type,       // transaction
                ParamType::String,      // premium
                liquidity_type,         // liquidity
            ]);

            let params = vec![kernel_resp_type];
            decode(&params, &kernel_response).unwrap()
        };

        // tokens[0] is the kernelResp tuple
        let kernel_resp_tuple = match &tokens[0] {
            Token::Tuple(t) => t,
            _ => panic!("Expected kernelResp as a tuple"),
        };

        let price = match &kernel_resp_tuple[0] {
            Token::String(s) => s.clone(),
            _ => panic!("Price must be a string"),
        };

        // transaction tuple: (bool verified, receipt)
        let transaction_tuple = match &kernel_resp_tuple[1] {
            Token::Tuple(t) => t,
            _ => panic!("Transaction must be a tuple"),
        };

        let verified = match &transaction_tuple[0] {
            Token::Bool(b) => *b,
            _ => panic!("Verified must be bool"),
        };

        let receipt_tuple = match &transaction_tuple[1] {
            Token::Tuple(t) => t,
            _ => panic!("Receipt must be a tuple"),
        };

        let from_addr = match &receipt_tuple[0] {
            Token::Address(a) => format!("0x{:x}", a),
            _ => panic!("From must be address"),
        };
        let to_addr = match &receipt_tuple[1] {
            Token::Address(a) => format!("0x{:x}", a),
            _ => panic!("To must be address"),
        };
        let status = match &receipt_tuple[2] {
            Token::Uint(u) => u.as_u64() as u8,
            _ => panic!("Status must be uint8"),
        };
        let block_hash = match &receipt_tuple[3] {
            Token::FixedBytes(b) => format!("0x{}", hex::encode(b)),
            _ => panic!("BlockHash must be bytes32"),
        };
        let block_number = match &receipt_tuple[4] {
            Token::Uint(u) => u.as_u64(),
            _ => panic!("BlockNumber must be uint64"),
        };
        let tx_hash = match &receipt_tuple[5] {
            Token::FixedBytes(b) => format!("0x{}", hex::encode(b)),
            _ => panic!("TransactionHash must be bytes32"),
        };
        let tx_index = match &receipt_tuple[6] {
            Token::Uint(u) => u.as_u64(),
            _ => panic!("TransactionIndex must be uint64"),
        };
        let gas_used = match &receipt_tuple[7] {
            Token::Uint(u) => u.as_u64(),
            _ => panic!("GasUsed must be uint64"),
        };
        let cumulative_gas_used = match &receipt_tuple[8] {
            Token::Uint(u) => u.as_u64(),
            _ => panic!("CumulativeGasUsed must be uint64"),
        };
        let effective_gas_price = match &receipt_tuple[9] {
            Token::Uint(u) => u.as_u64(),
            _ => panic!("EffectiveGasPrice must be uint64"),
        };
        let r#type = match &receipt_tuple[10] {
            Token::Uint(u) => u.as_u64() as u8,
            _ => panic!("Type must be uint8"),
        };
        let root = match &receipt_tuple[11] {
            Token::FixedBytes(b) => format!("0x{}", hex::encode(b)),
            _ => panic!("Root must be bytes32"),
        };

        let logs_array = match &receipt_tuple[12] {
            Token::Array(arr) => arr,
            _ => panic!("Logs must be an array"),
        };

        let mut logs = Vec::new();
        for log_token in logs_array {
            let log_tuple = match log_token {
                Token::Tuple(t) => t,
                _ => panic!("Each log must be a tuple"),
            };

            // log fields:
            let address = match &log_tuple[0] {
                Token::Address(a) => format!("0x{:x}", a),
                _ => panic!("Log address must be address"),
            };
            let topics_array = match &log_tuple[1] {
                Token::Array(arr) => arr,
                _ => panic!("Log topics must be array"),
            };
            let mut topics = Vec::new();
            for t in topics_array {
                match t {
                    Token::FixedBytes(b) => topics.push(format!("0x{}", hex::encode(b))),
                    _ => panic!("Topic must be bytes32"),
                }
            }
            let data = match &log_tuple[2] {
                Token::Bytes(b) => format!("0x{}", hex::encode(b)),
                _ => panic!("Log data must be bytes"),
            };
            let block_number = match &log_tuple[3] {
                Token::Uint(u) => u.as_u64(),
                _ => panic!("Log blockNumber must be uint64"),
            };
            let t_hash = match &log_tuple[4] {
                Token::FixedBytes(b) => format!("0x{}", hex::encode(b)),
                _ => panic!("Log transactionHash must be bytes32"),
            };
            let t_index = match &log_tuple[5] {
                Token::Uint(u) => u.as_u64(),
                _ => panic!("Log transactionIndex must be uint64"),
            };
            let b_hash = match &log_tuple[6] {
                Token::FixedBytes(b) => format!("0x{}", hex::encode(b)),
                _ => panic!("Log blockHash must be bytes32"),
            };
            let log_index = match &log_tuple[7] {
                Token::Uint(u) => u.as_u64(),
                _ => panic!("Log logIndex must be uint64"),
            };
            let removed = match &log_tuple[8] {
                Token::Bool(b) => *b,
                _ => panic!("Log removed must be bool"),
            };

            logs.push(Log {
                Address: address,
                Topics: topics,
                Data: data,
                BlockNumber: block_number,
                TransactionHash: t_hash,
                TransactionIndex: t_index,
                BlockHash: b_hash,
                LogIndex: log_index,
                Removed: removed,
            });
        }

        let receipt = Receipt {
            From: from_addr,
            To: to_addr,
            Status: status,
            BlockHash: block_hash,
            BlockNumber: block_number,
            TransactionHash: tx_hash,
            TransactionIndex: tx_index,
            GasUsed: gas_used,
            CumulativeGasUsed: cumulative_gas_used,
            EffectiveGasPrice: effective_gas_price,
            Type: r#type,
            Root: root,
            Logs: logs,
        };

        let transaction = Transaction {
            Verified: verified,
            Receipt: receipt,
        };

        let premium = match &kernel_resp_tuple[2] {
            Token::String(s) => s.clone(),
            _ => panic!("Premium must be a string"),
        };

        let liquidity_tuple = match &kernel_resp_tuple[3] {
            Token::Tuple(t) => t,
            _ => panic!("Liquidity must be tuple"),
        };

        // liquidity fields:
        let balance = match &liquidity_tuple[0] {
            Token::String(s) => s.clone(),
            _ => panic!("Balance must be string"),
        };
        let total_input_amount = match &liquidity_tuple[1] {
            Token::String(s) => s.clone(),
            _ => panic!("TotalInputAmount must be string"),
        };
        let required_amount = match &liquidity_tuple[2] {
            Token::String(s) => s.clone(),
            _ => panic!("RequiredAmount must be string"),
        };
        let change_amount = match &liquidity_tuple[3] {
            Token::String(s) => s.clone(),
            _ => panic!("ChangeAmount must be string"),
        };
        let estimated_fee = match &liquidity_tuple[4] {
            Token::String(s) => s.clone(),
            _ => panic!("EstimatedFee must be string"),
        };
        let actual_fee = match &liquidity_tuple[5] {
            Token::String(s) => s.clone(),
            _ => panic!("ActualFee must be string"),
        };
        let sufficient = match &liquidity_tuple[6] {
            Token::Bool(b) => *b,
            _ => panic!("Sufficient must be bool"),
        };
        let utxos_array = match &liquidity_tuple[7] {
            Token::Array(arr) => arr,
            _ => panic!("Utxos must be array"),
        };

        let mut utxos = Vec::new();
        for u in utxos_array {
            let u_tuple = match u {
                Token::Tuple(tt) => tt,
                _ => panic!("Utxo must be tuple"),
            };
            let txid = match &u_tuple[0] {
                Token::String(s) => s.clone(),
                _ => panic!("Utxo txid must be string"),
            };
            let vout = match &u_tuple[1] {
                Token::Uint(u) => u.as_u64(),
                _ => panic!("Utxo vout must be uint64"),
            };
            let status_tuple = match &u_tuple[2] {
                Token::Tuple(st) => st,
                _ => panic!("Utxo status must be tuple"),
            };
            let confirmed = match &status_tuple[0] {
                Token::Bool(b) => *b,
                _ => panic!("Status confirmed must be bool"),
            };
            let block_hash_str = match &status_tuple[1] {
                Token::String(s) => s.clone(),
                _ => panic!("Status block_hash must be string"),
            };
            let block_height = match &status_tuple[2] {
                Token::Uint(u) => u.as_u64(),
                _ => panic!("Status block_height must be uint64"),
            };
            let block_time = match &status_tuple[3] {
                Token::Uint(u) => u.as_u64(),
                _ => panic!("Status block_time must be uint64"),
            };
            let value = match &u_tuple[3] {
                Token::Uint(u) => u.to_string(),
                _ => panic!("Utxo value must be uint256"),
            };

            let status = Status {
                Confirmed: confirmed,
                BlockHash: block_hash_str,
                BlockHeight: block_height,
                BlockTime: block_time,
            };

            utxos.push(Utxo {
                Txid: txid,
                Vout: vout,
                Status: status,
                Value: value,
            });
        }

        let fees_tuple = match &liquidity_tuple[8] {
            Token::Tuple(ft) => ft,
            _ => panic!("Fees must be tuple"),
        };

        let fastest_fee = match &fees_tuple[0] {
            Token::Uint(u) => u.as_u64(),
            _ => panic!("FastestFee must be uint64"),
        };
        let half_hour_fee = match &fees_tuple[1] {
            Token::Uint(u) => u.as_u64(),
            _ => panic!("HalfHourFee must be uint64"),
        };
        let hour_fee = match &fees_tuple[2] {
            Token::Uint(u) => u.as_u64(),
            _ => panic!("HourFee must be uint64"),
        };
        let economy_fee = match &fees_tuple[3] {
            Token::Uint(u) => u.as_u64(),
            _ => panic!("EconomyFee must be uint64"),
        };
        let minimum_fee = match &fees_tuple[4] {
            Token::Uint(u) => u.as_u64(),
            _ => panic!("MinimumFee must be uint64"),
        };

        let fees = Fees {
            FastestFee: fastest_fee,
            HalfHourFee: half_hour_fee,
            HourFee: hour_fee,
            EconomyFee: economy_fee,
            MinimumFee: minimum_fee,
        };

        let input_utxos_array = match &liquidity_tuple[9] {
            Token::Array(arr) => arr,
            _ => panic!("InputUtxos must be array"),
        };

        let mut input_utxos = Vec::new();
        for iu in input_utxos_array {
            let iu_tuple = match iu {
                Token::Tuple(it) => it,
                _ => panic!("InputUtxo must be tuple"),
            };
            let txid = match &iu_tuple[0] {
                Token::String(s) => s.clone(),
                _ => panic!("InputUtxo txid must be string"),
            };
            let vout = match &iu_tuple[1] {
                Token::Uint(u) => u.as_u64(),
                _ => panic!("InputUtxo vout must be uint64"),
            };
            let value = match &iu_tuple[2] {
                Token::Uint(u) => u.to_string(),
                _ => panic!("InputUtxo value must be uint256"),
            };
            let script_pubkey = match &iu_tuple[3] {
                Token::String(s) => s.clone(),
                _ => panic!("InputUtxo script_pubkey must be string"),
            };

            input_utxos.push(InputUtxo {
                Txid: txid,
                Vout: vout,
                Value: value,
                ScriptPubkey: script_pubkey,
            });
        }

        let output_utxos_array = match &liquidity_tuple[10] {
            Token::Array(arr) => arr,
            _ => panic!("OutputUtxos must be array"),
        };

        let mut output_utxos = Vec::new();
        for ou in output_utxos_array {
            let ot = match ou {
                Token::Tuple(ot) => ot,
                _ => panic!("OutputUtxo must be tuple"),
            };
            let txid = match &ot[0] {
                Token::String(s) => s.clone(),
                _ => panic!("OutputUtxo txid must be string"),
            };
            let vout = match &ot[1] {
                Token::Uint(u) => u.as_u64(),
                _ => panic!("OutputUtxo vout must be uint64"),
            };
            let value = match &ot[2] {
                Token::Uint(u) => u.to_string(),
                _ => panic!("OutputUtxo value must be uint256"),
            };
            let script_pubkey = match &ot[3] {
                Token::String(s) => s.clone(),
                _ => panic!("OutputUtxo script_pubkey must be string"),
            };

            output_utxos.push(OutputUtxo {
                Txid: txid,
                Vout: vout,
                Value: value,
                ScriptPubkey: script_pubkey,
            });
        }

        let lp_pubkey = match &liquidity_tuple[11] {
            Token::String(s) => s.clone(),
            _ => panic!("LpPubkey must be string"),
        };

        let liquidity = Liquidity {
            Balance: balance,
            TotalInputAmount: total_input_amount,
            RequiredAmount: required_amount,
            ChangeAmount: change_amount,
            EstimatedFee: estimated_fee,
            ActualFee: actual_fee,
            Sufficient: sufficient,
            Utxos: utxos,
            Fees: fees,
            InputUtxos: input_utxos,
            OutputUtxos: output_utxos,
            LpPubkey: lp_pubkey,
        };

        let resp = KernelResponse {
            Price: price,
            Transaction: transaction,
            Premium: premium,
            Liquidity: liquidity,
        };

        let val = serde_json::to_string_pretty(&vec![resp]).unwrap();
        println!("Decoded kernel response:\n{}", val);
        val
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
        // let is_authorized = contract.is_krnl_authorized(
        //     auth.to_string(),
        //     sender.to_string(),
        //     recipient.to_string(),
        //     kernel_response.to_string(),
        // );

        // assert!(is_authorized);

        let _decoded_response = contract.decode_krnl_response(kernel_response.to_string());
    }
}
