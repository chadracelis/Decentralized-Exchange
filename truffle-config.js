require('babel-register');
require('babel-polyfill');
require('dotenv').config();

module.exports = {

  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*" // Match any network id
    },
  },

  contracts_directory: './src/contracts/',
  contracts_build_directory: './src/abis/',

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.7.5",
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
}
