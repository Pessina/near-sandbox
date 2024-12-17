use near_sdk::{
    ext_contract, 
    AccountId, 
    PromiseOrValue,
    serde::{Deserialize, Serialize},
    borsh::{BorshSerialize, BorshDeserialize}
};
use schemars::JsonSchema;

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, BorshSerialize, BorshDeserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SignRequest {
    pub payload: [u8; 32],
    pub path: String,
    pub key_version: u32,
}

impl SignRequest {
    pub fn new(payload: [u8; 32], path: String, key_version: u32) -> Self {
        Self {
            payload,
            path,
            key_version,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, BorshSerialize, BorshDeserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SerializableAffinePoint {
    pub affine_point: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, BorshSerialize, BorshDeserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SerializableScalar {
    pub scalar: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, BorshSerialize, BorshDeserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SignResult {
    pub big_r: SerializableAffinePoint,
    pub s: SerializableScalar,
    pub recovery_id: u8,
}

#[ext_contract(ext_signer)]
pub trait SignerInterface {
    fn sign(&mut self, request: SignRequest) -> PromiseOrValue<SignResult>;
    fn public_key(&self) -> near_sdk::PublicKey;
    fn derived_public_key(
        &self,
        path: String,
        predecessor: Option<AccountId>,
    ) -> near_sdk::PublicKey;
    fn latest_key_version(&self) -> u32;
}
