import { CreateCredential, P256Credential } from "../_types";

// Mock server functions
export const mockServer = {
  challenges: new Map(),
  registrations: new Map(),
  nonces: new Map(),

  async completeRegistration(username: string, credential: CreateCredential) {
    // In a real implementation, you would verify the credential here
    this.registrations.set(username, credential);
    return { success: true };
  },

  async getNonce(username: string) {
    const nonce = Math.floor(Math.random() * 1000000).toString();
    this.nonces.set(username, nonce);
    return nonce;
  },

  async startAuthentication(username: string) {
    const nonce = await this.getNonce(username);
    const challenge = new TextEncoder().encode(`Authenticate:${nonce}`);
    return challenge;
  },

  async completeAuthentication(username: string, assertion: P256Credential) {
    // In a real implementation, you would verify the assertion here
    const nonce = this.nonces.get(username);
    if (!nonce) {
      throw new Error('Invalid nonce');
    }
    // Here you would typically verify the signature against the challenge
    // For this mock, we'll just check if the nonce exists
    return { success: true };
  }
};