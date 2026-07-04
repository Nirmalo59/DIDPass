require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  networks: {
    // Standard Hardhat chain ID — what MetaMask expects for local dev
    hardhat: {
      chainId: 31337
    },
    localhost: {
      url:     "http://127.0.0.1:8545",
      chainId: 31337
    }
  },
  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts"
  }
};
