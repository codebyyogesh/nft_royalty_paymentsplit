# NFT for minting, royalty payment to artist and payment splitter

# Basic Setup. First you must compile the contract

## 1. Assumes you have installed npm, npx and hardhat depending on the operating system you use.
## 2. Download this repo and unzip or git clone < github link >
## 3. open command line or console
```
 $ cd nfthing
 $ npm install 
 $ npx hardhat compile
```


# To deploy and verify
## Update scripts/deploy.js and hardhat.config.js files. Edit the name, symbol and ipfs address. Follow the example, see comment for Nfthing.deploy
## Edit the cfg.json and fill the necessary details
*     a. Alchemy endpoints of ropsten, rinkeby and mainnet
*     b. Metamask private keys of the accounts (ensure to have atleast three metamask accounts with sufficient funds)
*     c. Etherscan API keys of ropsten, mainnet and rinkeby. It will be the same for all.

## Edit scripts/arguments.js and fill with the same name, symbol and ipfs address used in scripts/deploy.js. This is needed for verification.

## on local blockchain using mainnet fork (simulates mainnet locally)
```
$ npx hardhat run scripts/deploy.js --network hardhat

```

## on testnet (rinkeby).Ensure to have sufficient funds in accounts. If the network is busy, you may have to try a few times
```
$ npx hardhat run scripts/deploy.js --network rinkeby     # Note down the deployed address
$ npx hardhat verify --constructor-args scripts/arguments.js < DEPLOYED ADDR > --network rinkeby

```

## on testnet (ropsten). Ensure to have sufficient funds in accounts. If the network is busy, you may have to try a few times
```
$ npx hardhat run scripts/deploy.js --network ropsten     # Note down the deployed address
$ npx hardhat verify --constructor-args scripts/arguments.js < DEPLOYED ADDR > --network ropsten

```
# Testing
## Update the config file (cfg.json) with test params (name, symbol, baseuri, maxMintAmountPerTx, max_supply, cost and presaleCost).
## For payment splitter tests update with the payee addresses (test cases use 3 payee adresses)

## Running tests for local network
```
$ npx hardhat test

```

## Running tests for testnet (rinkeby, ropsten etc) networks
### Ensure you have at least three metamask accounts with sufficient balance
### Note: Even with the delays added in the test cases, if the network is busy, it may sometimes throw transaction exceptions, you must re-run the tests

```
$ npx hardhat run runTestnetTests --network < network-name >        # network-name can be ropsten, rinkeby, etc.

```
