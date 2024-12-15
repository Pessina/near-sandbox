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

/// Default fee in satoshis.
/// TODO: Consider making fee dynamic or configurable instead of hardcoded.
const DEFAULT_FEE: u64 = 452;

/// Length of a valid P2WPKH witness program script_pubkey.
/// P2WPKH script_pubkey: 0x00 0x14 (20-byte-hash)
/// Thus total length = 2 + 20 = 22 bytes.
const P2WPKH_WITNESS_LEN: usize = 22;

/// Data structure representing a UTXO.
#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct UTXO {
    pub txid: String,
    pub vout: u32,
    pub value: u64,
    pub script_pubkey: String, // hex-encoded script pubkey (likely "0014..." for P2WPKH)
}

/// Convert a P2WPKH witness program (`0x0014{20-byte-hash}`) into the BIP143 script_code:
/// `OP_DUP OP_HASH160 <20-byte-hash> OP_EQUALVERIFY OP_CHECKSIG`.
fn p2wpkh_script_code_from_witness_program(script_pubkey: &ScriptBuf) -> Result<ScriptBuf, Box<dyn Error>> {
    let bytes = script_pubkey.0.clone();

    if bytes.len() != P2WPKH_WITNESS_LEN || bytes[0] != 0x00 || bytes[1] != 0x14 {
        return Err("Invalid P2WPKH witness program".into());
    }

    let hash160 = &bytes[2..22];

    // Classic P2PKH script: OP_DUP OP_HASH160 <20-byte-hash> OP_EQUALVERIFY OP_CHECKSIG
    const OP_DUP: u8 = 0x76;
    const OP_HASH160: u8 = 0xa9;
    const OP_EQUALVERIFY: u8 = 0x88;
    const OP_CHECKSIG: u8 = 0xac;

    let mut script = Vec::with_capacity(25); // 1+1+1+20+1+1 = 25 bytes total
    script.push(OP_DUP);
    script.push(OP_HASH160);
    script.push(0x14); // push 20 bytes
    script.extend_from_slice(hash160);
    script.push(OP_EQUALVERIFY);
    script.push(OP_CHECKSIG);

    Ok(ScriptBuf(script))
}

/// Build a simple SegWit v0 transaction (version = 2) spending given UTXOs to a receiver.
///
/// # Errors
/// Returns an error if:
/// - Hex parsing fails.
/// - There are insufficient funds.
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

        let input = TxIn {
            previous_output: OutPoint { txid, vout: utxo.vout },
            script_sig: ScriptBuf::default(),
            sequence: Sequence::MAX,
            witness: Witness::new(),
        };

        total_input = total_input
            .checked_add(utxo.value)
            .ok_or("Overflow calculating total input")?;
        inputs.push(input);
    }

    if total_input < spend_amount {
        return Err("Insufficient funds to cover spending amount".into());
    }

    // TODO: Consider a more sophisticated fee calculation or making it configurable.
    let fee = DEFAULT_FEE;
    let change_amount = total_input
        .checked_sub(spend_amount)
        .and_then(|res| res.checked_sub(fee))
        .ok_or("Overflow when calculating change")?;

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

    let sighash_final = double_sha256(&sighash);
    Ok(sighash_final)
}

/// Check if the given script_pubkey is likely a P2WPKH witness program.
///
/// Expects 0x00, 0x14 followed by a 20-byte hash.
fn is_p2wpkh_script(script: &[u8]) -> bool {
    script.len() == P2WPKH_WITNESS_LEN && script[0] == 0x00 && script[1] == 0x14
}

/// Perform double SHA-256 hashing on the given data.
fn double_sha256(data: &[u8]) -> Vec<u8> {
    let hash1 = Sha256::digest(data);
    Sha256::digest(hash1).to_vec()
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

        assert_eq!(
            sighash,
            vec![180, 25, 219, 49, 165, 52, 159, 142, 98, 43, 197, 118, 56, 64, 38, 144, 3, 138, 28, 117, 77, 47, 22, 188, 36, 204, 57, 86, 57, 126, 60, 155]
        );
    }
}
