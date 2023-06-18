/*-----------------------------------------------------------
 @Filename:         test_paymentSplitter.js
 @Copyright Author: Nfthing.co
 @Date:             02/03/2022
 @Description:     Test the payment splitter smart contract 
                   along with NFT on Ethereum mainnet fork.
-------------------------------------------------------------*/
// We import Chai to use its asserting functions here.
const { expect } = require("chai");  //ES6 Destructuring assignment
const { ethers } = require("hardhat");
const configParams = require("../cfg.json");

// `describe` is a Mocha function that allows you to organize your tests. It's
// not actually needed, but having your tests organized makes debugging them
// easier. All Mocha functions are available in the global scope.

// `describe` receives the name of a section of your test suite, and a callback.
// The callback must define the tests of that section. This callback can't be
// an async function.
describe("NFT Payment Splitter tests:", function () {

  // Mocha has four functions that let you hook into the the test runner's
  // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

  // They're very useful to setup the environment for tests, and to clean it
  // up after they run.

  // A common pattern is to declare some variables, and assign them in the
  // `before` and `beforeEach` callbacks.

  let nft;
  let token;
  let token2;
  let owner;  // deployer or contract owner
  let account1; // two account addresses of hardhat
  let account2;
  let account;
  let baseuri;
  let maxMintAmountPerTx;
  let name;
  let symbol;
  let cloneproxy;
  let clone;
  let paySplitAddr1;
  let paySplitAddr2;
  let paySplitAddr3;
  let sharePercent1;
  let sharePercent2;
  let sharePercent3;
  let addrlist;
    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.

  beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      nft = await ethers.getContractFactory("NFThing");
      clone = await ethers.getContractFactory("PaymentSplitterCloneFactory");
      name               = configParams.name;
      symbol             = configParams.symbol;
      baseuri            = configParams.baseuri;
      provider           = ethers.provider;
      baseuri            = configParams.baseuri;
      // same as used in contract
      maxMintAmountPerTx = 20;
      // Configure addresses that will be paid after splitting of payment.
      // The test cases use three addresses, however you can use as many
      // addresses,but remember to add the share percentages for each address.
      paySplitAddr1      = "0xbda5747bfd65f08deb54cb465eb87d40e51b197e";
      paySplitAddr2      = "0xdd2fd4581271e230360230f9337d5c0430bf44c0";
      paySplitAddr3      = "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199";
      [owner ,account1, account2, ...account] = await ethers.getSigners();
      // First step is to deploy the payment splitter clone factory contract
      // This in turn will deploy the actual payment splitter contract with 
      // some default payees and shares and will be used as the base
      // for creating more splitters in future (using the clone feature erc- 1167)
      cloneproxy = await clone.deploy();
      await cloneproxy.deployed();

  });


    describe("Deploy NFT, Mint and test withdraw, release",function () {

      it("Deploy NFT and test 1 payment splitter", async function () {

      // Create a new splitter with shares and payees.
      // The creator is this case is owner.address(i.e, msg.sender)
      // (as this is the default address in hardhat local).
      // It can be changed using cloneproxy.connect(<some addr>)

        sharePercent1 = 30;
        sharePercent2 = 20;
        sharePercent3 = 50;
        addrlist =  [paySplitAddr1,paySplitAddr2,paySplitAddr3];
        sharelist = [sharePercent1,sharePercent2,sharePercent3];

        await cloneproxy.newSplitter(addrlist, 
                                     sharelist);
        // get all the splitter contract addresses for the given creator
        // this must be passed to NFThing contract
        let paymentsplitterAddr = await cloneproxy.registeredSplittersOf(owner.address);
        // To deploy our contract, we just have to call nft.deploy() and await
        // for it to be deployed(), which happens once its transaction has been
        // mined.
        token = await nft.deploy(name, symbol, baseuri,paymentsplitterAddr[0]);
        // The contract is NOT deployed yet; we must wait until it is mined
        await token.deployed();

        // change cost and presale cost and then mint(set to 1 ether to make calculations
        // easier)
        await token.setCost(1); // 1 ether
        await token.setPresaleCost(1); // 1 ether
        // value will be 1*20 = 20

        // mint more tokens from another account so that you have to pay mint fees
        await token.connect(account1)['mint(uint256)'](maxMintAmountPerTx, 
                                    {value: ethers.utils.parseEther("20.0")});

        // balances before withdrawal
        let balances = await cloneproxy.balances(paymentsplitterAddr[0]);
        console.log("\npayee Balances in splitter before withdrawal:")
        for (i=0; i<3; i++){
            const balanceInEth = ethers.utils.formatEther(balances[i]);
            console.log(`${addrlist[i]} : ${balanceInEth} ETH`);
        }

        // After minting, there will be some amount collected and now you can withdraw.
        // withdraw() will transfer the funds to the cloned paymentsplitter contract
        await token.withdraw();

       // balances after withdrawal
        balances = await cloneproxy.balances(paymentsplitterAddr[0]);
        console.log("\npayee Balances in splitter after withdrawal:")
        for (i=0; i<3; i++){
            const balanceInEth = ethers.utils.formatEther(balances[i]);
            console.log(`${addrlist[i]} : ${balanceInEth} ETH`);
        }

        // Finally release the funds to the accounts and check their wallet
        // balances
        // get count of payment splitters associated with the creator
        let splitterCount = await cloneproxy.registeredCountOf(owner.address);

        // splitter indexes start with 0 upto (splitterCount-1)
        // now release the funds for an account with given splitter indexes
        // currently we have created only one splitter (index = 0)
        await cloneproxy.releaseforIds(paySplitAddr1, [0]);
        await cloneproxy.releaseforIds(paySplitAddr2, [0]);
        await cloneproxy.releaseforIds(paySplitAddr3, [0]);


        // get wallet balances
        console.log("\nfinal payee Balances in wallet after release:")
        let balance = await provider.getBalance(paySplitAddr1);
        let balanceInEth = ethers.utils.formatEther(balance);
        expect(balanceInEth).to.equal('10006.0');
        console.log(`${addrlist[0]}: ${balanceInEth}`);
        balance = await provider.getBalance(paySplitAddr2);
        balanceInEth = ethers.utils.formatEther(balance);
        expect(balanceInEth).to.equal('10004.0');
        console.log(`${addrlist[1]}: ${balanceInEth}`);
        balance = await provider.getBalance(paySplitAddr3);
        balanceInEth = ethers.utils.formatEther(balance);
        expect(balanceInEth).to.equal('10010.0');
        console.log(`${addrlist[2]}: ${balanceInEth}`);
      });
    /***************************************************************************** */
      it("Deploy NFT and test multi splitter using releaseforIds()", async function () {

      // Create a new splitter with shares and payees.
      // The creator is this case is owner.address(i.e, msg.sender)
      // (as this is the default address in hardhat local).
      // It can be changed using cloneproxy.connect(<some addr>)

        sharePercent1 = 20;
        sharePercent2 = 40;
        sharePercent3 = 40;
        addrlist =  [paySplitAddr1,paySplitAddr2,paySplitAddr3];
        sharelist = [sharePercent1,sharePercent2,sharePercent3];

        await cloneproxy.newSplitter(addrlist, sharelist);

        sharePercent1 = 10;
        sharePercent2 = 60;
        sharePercent3 = 30;
        addrlist =  [paySplitAddr1,paySplitAddr2,paySplitAddr3];
        sharelist = [sharePercent1,sharePercent2,sharePercent3];

        await cloneproxy.newSplitter(addrlist, sharelist);

        // get all the splitter contract addresses for the given creator
        // this must be passed to NFThing contract
        let paymentsplitterAddr = await cloneproxy.registeredSplittersOf(owner.address);

        // To deploy our contract, we just have to call nft.deploy() and await
        // for it to be deployed(), which happens once its transaction has been
        // mined.
        token = await nft.deploy(name, symbol, baseuri,paymentsplitterAddr[0]);
        // The contract is NOT deployed yet; we must wait until it is mined
        await token.deployed();

        token2 = await nft.deploy(name, symbol, baseuri,paymentsplitterAddr[1]);
        // The contract is NOT deployed yet; we must wait until it is mined
        await token2.deployed();


        // change cost and presale cost and then mint(set to 1 ether to make calculations
        // easier)
        await token.setCost(1); // 1 ether
        await token.setPresaleCost(1); // 1 ether
        // value will be 1*15 = 15
        // mint 15 more tokens from another account so that you have to pay mint fees
        await token.connect(account1)['mint(uint256)'](15, 
                                    {value: ethers.utils.parseEther("15.0")});


        await token2.setCost(1); // 1 ether
        await token2.setPresaleCost(1); // 1 ether
       // value will be 1*20 = 20
       // mint 20 more tokens from another account so that you have to pay mint fees
        await token2.connect(account2)['mint(uint256)'](maxMintAmountPerTx, 
                                    {value: ethers.utils.parseEther("20.0")});


        // balances before withdrawal splitter 1
        let balances = await cloneproxy.balances(paymentsplitterAddr[0]);
        console.log("\npayee Balances in splitter-1 before withdrawal:")
        for (i=0; i<3; i++){
            const balanceInEth = ethers.utils.formatEther(balances[i]);
            console.log(`${addrlist[i]} : ${balanceInEth} ETH`);
        }

        // After minting, there will be some amount collected and now you can withdraw.
        // withdraw() will transfer the funds to the cloned splitter1 contract
        await token.withdraw();

       // balances after withdrawal splitter 1
        balances = await cloneproxy.balances(paymentsplitterAddr[0]);
        console.log("\npayee Balances in splitter-1 after withdrawal:")
        for (i=0; i<3; i++){
            const balanceInEth = ethers.utils.formatEther(balances[i]);
            console.log(`${addrlist[i]} : ${balanceInEth} ETH`);
        }

        // balances before withdrawal splitter 2
        balances = await cloneproxy.balances(paymentsplitterAddr[1]);
        console.log("\npayee Balances in splitter-2 before withdrawal:")
        for (i=0; i<3; i++){
            const balanceInEth = ethers.utils.formatEther(balances[i]);
            console.log(`${addrlist[i]} : ${balanceInEth} ETH`);
        }

        // After minting, there will be some amount collected and now you can withdraw.
        // withdraw() will transfer the funds to the cloned splitter2 contract
        await token2.withdraw();

       // balances after withdrawal splitter 2
        balances = await cloneproxy.balances(paymentsplitterAddr[1]);
        console.log("\npayee Balances in splitter-2 after withdrawal:")
        for (i=0; i<3; i++){
            const balanceInEth = ethers.utils.formatEther(balances[i]);
            console.log(`${addrlist[i]} : ${balanceInEth} ETH`);
        }

        // Finally release the funds to the accounts from the 2 splitters
        // and check their wallet balances.
        // first get count of payment splitters associated with the given creator
        // In this case it will be 2 (thus indexes will be 0, 1)
        let splitterCount = await cloneproxy.registeredCountOf(owner.address);

        // splitter indexes start with 0 upto (splitterCount-1)
        // now release the funds for all the accounts with given splitter indexes
        // Here we have 2 splitters (0,1)
        for (i=0; i<splitterCount; i++){
          await cloneproxy.releaseforIds(paySplitAddr1, [i]);
          await cloneproxy.releaseforIds(paySplitAddr2, [i]);
          await cloneproxy.releaseforIds(paySplitAddr3, [i]);
        }

        // get wallet balances
        console.log("\nfinal payee Balances in wallet after release:")
        let balance = await provider.getBalance(paySplitAddr1);
        let balanceInEth = ethers.utils.formatEther(balance);
        expect(balanceInEth).to.equal('10011.0');
        console.log(`${addrlist[0]}: ${balanceInEth}`);

        balance = await provider.getBalance(paySplitAddr2);
        balanceInEth = ethers.utils.formatEther(balance);
        expect(balanceInEth).to.equal('10022.0');
        console.log(`${addrlist[1]}: ${balanceInEth}`);

        balance = await provider.getBalance(paySplitAddr3);
        balanceInEth = ethers.utils.formatEther(balance);
        expect(balanceInEth).to.equal('10022.0');
        console.log(`${addrlist[2]}: ${balanceInEth}`);
      });
    /***************************************************************************** */
      it("Get shares from payment splitter", async function () {

      // Create a new splitter with shares and payees.
      // The creator is this case is owner.address(i.e, msg.sender)
      // (as this is the default address in hardhat local).
      // It can be changed using cloneproxy.connect(<some addr>)

        sharePercent1 = 20;
        sharePercent2 = 30;
        sharePercent3 = 50;
        addrlist =  [paySplitAddr1,paySplitAddr2,paySplitAddr3];
        sharelist = [sharePercent1,sharePercent2,sharePercent3];

        await cloneproxy.newSplitter(addrlist, sharelist);
        // get all the splitter contract addresses for the given creator
        // this must be passed to NFThing contract
        let paymentsplitterAddr = await cloneproxy.registeredSplittersOf(owner.address);
        // get shares
        let shares = await cloneproxy.shares(paymentsplitterAddr[0]);
        expect(shares[0]).to.equal(20);
        expect(shares[1]).to.equal(30);
        expect(shares[2]).to.equal(50);
        for (i=0; i<3; i++){
            console.log(`${addrlist[i]} : ${shares[i]} %`);
        }
      });
    /***************************************************************************** */
      it("Deploy NFT and test multi splitter using ReleaseAll()", async function () {
        // Create 2 splitters
        sharePercent1 = 20;
        sharePercent2 = 40;
        sharePercent3 = 40;
        addrlist =  [paySplitAddr1,paySplitAddr2,paySplitAddr3];
        sharelist = [sharePercent1,sharePercent2,sharePercent3];

        await cloneproxy.newSplitter(addrlist, sharelist);

        sharePercent1 = 10;
        sharePercent2 = 70;
        sharePercent3 = 20;
        addrlist =  [paySplitAddr1,paySplitAddr2,paySplitAddr3];
        sharelist = [sharePercent1,sharePercent2,sharePercent3];

        await cloneproxy.newSplitter(addrlist, sharelist);

        // get all the splitter contract addresses for the given creator
        // this must be passed to NFThing contract
        let paymentsplitterAddr = await cloneproxy.registeredSplittersOf(owner.address);

        // To deploy our contract, we just have to call nft.deploy() and await
        // for it to be deployed(), which happens once its transaction has been
        // mined.
        token = await nft.deploy(name, symbol, baseuri,paymentsplitterAddr[0]);
        // The contract is NOT deployed yet; we must wait until it is mined
        await token.deployed();

        token2 = await nft.deploy(name, symbol, baseuri,paymentsplitterAddr[1]);
        // The contract is NOT deployed yet; we must wait until it is mined
        await token2.deployed();

        // change cost and presale cost and then mint(set to 1 ether to make calculations
        // easier)
        await token.setCost(1); // 1 ether
        await token.setPresaleCost(1); // 1 ether
        // value will be 1*15 = 15
        // mint 15 more tokens from another account so that you have to pay mint fees
        await token.connect(account1)['mint(uint256)'](15, 
                                    {value: ethers.utils.parseEther("15.0")});


        await token2.setCost(1); // 1 ether
        await token2.setPresaleCost(1); // 1 ether
       // value will be 1*20 = 20
       // mint 20 more tokens from another account so that you have to pay mint fees
        await token2.connect(account2)['mint(uint256)'](maxMintAmountPerTx, 
                                    {value: ethers.utils.parseEther("20.0")});


        // balances before withdrawal splitter 1
        let balances = await cloneproxy.balances(paymentsplitterAddr[0]);
        console.log("\npayee Balances in splitter-1 before withdrawal:")
        for (i=0; i<3; i++){
            const balanceInEth = ethers.utils.formatEther(balances[i]);
            console.log(`${addrlist[i]} : ${balanceInEth} ETH`);
        }

        // After minting, there will be some amount collected and now you can withdraw.
        // withdraw() will transfer the funds to the cloned splitter1 contract
        await token.withdraw();

       // balances after withdrawal splitter 1
        balances = await cloneproxy.balances(paymentsplitterAddr[0]);
        console.log("\npayee Balances in splitter-1 after withdrawal:")
        for (i=0; i<3; i++){
            const balanceInEth = ethers.utils.formatEther(balances[i]);
            console.log(`${addrlist[i]} : ${balanceInEth} ETH`);
        }

        // balances before withdrawal splitter 2
        balances = await cloneproxy.balances(paymentsplitterAddr[1]);
        console.log("\npayee Balances in splitter-2 before withdrawal:")
        for (i=0; i<3; i++){
            const balanceInEth = ethers.utils.formatEther(balances[i]);
            console.log(`${addrlist[i]} : ${balanceInEth} ETH`);
        }

        // After minting, there will be some amount collected and now you can withdraw.
        // withdraw() will transfer the funds to the cloned splitter2 contract
        await token2.withdraw();

       // balances after withdrawal splitter 2
        balances = await cloneproxy.balances(paymentsplitterAddr[1]);
        console.log("\npayee Balances in splitter-2 after withdrawal:")
        for (i=0; i<3; i++){
            const balanceInEth = ethers.utils.formatEther(balances[i]);
            console.log(`${addrlist[i]} : ${balanceInEth} ETH`);
        }
        // Finally call releaseAll() to release funds associated with payee Addr 
        for (i=0; i<3; i++){
          await cloneproxy.releaseAll(addrlist[i]);
        }
        // get wallet balances
        console.log("\nfinal payee Balances in wallet after release:")
        let balance = await provider.getBalance(paySplitAddr1);
        let balanceInEth = ethers.utils.formatEther(balance);
        expect(balanceInEth).to.equal('10016.0');
        console.log(`${addrlist[0]}: ${balanceInEth}`);

        balance = await provider.getBalance(paySplitAddr2);
        balanceInEth = ethers.utils.formatEther(balance);
        expect(balanceInEth).to.equal('10042.0');
        console.log(`${addrlist[1]}: ${balanceInEth}`);

        balance = await provider.getBalance(paySplitAddr3);
        balanceInEth = ethers.utils.formatEther(balance);
        expect(balanceInEth).to.equal('10032.0');
        console.log(`${addrlist[2]}: ${balanceInEth}`);
      });
    });
});
