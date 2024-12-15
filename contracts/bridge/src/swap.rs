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
use near_sdk::{env::log_str, serde::{Deserialize, Serialize}};
use schemars::JsonSchema;
use sha2::{Digest, Sha256};
use std::error::Error;

/// Data structure representing a UTXO.
#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct UTXO {
    pub txid: String,
    pub vout: u32,
    pub value: u64,
    pub script_pubkey: String, // hex-encoded script pubkey (likely "0014..." for P2WPKH)
}

/// Convert a P2WPKH witness program script_pubkey (`0x0014{20-byte-hash}`) into the BIP143 script_code:
/// `OP_DUP OP_HASH160 <20-byte-hash> OP_EQUALVERIFY OP_CHECKSIG`
fn p2wpkh_script_code_from_witness_program(script_pubkey: &ScriptBuf) -> Result<ScriptBuf, Box<dyn Error>> {
    // P2WPKH script_pubkey is 0x00 0x14 followed by a 20-byte hash:
    // e.g. [0x00, 0x14, <20-bytes>]
    let bytes = script_pubkey.0.clone();
    if bytes.len() != 22 || bytes[0] != 0x00 || bytes[1] != 0x14 {
        return Err("Not a valid P2WPKH witness program".into());
    }

    let hash160 = &bytes[2..22];
    // Construct the classic P2PKH script:
    // OP_DUP OP_HASH160 <hash160> OP_EQUALVERIFY OP_CHECKSIG
    // 0x76 = OP_DUP
    // 0xa9 = OP_HASH160
    // 0x14 = push 20 bytes
    // 0x88 = OP_EQUALVERIFY
    // 0xac = OP_CHECKSIG
    let mut script = vec![0x76, 0xa9, 0x14];
    script.extend_from_slice(hash160);
    script.extend_from_slice(&[0x88, 0xac]);

    Ok(ScriptBuf(script))
}

/// Builds a simple SegWit transaction (Version 2) with given UTXO and spend amount.
pub fn prepare_btc_tx(
    utxos: &[UTXO],
    receiver_script_pubkey_hex: &str,
    spend_amount: u64,
) -> Result<BitcoinTransaction, Box<dyn Error>> {
    log_str("Starting prepare_btc_tx");
    let mut inputs = Vec::with_capacity(utxos.len());
    let mut total_input = 0u64;

    for utxo in utxos {
        let hash = Hash::from_hex(&utxo.txid)?;
        let txid = Txid(hash);
        let previous_output = OutPoint { txid, vout: utxo.vout };

        let input = TxIn {
            previous_output,
            script_sig: ScriptBuf::default(),
            sequence: Sequence::MAX,
            witness: Witness::new(),
        };

        total_input += utxo.value;
        inputs.push(input);
    }

    if total_input < spend_amount {
        return Err("Insufficient funds".into());
    }

    let fee = 452u64;
    let change_amount = total_input - spend_amount - fee;

    let receiver_script = ScriptBuf::from_hex(receiver_script_pubkey_hex)?;

    let mut outputs = vec![TxOut {
        value: Amount::from_sat(spend_amount),
        script_pubkey: receiver_script,
    }];

    if change_amount > 0 {
        let change_script = ScriptBuf::from_hex(&utxos[0].script_pubkey)?;
        outputs.push(TxOut {
            value: Amount::from_sat(change_amount),
            script_pubkey: change_script,
        });
    }

    let tx = BitcoinTransactionBuilder::new()
        .version(Version::Two)
        .lock_time(LockTime::from_height(0)?)
        .inputs(inputs)
        .outputs(outputs)
        .build();

    Ok(tx)
}

/// Compute SegWit sighash for a given input.
/// For P2WPKH, transform the witness program into the correct script_code.
pub fn compute_segwit_sighash(
    tx: &BitcoinTransaction,
    input_index: usize,
    script_pubkey_hex: &str,
    value: u64,
) -> Result<Vec<u8>, Box<dyn Error>> {
    let script_pubkey = ScriptBuf::from_hex(script_pubkey_hex)?;

    // If it's a P2WPKH (starting with 0x0014), build the script_code accordingly:
    let script_code = if script_pubkey.0.len() == 22 && script_pubkey.0[0] == 0x00 && script_pubkey.0[1] == 0x14 {
        p2wpkh_script_code_from_witness_program(&script_pubkey)?
    } else {
        // Otherwise, use the script_pubkey directly
        script_pubkey
    };

    let sighash = tx.build_for_signing_segwit(EcdsaSighashType::All, input_index, &script_code, value);

    let hash1 = Sha256::digest(&sighash);
    let hash2 = Sha256::digest(hash1);

    Ok(hash2.to_vec())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_p2wpkh_sighash() {
        let test_utxos = vec![UTXO {
            txid: "b9d3e0a416120f99f178bb3d95a87173bdb51d5e38da04db0179b3124fbc5370".to_string(),
            vout: 1,
            value: 430506,
            script_pubkey: "00140d7d0223d302b4e8ef37050b5200b1c3306ae7ab".to_string(),
        }];

        let receiver_script_pubkey = "0014d3ae5a5de66aa44e7d5723b74e590340b3212f46";
        let tx = prepare_btc_tx(&test_utxos, receiver_script_pubkey, 120).expect("Failed to build tx");

        let sighash = compute_segwit_sighash(
            &tx,
            0,
            &test_utxos[0].script_pubkey,
            test_utxos[0].value,
        ).expect("Failed to compute sighash");

        println!("Computed sighash: {:?}", sighash);

        // Compare this sighash with the TS implementation result.
        assert!(false);
    }
}
