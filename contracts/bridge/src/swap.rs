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
use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use sha2::{Digest, Sha256};
use std::error::Error;

/// Data structure representing a UTXO that we want to spend.
#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct UTXO {
    pub txid: String,
    pub vout: u32,
    pub value: u64,
    pub script_pubkey: String,
}

/// Prepares a Bitcoin transaction spending from the provided UTXOs to a given receiver.
///
/// The function uses a simple calculation for change and does not include fee calculation logic.
/// Ensure that `spend_amount` plus fees is less than total input to avoid failure.
///
/// # Errors
/// Returns an error if hex parsing fails or if spend_amount exceeds total inputs.
pub fn prepare_btc_tx(
    utxos: &[UTXO],
    receiver_script_pubkey: &str,
    spend_amount: u64,
) -> Result<BitcoinTransaction, Box<dyn Error>> {
    let mut inputs = Vec::with_capacity(utxos.len());
    let mut total_input = 0u64;

    // Create inputs from UTXOs
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

        total_input = total_input.checked_add(utxo.value).ok_or("Overflow in total_input")?;
        inputs.push(input);
    }

    // Create the receiver output
    let receiver_script = ScriptBuf::from_hex(receiver_script_pubkey)?;

    let mut outputs = vec![TxOut {
        value: Amount::from_sat(spend_amount),
        script_pubkey: receiver_script,
    }];

    // Calculate change
    if total_input < spend_amount {
        return Err("Insufficient funds".into());
    }
    let change_amount = total_input - spend_amount;

    // Add change output if needed
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

/// Computes the SegWit signature hash for a given input.
///
/// # Errors
/// Returns an error if script code hex parsing fails.
pub fn compute_segwit_sighash(
    tx: &BitcoinTransaction,
    input_index: usize,
    script_code_hex: &str,
    value: u64,
) -> Result<Vec<u8>, Box<dyn Error>> {
    let script_code = ScriptBuf::from_hex(script_code_hex)?;
    let sighash = tx.build_for_signing_segwit(EcdsaSighashType::All, input_index, &script_code, value);
    let hash1 = Sha256::digest(&sighash);
    let hash2 = Sha256::digest(hash1);
    Ok(hash2.to_vec())
}

/// Injects signatures and public keys into the transaction's witnesses for each input.
///
/// # Errors
/// Returns an error if the number of signatures/public keys doesn't match inputs.
pub fn sign_transaction(
    mut tx: BitcoinTransaction,
    signatures: Vec<Vec<u8>>,
    pubkeys: Vec<Vec<u8>>,
) -> Result<BitcoinTransaction, Box<dyn Error>> {
    if signatures.len() != tx.input.len() || pubkeys.len() != tx.input.len() {
        return Err("Must provide a signature and pubkey for each input".into());
    }

    for (i, (signature, pubkey)) in signatures.into_iter().zip(pubkeys).enumerate() {
        let witness = vec![signature, pubkey];
        tx.input[i].witness = Witness::from_slice(&witness);
    }

    Ok(tx)
}

/// Serializes the transaction into a broadcastable byte array.
pub fn get_broadcast_tx(tx: &BitcoinTransaction) -> Vec<u8> {
    tx.serialize()
}


#[cfg(test)]
mod tests {
    use near_sdk::env::log_str;

    use super::*;

    #[test]
    fn test_prepare_and_sign_tx() {
        let test_utxos = vec![UTXO {
            txid: "2ece6cd71fee90ff613cee8f30a52c3ecc58685acf9b817b9c467b7ff199871c".to_string(),
            vout: 0,
            value: 300_000_000,
            script_pubkey: "0014cb8a3018cf279311b148cb8d13728bd8cbe95bda".to_string(),
        }];

        let receiver_script_pubkey = "0014cb8a3018cf279311b148cb8d13728bd8cbe95bda";
        let spend_amount = 250_000_000;

        let tx = prepare_btc_tx(&test_utxos, receiver_script_pubkey, spend_amount).unwrap();
        assert_eq!(tx.output.len(), 2);

        let script_code_hex = &test_utxos[0].script_pubkey;
        let sighash = compute_segwit_sighash(&tx, 0, script_code_hex, test_utxos[0].value).unwrap();

        log_str(format!("sighash: {:?}", sighash).as_str());

        // Sign the sighash
        // let signature = sign_payload(&secp, &secret_key, &sighash)?;

        // Add signature and pubkey to the transaction as witness data
        // let signed_tx = sign_transaction(tx, vec![signature], vec![pubkey_bytes])?;
        // let serialized = get_broadcast_tx(&signed_tx);
        // assert!(!serialized.is_empty());

        assert!(false);
    }
}
