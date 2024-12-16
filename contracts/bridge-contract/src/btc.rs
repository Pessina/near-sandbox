use crate::*;

use omni_transaction::{
    bitcoin::{
        bitcoin_transaction::BitcoinTransaction,
        bitcoin_transaction_builder::BitcoinTransactionBuilder,
        types::{
            Amount, EcdsaSighashType, Hash, LockTime, OutPoint, ScriptBuf, Sequence, TxIn, TxOut,
            Txid, Version, Witness,
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
pub struct UTXO {
    pub txid: String,
    pub vout: u32,
    pub value: u64,
    pub script_pubkey: String,
}

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

#[near]
impl Contract {
    pub fn prepare_btc_tx(
        &mut self,
        input_utxos: Vec<UTXO>,
        output_utxos: Vec<UTXO>,
    ) -> PreparedBitcoinTransaction {
        log!("Starting prepare_btc_tx");

        let inputs: Vec<_> = input_utxos
            .iter()
            .map(|utxo| {
                let txid = Txid(Hash::from_hex(&utxo.txid).unwrap());
                TxIn {
                    previous_output: OutPoint { txid, vout: utxo.vout },
                    script_sig: ScriptBuf::default(),
                    sequence: Sequence::MAX,
                    witness: Witness::new(),
                }
            })
            .collect();

        let outputs: Vec<_> = output_utxos
            .iter()
            .map(|utxo| {
                let script = ScriptBuf::from_hex(&utxo.script_pubkey).unwrap();
                TxOut {
                    value: Amount::from_sat(utxo.value),
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
        let mut sighashes = Vec::with_capacity(input_utxos.len());
        for (i, utxo) in input_utxos.iter().enumerate() {
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
        signature: SignResult,
    ) -> String {
        log!("Got signature from signer {:?}", signature);
        
        // Add DER-encoded signature with SIGHASH_ALL
        let mut signature_data = Vec::new();
        signature_data.extend_from_slice(&hex::decode(&signature.big_r.affine_point).expect("Invalid big_r hex"));
        signature_data.extend_from_slice(&hex::decode(&signature.s.scalar).expect("Invalid s hex")); 
        signature_data.push(0x01); // SIGHASH_ALL

        // Add public key
        let public_key = hex::decode("03f5661286e599cdc51808ac23aeb6e4c4ada46d252b984bac0500c879a589437a").expect("Invalid public key hex");

        // Create witness with signature and public key
        let witness = Witness::from_slice(&[&signature_data, &public_key]);
        let mut final_tx = tx;
        final_tx.input[0].witness = witness;

        // Convert transaction to hex for broadcasting
        let serialized = final_tx.serialize();
        let tx_hex = hex::encode(serialized);
        
        // Return transaction hex that needs to be broadcasted
        tx_hex
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
        let input_utxos = vec![UTXO {
            txid: "b9d3e0a416120f99f178bb3d95a87173bdb51d5e38da04db0179b3124fbc5370".to_string(),
            vout: 1,
            value: 430506,
            script_pubkey: "00140d7d0223d302b4e8ef37050b5200b1c3306ae7ab".to_string(),
        }];

        let output_utxos = vec![
            UTXO {
                txid: String::new(),
                vout: 0,
                value: 1200,
                script_pubkey: "0014d3ae5a5de66aa44e7d5723b74e590340b3212f46".to_string(),
            },
            UTXO {
                txid: String::new(),
                vout: 1,
                value: 428854,
                script_pubkey: "00140d7d0223d302b4e8ef37050b5200b1c3306ae7ab".to_string(),
            }
        ];

        let mut contract = Contract::new("v1.signer-prod.testnet".parse().unwrap());

        let prepared_bitcoin_transaction = contract.prepare_btc_tx(input_utxos, output_utxos);

        assert_eq!(
            prepared_bitcoin_transaction.sighashes[0],
            [224, 73, 126, 48, 217, 94, 79, 58, 71, 74, 219, 119, 243, 197, 183, 197, 103, 2, 227, 119, 154, 47, 20, 175, 240, 168, 89, 60, 152, 92, 190, 186]
        );
    }

    #[test]
    fn test_btc_tx_finalization() {
        let input_utxos = vec![UTXO {
            txid: "b9d3e0a416120f99f178bb3d95a87173bdb51d5e38da04db0179b3124fbc5370".to_string(),
            vout: 1,
            value: 430506,
            script_pubkey: "00140d7d0223d302b4e8ef37050b5200b1c3306ae7ab".to_string(),
        }];

        let output_utxos = vec![
            UTXO {
                txid: String::new(),
                vout: 0,
                value: 1200,
                script_pubkey: "0014d3ae5a5de66aa44e7d5723b74e590340b3212f46".to_string(),
            },
            UTXO {
                txid: String::new(),
                vout: 1,
                value: 428854,
                script_pubkey: "00140d7d0223d302b4e8ef37050b5200b1c3306ae7ab".to_string(),
            }
        ];

        let mut contract = Contract::new("v1.signer-prod.testnet".parse().unwrap());
        let prepared_bitcoin_transaction = contract.prepare_btc_tx(input_utxos, output_utxos);

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

        let final_tx = contract.finalize_btc_tx(prepared_bitcoin_transaction.tx, signature);

        assert_eq!(
            final_tx,
            "020000000001017053bc4f12b37901db04da385e1db5bd7371a8953dbb78f1990f1216a4e0d3b90100000000ffffffff02b004000000000000160014d3ae5a5de66aa44e7d5723b74e590340b3212f46368b0600000000001600140d7d0223d302b4e8ef37050b5200b1c3306ae7ab02483045022100e123dac9ea85ff349a301bd6591657f1ed8a0d349f226080d624022284f4d1930220689983efbbf85df34a99507df24077ba85c92fcb54146d554f55b60a1626a816012102b12224ecec8184dbff10316a889ebee9f7871bd6de358c5323fbecce9d84fd2400000000"
        );
    }

    // TODO: Include test for multiple UTXOs
}
