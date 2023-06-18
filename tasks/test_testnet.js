/*-----------------------------------------------------------
 @Filename:         test_testnet.js
 @Copyright Author: Nfthing.co
 @Date:             20/02/2022
 @Description : Run tasks/subtasks for test net (ropsten, rinkeby etc)
-------------------------------------------------------------*/
const fs = require("fs");
const cfg= require("../cfg.json");
const delayms = (2*40000)

const tasksDir = __dirname; // current directory
const deployed_addr_file =  tasksDir + "/contract-address.json"; //file name

  function get_deployed_address(){

    if (!fs.existsSync(deployed_addr_file)) {
          console.error("You need to deploy your contract first");
          return;
        }
        const addressJson = fs.readFileSync(deployed_addr_file);
        const address = JSON.parse(addressJson).Token;
        return address;
}

  function delay(delayInms) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, delayInms);
    });
  }


  subtask("accounts", "Prints the list of accounts")
  .setAction(async (taskArgs) => {
      console.log("\nTestcase1: Getting Account addresses");
      const accounts = await hre.ethers.getSigners();
      for (const account of accounts) {
        console.log(account.address);
    }
  });

  subtask("metamask-balance", "Prints an metamask account's balance")
  .setAction(async (taskArgs) => {
      console.log("\nTestcase2: Balance for metamask accounts");
      const [deployer, addr1, addr2] = await ethers.getSigners();

      console.log("deployer balance:");
      let balance = await deployer.getBalance();
      let balanceInEth = ethers.utils.formatEther(balance)
      console.log(`${deployer.address} : ${balanceInEth} ETH`);

      console.log("addr1 balance:");
      // addr1
      balance = await addr1.getBalance();
      balanceInEth = ethers.utils.formatEther(balance)
      console.log(`${addr1.address} :${balanceInEth} ETH`);

      // addr2
      console.log("addr2 balance:");
      balance = await addr2.getBalance();
      balanceInEth = ethers.utils.formatEther(balance)
      console.log(`${addr2.address} : ${balanceInEth} ETH`);
  });

  subtask("deploy", "Deploy NfThing")
  .setAction(async (taskArgs) => {
      console.log("\nTestcase3: Deploying the contract");
      const Nfthing = await hre.ethers.getContractFactory("NFThing");
      // We deploy with 0 address for payment splitter during tests
      const nft = await Nfthing.deploy(cfg.name, cfg.symbol, cfg.baseuri,'0x0000000000000000000000000000000000000000');
      await nft.deployed();
      console.log("deployed at:", nft.address);
      fs.writeFileSync(
        deployed_addr_file,
        JSON.stringify({ Token: nft.address }, undefined, 2)
    );

  });

  subtask("tokenBalance", "Prints balance of NFT tokens for the 3 addresses")
  .setAction(async (taskArgs) => {
      console.log("\nTestcase4: Find token balances for first 3 addresses");
      const NFT = await ethers.getContractFactory('NFThing');
      const deployed_addr = get_deployed_address();
      const nft = await NFT.attach(deployed_addr);
      const [deployer, addr1, addr2] = await ethers.getSigners();

      console.log("token balances:");
      let balance = await nft.balanceOf(deployer.address);
      console.log(`${deployer.address} : ${balance.toString()} tokens`);
      balance = await nft.balanceOf(addr1.address);
      console.log(`${addr1.address} : ${balance.toString()} tokens`);
      balance = await nft.balanceOf(addr2.address);
      console.log(`${addr2.address} : ${balance.toString()} tokens`);
    });

  subtask("mint", "mint 2 tokens for deployer")
  .setAction(async (taskArgs) => {
      console.log("\nTestcase4: Minting 2 tokens for deployer");
      const NFT = await ethers.getContractFactory('NFThing');
      const deployed_addr = get_deployed_address();
      const nft = await NFT.attach(deployed_addr);
      const [deployer, addr1, addr2] = await ethers.getSigners();
      let Tx = await nft.mint(2);
      console.log("mint success");
      console.log("checking token balance")
      let delayres = await delay(delayms);
      let balance = await nft.balanceOf(deployer.address);
      console.log(`${deployer.address} : ${balance.toString()} tokens`);
  });

  subtask("mintForAddress", "mint 2 tokens for address(addr1, addr2)")
  .setAction(async (taskArgs) => {
      console.log("\nTestcase5: Minting 2 tokens for addr1, addr2");
      const NFT = await ethers.getContractFactory('NFThing');
      const deployed_addr = get_deployed_address();
      const nft = await NFT.attach(deployed_addr);
      const [deployer, addr1, addr2] = await ethers.getSigners();
      let Tx = await nft.mintForAddress(2, addr1.address);
      // this delay added because two immediate transactions on busy networks dont work
      let delayres = await delay(5000);
      Tx = await nft.mintForAddress(2, addr2.address);
      console.log("mint success");
      console.log("checking token balance")
      delayres = await delay(delayms);
      let balance = await nft.balanceOf(addr1.address);
      console.log(`${addr1.address} : ${balance.toString()} tokens`);
      // this delay added because two immediate transactions on busy networks dont work
      delayres = await delay(5000);
      balance = await nft.balanceOf(addr2.address);
      console.log(`${addr2.address} : ${balance.toString()} tokens`);
  });

  subtask("walletOfOwner", "Prints token IDs for the address")
  .setAction(async (taskArgs) => {
      console.log("\nTestcase6: token IDs for first 3 addresses");
      const NFT = await ethers.getContractFactory('NFThing');
      const deployed_addr = get_deployed_address();
      const nft = await NFT.attach(deployed_addr);
      const [deployer, addr1, addr2] = await ethers.getSigners();
      let tokenIds = await nft.walletOfOwner(deployer.address);
      console.log(`\ntoken Ids(${deployer.address}) : ${tokenIds}`);
      tokenIds = await nft.walletOfOwner(addr1.address);
      console.log(`\ntoken Ids(${addr1.address}) : ${tokenIds}`);
      tokenIds = await nft.walletOfOwner(addr2.address);
      console.log(`\ntoken Ids(${addr2.address}) : ${tokenIds}`);
  });


  subtask("tokenuri", "Prints token uri for 10 tokens")
  .setAction(async (taskArgs) => {
      console.log("\nTestcase7: Get token uri for 10 ids");
      const NFT = await ethers.getContractFactory('NFThing');
      const deployed_addr = get_deployed_address();
      const nft = await NFT.attach(deployed_addr);
      const [deployer, addr1, addr2] = await ethers.getSigners();
      console.log("token uri's for first 10 tokens");
      for(id=1;  id<=10; id++){
        let uri = await nft.tokenURI(id);
        console.log(uri);
      }
  });

  subtask("paused", "Pause/Unpause minting")
  .setAction(async (taskArgs) => {
      console.log("\nTestcase8: Pause/Unpause minting for deployer");
      const NFT = await ethers.getContractFactory('NFThing');
      const deployed_addr = get_deployed_address();
      const nft = await NFT.attach(deployed_addr);
      const [deployer, addr1, addr2] = await ethers.getSigners();
      await nft.setPaused(true);
      await  nft.mint(2);
      let delayres = await delay(20000);
      let balance = await nft.balanceOf(deployer.address);
      console.log(`balance with pause : ${balance.toString()} tokens`);
      console.log("mint pause success");
      await nft.setPaused(false);
      await  nft.mint(2);
      delayres = await delay(20000);
      balance = await nft.balanceOf(deployer.address);
      console.log(`balance after unpause : ${balance.toString()} tokens`);
      console.log("mint unpause success");

  });

  task("runTestnetTests", "Runs the testnet tests", async (taskArgs, hre) => {
      console.log("Running testnet tests:")
      await hre.run("accounts");
      await hre.run("metamask-balance");
      await hre.run("deploy");
      await hre.run("tokenBalance");
      await hre.run("mint");
      await hre.run("mintForAddress");
      await hre.run("walletOfOwner");
      await hre.run("tokenuri");
      //await hre.run("paused");
  });



module.exports = {}