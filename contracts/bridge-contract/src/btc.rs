use crate::*;

use omni_transaction::{
    bitcoin::{
        bitcoin_transaction::BitcoinTransaction,
        bitcoin_transaction_builder::BitcoinTransactionBuilder,
        types::{
            Amount, EcdsaSighashType, Hash, LockTime, OutPoint, ScriptBuf, Sequence, TxIn, TxOut,
            Txid, Version, Witness
        },
    },
    transaction_builder::TxBuilder,
};
use near_sdk::{log, near, serde::{Deserialize, Serialize}};
use schemars::JsonSchema;
use sha2::{Digest, Sha256};
use signer::SignResult;
use std::error::Error;

/// Length of a valid P2WPKH witness program script_pubkey.
/// P2WPKH script_pubkey: 0x00 0x14 (20-byte-hash)
/// Thus total length = 2 + 20 = 22 bytes.
const P2WPKH_WITNESS_LEN: usize = 22;

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct PreparedBitcoinTransaction {
    pub tx: BitcoinTransaction,
    pub sighashes: Vec<[u8; 32]>,
}

/// Convert a P2WPKH witness program (`0x0014{20-byte-hash}`) into the BIP143 script_code:
/// `OP_DUP OP_HASH160 <20-byte-hash> OP_EQUALVERIFY OP_CHECKSIG`.
fn p2wpkh_script_code_from_witness_program(script_pubkey: &ScriptBuf) -> Result<ScriptBuf, Box<dyn Error>> {
    let bytes = &script_pubkey.0;

    if !is_p2wpkh_script(bytes) {
        return Err("Invalid P2WPKH witness program".into());
    }

    let hash160 = &bytes[2..22];

    // Classic P2PKH script opcodes
    const OP_DUP: u8 = 0x76;
    const OP_HASH160: u8 = 0xa9;
    const OP_EQUALVERIFY: u8 = 0x88;
    const OP_CHECKSIG: u8 = 0xac;
    const PUSH_BYTES_20: u8 = 0x14;

    let mut script = Vec::with_capacity(25); // 1+1+1+20+1+1 = 25 bytes total
    script.extend_from_slice(&[OP_DUP, OP_HASH160, PUSH_BYTES_20]);
    script.extend_from_slice(hash160);
    script.extend_from_slice(&[OP_EQUALVERIFY, OP_CHECKSIG]);

    Ok(ScriptBuf(script))
}

/// Compute SegWit sighash for a given input using the specified script and value.
///
/// For P2WPKH, we must transform the witness program into the correct BIP143 script_code.
/// If the script_pubkey indicates a P2WPKH, we derive the script code; otherwise, we use the script_pubkey directly.
pub fn compute_segwit_sighash(
    tx: &BitcoinTransaction,
    input_index: usize,
    script_pubkey_hex: &str,
    value: u64,
) -> Result<Vec<u8>, Box<dyn Error>> {
    let script_pubkey = ScriptBuf::from_hex(script_pubkey_hex)?;
    let script_code = if is_p2wpkh_script(&script_pubkey.0) {
        p2wpkh_script_code_from_witness_program(&script_pubkey)?
    } else {
        script_pubkey
    };

    let sighash = tx.build_for_signing_segwit(EcdsaSighashType::All, input_index, &script_code, value);
    Ok(double_sha256(&sighash))
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct BtcInput {
    pub txid: String,
    pub vout: u32,
    pub value: u64,
    pub script_pubkey: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct BtcOutput {
    pub value: u64,
    pub script_pubkey: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct BitcoinTransactionRequest {
    pub inputs: Vec<BtcInput>,
    pub outputs: Vec<BtcOutput>,
    pub signer_public_key: String,
}

#[near]
impl Contract {
    pub fn prepare_btc_tx(
        &mut self,
        tx_request: BitcoinTransactionRequest
    ) -> PreparedBitcoinTransaction {
        log!("Starting prepare_btc_tx");


        let inputs: Vec<_> = tx_request.inputs
            .iter()
            .map(|input| {
                let txid = Txid(Hash::from_hex(&input.txid).unwrap());
                TxIn {
                    previous_output: OutPoint { txid, vout: input.vout },
                    script_sig: ScriptBuf::default(),
                    sequence: Sequence::MAX,
                    witness: Witness::new(),
                }
            })
            .collect();

        let outputs: Vec<_> = tx_request.outputs
            .iter()
            .map(|output| {
                let script = ScriptBuf::from_hex(&output.script_pubkey).unwrap();
                TxOut {
                    value: Amount::from_sat(output.value),
                    script_pubkey: script,
                }
            })
            .collect();

        let tx = BitcoinTransactionBuilder::new()
            .version(Version::Two)
            .lock_time(LockTime::from_height(0).unwrap())
            .inputs(inputs)
            .outputs(outputs)
            .build();

        // Compute sighash for each input
        let mut sighashes = Vec::with_capacity(tx_request.inputs.len());
        for (i, utxo) in tx_request.inputs.iter().enumerate() {
            let sighash = compute_segwit_sighash(
                &tx,
                i,
                &utxo.script_pubkey,
                utxo.value,
            ).expect("Failed to compute sighash");

            // Convert Vec<u8> to [u8; 32]
            let mut hash = [0u8; 32];
            hash.copy_from_slice(&sighash);
            sighashes.push(hash);
        }

        PreparedBitcoinTransaction { tx, sighashes }
    }

    pub fn finalize_btc_tx(
        &self,
        tx: BitcoinTransaction,
        signatures: Vec<SignResult>,
        signer_public_key: String,
    ) -> String {
        // Decode the public key from hex
        let public_key = hex::decode(signer_public_key).expect("Invalid public key hex");

        // Create witnesses for each input
        let mut final_tx = tx;
        for (i, signature) in signatures.iter().enumerate() {
            // Extract R and S as 32-byte integers
            let r_bytes = extract_32_byte_scalar_from_hex(&signature.big_r.affine_point);
            let s_bytes = extract_32_byte_scalar_from_hex(&signature.s.scalar);

            // Normalize R and S for DER
            let r = normalize_der_int(r_bytes);
            let s = normalize_der_int(s_bytes);

            // Construct the DER-encoded signature
            let total_len = 2 + r.len() + 2 + s.len(); // 2 bytes overhead per integer
            let mut der_signature = Vec::with_capacity(6 + r.len() + s.len());
            der_signature.push(0x30); // DER sequence
            der_signature.push(total_len as u8);
            der_signature.push(0x02); // integer for R
            der_signature.push(r.len() as u8);
            der_signature.extend_from_slice(&r);
            der_signature.push(0x02); // integer for S
            der_signature.push(s.len() as u8);
            der_signature.extend_from_slice(&s);
            
            // Append SIGHASH_ALL (0x01)
            der_signature.push(0x01);

            // Create the witness with DER-encoded signature and public key
            let witness = Witness::from_slice(&[&der_signature, &public_key]);

            // Assign witness to this input
            final_tx.input[i].witness = witness;
        }

        // Serialize and return hex
        let serialized = final_tx.serialize();
        hex::encode(serialized)
    }
}
fn normalize_der_int(mut val: Vec<u8>) -> Vec<u8> {
    // Remove leading zeros
    while val.len() > 1 && val[0] == 0x00 {
        val.remove(0);
    }
    // If MSB is set, prepend 0x00 to indicate positive integer
    if val[0] & 0x80 != 0 {
        let mut prefixed = vec![0x00];
        prefixed.extend(val);
        prefixed
    } else {
        val
    }
}

/// Extract a 32-byte scalar from a hex string. If your input isn't already
/// guaranteed to be 32 bytes, adjust accordingly.
/// If `affine_point` is actually a compressed point, you need a method
/// to extract just the x-coordinate as a 32-byte integer.
fn extract_32_byte_scalar_from_hex(hex_str: &str) -> Vec<u8> {
    let bytes = hex::decode(hex_str).expect("Invalid hex");
    // Ensure exactly 32 bytes. If shorter, pad on the left with zeros.
    // If longer, you'd need to handle the specific format.
    // This step depends on the exact format of your input data.
    if bytes.len() == 32 {
        bytes
    } else if bytes.len() < 32 {
        let mut padded = vec![0u8; 32 - bytes.len()];
        padded.extend_from_slice(&bytes);
        padded
    } else {
        // If there's more than 32 bytes, you need to extract the 32-byte integer part.
        // For example, if this represents a compressed point starting with 0x02 or 0x03,
        // drop the first byte and ensure the rest is 32 bytes:
        // Typically, a compressed point starts with 0x02 or 0x03 followed by 32 bytes of x.
        // In that case:
        let scalar = bytes[1..33].to_vec();
        // Now scalar should be 32 bytes.
        if scalar.len() != 32 {
            panic!("Could not extract a 32-byte scalar from the given input");
        }
        scalar
    }
}

/// Check if the given script_pubkey is a valid P2WPKH witness program.
///
/// A valid P2WPKH witness program starts with 0x00, 0x14 followed by a 20-byte hash.
#[inline]
fn is_p2wpkh_script(script: &[u8]) -> bool {
    script.len() == P2WPKH_WITNESS_LEN && script[0] == 0x00 && script[1] == 0x14
}

#[inline]
fn double_sha256(data: &[u8]) -> Vec<u8> {
    Sha256::digest(Sha256::digest(data)).to_vec()
}

#[cfg(test)]
mod tests {
    use signer::{SerializableAffinePoint, SerializableScalar};

    use super::*;

    #[test]
    fn test_p2wpkh_sighash() {
        let input_utxos = vec![BtcInput {
            txid: "b9d3e0a416120f99f178bb3d95a87173bdb51d5e38da04db0179b3124fbc5370".to_string(),
            vout: 1,
            value: 430506,
            script_pubkey: "00140d7d0223d302b4e8ef37050b5200b1c3306ae7ab".to_string(),
        }];

        let output_utxos = vec![
            BtcOutput {
                value: 1200,
                script_pubkey: "0014d3ae5a5de66aa44e7d5723b74e590340b3212f46".to_string(),
            },
            BtcOutput {
                value: 428854,
                script_pubkey: "00140d7d0223d302b4e8ef37050b5200b1c3306ae7ab".to_string(),
            }
        ];

        let mut contract = Contract::new("v1.signer-prod.testnet".parse().unwrap());

        let prepared_bitcoin_transaction = contract.prepare_btc_tx(BitcoinTransactionRequest {
            inputs: input_utxos.clone(),
            outputs: output_utxos.clone(),
            signer_public_key: "02b12224ecec8184dbff10316a889ebee9f7871bd6de358c5323fbecce9d84fd24".to_string(),
        });

        assert_eq!(
            prepared_bitcoin_transaction.sighashes[0],
            [224, 73, 126, 48, 217, 94, 79, 58, 71, 74, 219, 119, 243, 197, 183, 197, 103, 2, 227, 119, 154, 47, 20, 175, 240, 168, 89, 60, 152, 92, 190, 186]
        );

        // This is a valid signature for the transaction above
        let signature = SignResult {
            big_r: SerializableAffinePoint {
                affine_point: "03E123DAC9EA85FF349A301BD6591657F1ED8A0D349F226080D624022284F4D193".to_string(),
            },
            s: SerializableScalar {
                scalar: "689983EFBBF85DF34A99507DF24077BA85C92FCB54146D554F55B60A1626A816".to_string(),
            },
            recovery_id: 0,
        };

        let public_key = "02b12224ecec8184dbff10316a889ebee9f7871bd6de358c5323fbecce9d84fd24".to_string();

        let final_tx = contract.finalize_btc_tx(prepared_bitcoin_transaction.tx, vec![signature], public_key);

        assert_eq!(
            final_tx,
            "020000000001017053bc4f12b37901db04da385e1db5bd7371a8953dbb78f1990f1216a4e0d3b90100000000ffffffff02b004000000000000160014d3ae5a5de66aa44e7d5723b74e590340b3212f46368b0600000000001600140d7d0223d302b4e8ef37050b5200b1c3306ae7ab02483045022100e123dac9ea85ff349a301bd6591657f1ed8a0d349f226080d624022284f4d1930220689983efbbf85df34a99507df24077ba85c92fcb54146d554f55b60a1626a816012102b12224ecec8184dbff10316a889ebee9f7871bd6de358c5323fbecce9d84fd2400000000"
        );
    }
}
