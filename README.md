# Multi-Chain Transaction Signing Demo

This repository contains a demo application that demonstrates the process of signing transactions on multiple blockchain networks using a single NEAR account. The application supports signing transactions on Ethereum (ETH), Binance Smart Chain (BNB), and Bitcoin (BTC) testnets.

## Features

- Sign transactions on ETH, BNB, and BTC testnets using a NEAR account
- Derive addresses for each supported chain based on a derivation path
- Check account balances on each supported chain
- Send transactions on each supported chain

## Prerequisites

- Node.js
- NPM package manager
- A NEAR testnet account - Instructions to create an account: https://docs.near.org/tools/near-cli

## Setup

Clone the repository:

```bash
git clone https://github.com/your-username/multi-chain-signing-demo.git
cd multi-chain-signing-demo
```

Install the dependencies:

```bash
yarn install
```

Set up the environment variables: Create a .env file in the root directory of the project and add the following variables:

```bash
NEXT_PUBLIC_NEAR_ACCOUNT_ID=your-near-testnet-account-id
NEXT_PUBLIC_NEAR_PRIVATE_KEY=your-near-testnet-private-key
```

Replace your-near-testnet-account-id with your NEAR testnet account ID and your-near-testnet-private-key with your NEAR testnet private key.

## Running the Application

To start the development server, run the following command:

```bash
npm run dev
```

Open your browser and navigate to http://localhost:3000/multi-chain to access the application.

## Usage

- Select the desired chain (ETH, BNB, or BTC) from the dropdown menu.
- Enter the derivation path for the selected chain.
- Click the "Check Balance" button to fetch the account balance on the selected chain.
- Enter the recipient's address in the "Address" field.
- Enter the amount to send in the "Value" field.
- Click the "Send Transaction" button to initiate the transaction.

## Code Structure

The main components of the application are located in the following files:

- `pages/index.tsx:` The main page of the application that handles user interactions and state management.
- `utils/chain/EVM.ts:` Contains the EVM class that provides functions for interacting with Ethereum and Binance Smart Chain.
- `utils/chain/Bitcoin.ts:` Contains the Bitcoin class that provides functions for interacting with the Bitcoin testnet.
- `utils/contract/signer.ts:` Contains functions for signing transactions using the smart contract.
- `utils/kdf.ts:` Contains functions for key derivation.
