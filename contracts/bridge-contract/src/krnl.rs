use crate::*;

use ethabi::{decode, ParamType, Token};
use k256::ecdsa::{Signature as K256Signature, RecoveryId, VerifyingKey};
use sha3::{Digest, Keccak256};
use hex;
use std::convert::TryInto;

fn decode_hex(hex_str: &str) -> Vec<u8> {
    hex::decode(hex_str.trim_start_matches("0x")).unwrap()
}

fn keccak256(data: &[u8]) -> [u8; 32] {
    let hash = Keccak256::digest(data);
    let mut out = [0u8; 32];
    out.copy_from_slice(&hash);
    out
}

fn recover_eth_address(message_hash: &[u8; 32], signature: &[u8]) -> Option<[u8; 20]> {
    if signature.len() != 65 {
        println!("Invalid signature length: {}", signature.len());
        return None;
    }

    let (r_s_bytes, v_byte) = signature.split_at(64);
    let v = v_byte[0];
    let rec_id = if v >= 27 { v - 27 } else { v };

    let signature = K256Signature::try_from(r_s_bytes).ok()?;
    let recovery_id = RecoveryId::try_from(rec_id).ok()?;

    let verifying_key = VerifyingKey::recover_from_prehash(message_hash, &signature, recovery_id).ok()?;
    let public_key = verifying_key.to_encoded_point(false);

    // Ethereum address derivation
    let mut hasher = Keccak256::new();
    hasher.update(&public_key.as_bytes()[1..]);
    let hash = hasher.finalize();

    let mut addr = [0u8; 20];
    addr.copy_from_slice(&hash[12..32]);
    Some(addr)
}

fn ecrecover_address(
    auth: String,
    sender: String,
    kernel_response: String,
    utxo_pub_key: String,
) -> Result<(), String> {
    let sender: [u8; 20] = decode_hex(&sender).try_into().expect("address should be 20 bytes");
    println!("test decoding auth");

    // Decode auth: (bytes (signatureToken), bytes32 (nonce))
    let param_types = vec![
        ParamType::Bytes,
        ParamType::FixedBytes(32),
    ];

    let auth = decode_hex(&auth);
    let tokens = decode(&param_types, &auth).map_err(|e| format!("Error unpacking auth: {:?}", e)).unwrap();
    
    let signature_bytes = match &tokens[0] {
        Token::Bytes(b) => b.clone(),
        _ => panic!("signature token is not bytes")
    };
    let nonce = match &tokens[1] {
        Token::FixedBytes(n) => n.clone(),
        _ => panic!("nonce is not bytes32") 
    };

    let mut nonce_bytes = [0u8; 32];
    nonce_bytes.copy_from_slice(&nonce);

    // kernelResponsesDigest
    let kernel_responses_digest = keccak256(&decode_hex(&kernel_response));

    let utxo_pub_key = decode_hex(&utxo_pub_key);

    // dataDigest = keccak256(sender | nonce | kernelResponsesDigest | utxoPubKey)
    let mut data = vec![];
    data.extend_from_slice(&sender);
    data.extend_from_slice(&nonce_bytes);
    data.extend_from_slice(&kernel_responses_digest);
    data.extend_from_slice(&utxo_pub_key);
    let data_digest = keccak256(&data);

    // Recover address
    let recovered_addr = recover_eth_address(&data_digest, &signature_bytes).ok_or("Recover failed")?;

    println!("recoveredAddr: 0x{}", hex::encode_upper(&recovered_addr));
    println!("sender: 0x{}", hex::encode_upper(sender));
    if recovered_addr == sender {
        println!("signature verification successful");
        Ok(())
    } else {
        println!("signature verification failed");
        Err("signature verification failed".to_string())
    }
}

fn decode_kernel_response(kernel_response: String) -> Result<(), String> {
    // This mirrors the Go code structure
    // The top-level structure is a tuple with fields: price(string), transaction(bool), liquidity(tuple), premium(string)
    // For brevity, we won't map every single field to a struct here, but will show decoding via ethabi.
    // The Go code defines a complex tuple. We must replicate it:
    // kernelResp tuple:
    //  price: string
    //  transaction: bool
    //  liquidity: tuple {
    //    balance: string
    //    sufficient: bool
    //    required_amount: string
    //    utxos: tuple[] {
    //      TxID: string
    //      vout: uint256
    //      status: tuple {
    //        confirmed: bool
    //        block_hash: string
    //        block_height: uint256
    //        block_time: uint256
    //      }
    //      value: uint256
    //    }
    //    transactions: tuple[] { ... large structure ... }
    //    fees: tuple { fastestFee: uint256, halfHourFee: uint256, hourFee: uint256, economyFee: uint256, minimumFee: uint256 }
    //  }
    //  premium: string

    // Due to the complexity, let's build these types step by step.

    let status_type = ParamType::Tuple(vec![
        ParamType::Bool,             // confirmed
        ParamType::String,           // block_hash
        ParamType::Uint(256),        // block_height
        ParamType::Uint(256),        // block_time
    ]);

    let utxo_type = ParamType::Tuple(vec![
        ParamType::String,           // TxID
        ParamType::Uint(256),        // vout
        status_type.clone(),         // status
        ParamType::Uint(256),        // value
    ]);

    let fees_type = ParamType::Tuple(vec![
        ParamType::Uint(256), // fastestFee
        ParamType::Uint(256), // halfHourFee
        ParamType::Uint(256), // hourFee
        ParamType::Uint(256), // economyFee
        ParamType::Uint(256), // minimumFee
    ]);

    // transactions -> very complex structure:
    let prevout_type = ParamType::Tuple(vec![
        ParamType::String,
        ParamType::String,
        ParamType::String,
        ParamType::String,
        ParamType::Uint(256),
    ]);

    let vin_type = ParamType::Tuple(vec![
        ParamType::String,   // TxID
        ParamType::Uint(256),// vout
        prevout_type.clone(),
        ParamType::String,   // ScriptSig
        ParamType::String,   // ScriptSigAsm
        ParamType::Array(Box::new(ParamType::String)), // Witness
        ParamType::Bool,     // IsCoinbase
        ParamType::Uint(256),// Sequence
    ]);

    let vout_type = ParamType::Tuple(vec![
        ParamType::String,
        ParamType::String,
        ParamType::String,
        ParamType::String,
        ParamType::Uint(256),
    ]);

    let transaction_status_type = status_type.clone();

    let transaction_type = ParamType::Tuple(vec![
        ParamType::String,                   // TxID
        ParamType::Uint(256),                // version
        ParamType::Uint(256),                // locktime
        ParamType::Array(Box::new(vin_type)),// vin[]
        ParamType::Array(Box::new(vout_type)),// vout[]
        ParamType::Uint(256),                // size
        ParamType::Uint(256),                // weight
        ParamType::Uint(256),                // SigOps
        ParamType::Uint(256),                // fee
        transaction_status_type              // status
    ]);

    let liquidity_type = ParamType::Tuple(vec![
        ParamType::String,                    // balance
        ParamType::Bool,                      // sufficient
        ParamType::String,                    // required_amount
        ParamType::Array(Box::new(utxo_type)),// utxos
        ParamType::Array(Box::new(transaction_type)), // transactions
        fees_type
    ]);

    let kernel_resp_type = ParamType::Tuple(vec![
        ParamType::String,    // price
        ParamType::Bool,      // transaction
        liquidity_type,        // liquidity
        ParamType::String,    // premium
    ]);

    let params = vec![kernel_resp_type];
    let tokens = decode(&params, &decode_hex(&kernel_response)).map_err(|e| format!("Decode error: {:?}", e))?;

    // Print the decoded result as JSON for demonstration:
    // We won't fully map all tokens to a struct, just show them as debug output:
    let val = serde_json::to_string_pretty(&tokens).unwrap();
    println!("Decoded kernel response:\n{}", val);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_with_provided_data() {
        let auth = "0x0000000000000000000000000000000000000000000000000000000000000040baf7afd06ef6b9cbe9ae8ff06724e33014631b9ce01be6bfb2f4c77084317fb40000000000000000000000000000000000000000000000000000000000000041b3ff5014be6df058155423b518e854860b1289b98f996d3ca3ce5d8db895b54463d8c00ba3a4668151eec28d9eae2081a3326856f8d5dbb06889186ed413fd1b0100000000000000000000000000000000000000000000000000000000000000";
        let sender = "0x889E6a9d863373A7A735AB71Cd481e63ef8d64A4"; 
        let kernel_response = "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000001320000000000000000000000000000000000000000000000000000000000000000a302e30303030303337370000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000003c000000000000000000000000000000000000000000000000000000000000013a1000000000000000000000000000000000000000000000000000000000000139e000000000000000000000000000000000000000000000000000000000000137400000000000000000000000000000000000000000000000000000000000013740000000000000000000000000000000000000000000000000000000000000a6a000000000000000000000000000000000000000000000000000000000000000a302e303035313733343700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a302e303030303034303000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000007a12000000000000000000000000000000000000000000000000000000000000000403065666434363237643363393735613564353833636232326663333664643538653533383163386136633930636238366364356539643566306138316630643000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000e35f000000000000000000000000000000000000000000000000000000006760365e0000000000000000000000000000000000000000000000000000000000000040303030303030303036663838366661636131363362356433316633663361373734396136363662366433336638393739363130633063613739633236626439610000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000720000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002b9000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000af0000000000000000000000000000000000000000000000000000000000000d80000000000000000000000000000000000000000000000000000000000000004030656664343632376433633937356135643538336362323266633336646435386535333831633861366339306362383663643565396435663061383166306430000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000360000000000000000000000000000000000000000000000000000000000000038000000000000000000000000000000000000000000000000000000000000003a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000fffffffd00000000000000000000000000000000000000000000000000000000000000403136663266666166623833646437343535336231366461333037396365623931306132626264363565363236356462363562666538363439633362326230373100000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000001980421f3000000000000000000000000000000000000000000000000000000000000002c30303134363237333761376337613431373133653266383139326330663631303861346337656563623361340000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003d4f505f30204f505f5055534842595445535f32302036323733376137633761343137313365326638313932633066363130386134633765656362336134000000000000000000000000000000000000000000000000000000000000000000000976305f703277706b680000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a7462317176666568356c72366739636e757475706a7471307679793266336c77657661796b34777936670000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000008e333034343032323031393462333233376336346637326539376538353036313835376163663639386538656433633237643132393764353961366332326136643432393333393234303232303439666264656163313839323732626137616537353132313464333764316566646337633061616464646666616461633434653738363064636463376465373230310000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000042303265353838343137303930363132353034656562656237616230633665623335633639343634613832386431376462366636353839393039643838653735383838000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000260000000000000000000000000000000000000000000000000000000000000046000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000197fc8024000000000000000000000000000000000000000000000000000000000000002c30303134636263646663663866343563396363346262333833393163383638313763363439356232666135330000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003d4f505f30204f505f5055534842595445535f32302063626364666366386634356339636334626233383339316338363831376336343935623266613533000000000000000000000000000000000000000000000000000000000000000000000976305f703277706b680000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a746231716530786c65373835746a7776667765633879776764717475766a326d39376a6e6e616e74766c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000007a120000000000000000000000000000000000000000000000000000000000000002c30303134626435373362643638636166336531316164653365313330626430363331636361336262613866320000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003d4f505f30204f505f5055534842595445535f32302062643537336264363863616633653131616465336531333062643036333163636133626261386632000000000000000000000000000000000000000000000000000000000000000000000976305f703277706b680000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a746231716834746e6834357634756c70727430727579637436703333656a336d6832386a73643635366b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000323661313736363631373536333635373432653734363537333734366536353734333432653634363537363230373437383665000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000484f505f52455455524e204f505f5055534842595445535f3233203636363137353633363537343265373436353733373436653635373433343265363436353736323037343738366500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000096f705f72657475726e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000e35f000000000000000000000000000000000000000000000000000000006760365e000000000000000000000000000000000000000000000000000000000000004030303030303030303666383836666163613136336235643331663366336137373439613636366236643333663839373936313063306361373963323662643961000000000000000000000000000000000000000000000000000000000000000a302e303030303030393900000000000000000000000000000000000000000000";
        let utxo_pub_key ="0x0267ec0b1f94cea5a22511f0925e27fd7de087dfe13d4abe243ded4c94b1573ff0";


        // Check signature
        ecrecover_address(
            auth.to_string(),
            sender.to_string(),
            kernel_response.to_string(),
            utxo_pub_key.to_string(),
        ).unwrap();

        // Decode kernel response
        decode_kernel_response(kernel_response.to_string()).unwrap();
    }
}