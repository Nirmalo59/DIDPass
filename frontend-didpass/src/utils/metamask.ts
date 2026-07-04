import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const HARDHAT_CHAIN_ID = '0x7a69'; // 31337 in hex

/**
 * Switches MetaMask to the Hardhat local network.
 * If the network is not yet added, it adds it automatically.
 */
export async function switchToHardhatNetwork(): Promise<void> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed. Please install it to use DIDPass.');
  }

  try {
    // Try switching to the chain first
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: HARDHAT_CHAIN_ID }],
    });
  } catch (switchError: any) {
    // Error code 4902 = chain not added to MetaMask yet
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: HARDHAT_CHAIN_ID,
            chainName: 'Hardhat Local',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['http://127.0.0.1:8545'],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * Request account access from MetaMask
 */
export async function connectWallet(): Promise<string> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed. Please install it to use DIDPass.');
  }
  // Ensure we're on the correct network before connecting
  await switchToHardhatNetwork();
  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found');
  }
  return accounts[0];
}

/**
 * Cryptographically signs EIP-712 typed challenge data using MetaMask and ethers v6.
 */
export async function signEIP712(
  walletAddress: string,
  domain: any,
  types: any,
  value: any
): Promise<string> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  // Always ensure correct network before signing
  await switchToHardhatNetwork();

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  // Verify signing address matches connected wallet
  const signerAddress = await signer.getAddress();
  if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error('Signer address does not match request address');
  }

  // Remove EIP712Domain header from types for ethers.js compliance
  const { EIP712Domain, ...signingTypes } = types;

  // Sign EIP-712 typed data
  return await signer.signTypedData(domain, signingTypes, value);
}

/**
 * Truncates an Ethereum address to 0x1234...abcd format
 */
export function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
