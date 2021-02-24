const PrivateKeyProvider = require('./private-provider');
// Standalone Development Node Private Key
const privateKeyDev =
   '99B3C12287537E38C90A9219D4CB074A89A16E9CDB20BF85728EBD97C343E342';
// Moonbase Alpha Private Key --> Please change this to your own Private Key with funds
const privateKeyMoonbase =
   '';

module.exports = {
   networks: {
      // Local network on Ganache
      ganache: {
        host: "127.0.0.1",
        port: 8545,
        network_id: "*" // Match any network id
      },
      // Standalone Network for Moonbeam
      moonlocal: {
         provider: () => {
            if (!privateKeyDev.trim()) {
               throw new Error('Please enter a private key with funds, you can use the default one');
            }
            return new PrivateKeyProvider(privateKeyDev, 'http://localhost:9933/', 1281)
         },
         network_id: 1281,
      },
      // Moonbase Alpha TestNet
      moontest: {
         provider: () => {
            if (!privateKeyMoonbase.trim()) {
               throw new Error('Please enter a private key with funds to send transactions to TestNet');
            }
            if (privateKeyDev == privateKeyMoonbase) {
               throw new Error('Please change the private key used for Moonbase to your own with funds');
            }
            return new PrivateKeyProvider(privateKeyMoonbase, 'https://rpc.testnet.moonbeam.network', 1287)
         },
         network_id: 1287,
      },
   },
   // Solidity 0.7.0 Compiler
   compilers: {
      solc: {
        version: "^0.7.0"
      }
   },
   // Moonbeam Truffle Plugin
   plugins: ['moonbeam-truffle-plugin']
};
