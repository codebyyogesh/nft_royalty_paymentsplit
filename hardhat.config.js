require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("./tasks/test_testnet");
require('hardhat-docgen');
require("./scripts/verify");
require('hardhat-abi-exporter');

// Alchemy network endpoints
const ROPSTEN_NODE_ENDPOINT = require("./cfg.json").ropstenNodeEndpoint;
const RINKEBY_NODE_ENDPOINT = require("./cfg.json").rinkebyNodeEndPoint;
const MAINNET_FORK_ENDPOINT = require("./cfg.json").forkmainnetNodeEndpoint;
// Metamask account Private keys
const PRIVATE_KEY1   = require("./cfg.json").PrivateKey1;
const PRIVATE_KEY2   = require("./cfg.json").PrivateKey2;
const PRIVATE_KEY3   = require("./cfg.json").PrivateKey3;
// Etherscan API keys
const RINKEBY_ETHERSCAN_API_KEY = require("./cfg.json").rinkebyEtherscanApi;
const MAINNET_ETHERSCAN_API_KEY = require("./cfg.json").mainnetEtherscanApi;
const ROPSTEN_ETHERSCAN_API_KEY = require("./cfg.json").ropstenEtherscanApi;

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 * Hardhat has a local ethereum network that is run in two flavors.
 * The "hardhat" network is run in-process, while the "localhost" 
 * version is run as a standalone daemon, enabling JSON-RPC and
 * WebSocket connections
 */
module.exports = {
  solidity: "0.8.9",
  abiExporter: {
	  path: "./frontend/src/abi",
	  clear: false,
	  flat: true,
    runOnCompile: true,
	  // only: [],
	  // except: []
  },

  mocha: {
    timeout: 30000
  },

  settings: {
      optimizer: {
        enabled: true,
      }
  },
  
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: true,
  },

  networks: {
   localhost:{
      //chainId:1337,
    },

    hardhat: {
      forking: {
        url: MAINNET_FORK_ENDPOINT,
        blockNumber: 14157455,
      },
      chainId:31337,
    },

    rinkeby: {
        url: RINKEBY_NODE_ENDPOINT,
        accounts: [PRIVATE_KEY1,PRIVATE_KEY2, PRIVATE_KEY3],
    },

    ropsten: {
      url: ROPSTEN_NODE_ENDPOINT,
      accounts: [PRIVATE_KEY1,PRIVATE_KEY2, PRIVATE_KEY3],
    },
  }, // end of networks

   etherscan: {
    apiKey: {
        mainnet: MAINNET_ETHERSCAN_API_KEY,
        rinkeby: RINKEBY_ETHERSCAN_API_KEY,
        ropsten: ROPSTEN_ETHERSCAN_API_KEY,
    }
   }
};
