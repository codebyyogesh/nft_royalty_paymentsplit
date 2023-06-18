/*-----------------------------------------------------------
 @Filename:         test_royalties.js
 @Copyright Author: Nfthing.co
 @Date:             06/03/2022
 @Description:     Test the royalty calculations for NFT ERC721
                   on Ethereum mainnet fork.
-------------------------------------------------------------*/
// We import Chai to use its asserting functions here.
const { expect } = require("chai");  //ES6 Destructuring assignment
const { ethers } = require("hardhat");
const configParams = require("../cfg.json")

// `describe` is a Mocha function that allows you to organize your tests. It's
// not actually needed, but having your tests organized makes debugging them
// easier. All Mocha functions are available in the global scope.

// `describe` receives the name of a section of your test suite, and a callback.
// The callback must define the tests of that section. This callback can't be
// an async function.
describe("NFT Royalty tests:", function () {

  // Mocha has four functions that let you hook into the the test runner's
  // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

  // They're very useful to setup the environment for tests, and to clean it
  // up after they run.

  // A common pattern is to declare some variables, and assign them in the
  // `before` and `beforeEach` callbacks.

  let nft;
  let token;
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
  let sharePercent1;
  let sharePercent2;
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
      // The test cases use two addresses for royalty split payment
      paySplitAddr1      = "0xbda5747bfd65f08deb54cb465eb87d40e51b197e";
      paySplitAddr2      = "0xdd2fd4581271e230360230f9337d5c0430bf44c0";
      [owner ,account1, account2, account3,...account] = await ethers.getSigners();

      // We want to send royalty amount to the payment splitter.
      cloneproxy = await clone.deploy();
      await cloneproxy.deployed();
  });

    describe("Deploy NFT, and test Royalty",function () {

      it("Set and Get royalty amount with tokenId ", async function () {
      // In this test case we transfer royalty to a payment splitter
      // Create a new splitter with shares and payees.
      // The creator is this case is owner.address(i.e, msg.sender)
      // (as this is the default address in hardhat local).
      // It can be changed using cloneproxy.connect(<some addr>)

        sharePercent1 = 70;
        sharePercent2 = 30;
        addrlist =  [paySplitAddr1,paySplitAddr2];
        sharelist = [sharePercent1,sharePercent2];

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

        // Already we have minted from token 1-20 as part of constructor
        let _INTERFACE_ID_ERC2981 = "0x2a55205a";
        let checkERC2981support = await token.supportsInterface(_INTERFACE_ID_ERC2981);
        expect(checkERC2981support).to.equal(true);

        // royalty percent must be in bps (2.5% is 250, 5% is 500, 20% is 2000, 100% is 10000)
        // token ID = 2, recipient address = paymentsplitterAddr[0] and royalty percentage = 2.5%
        token.setTokenRoyalty(2,paymentsplitterAddr[0], 250);
        // First transfer token=2, will be sent from creator(artist) to account1
        await token['safeTransferFrom(address,address,uint256)'](owner.address, account1.address, 2);
        // Now transfer token=2 from account1 to account2. For this, the seller
        // in this case account1, needs to pay royalty
        await token.connect(account1)['safeTransferFrom(address,address,uint256)'](account1.address, account2.address,2);

        // get royalty for a salePrice of 4 Ether = 4*10^18 wei
        // Send 4 ether with BigInt or as string "4000000000000000000"
        // token = 2
        let response = await token.getRoyaltyFees(2, BigInt(4000000000000000000));
        // It is in dict form
        const {0:royaltyRecipient, 1:fees} = response;
        expect(paymentsplitterAddr[0]).to.equal(royaltyRecipient);

        // pay royalty from account1 for token ID = 2
        // To get return value on payable functions, use the 
        // below method
        const royaltyFeesInEth = ethers.utils.formatEther(fees)
        console.log("recipient, fees",royaltyRecipient, royaltyFeesInEth);
        let tx = await token.connect(account1)['payRoyaltyFees(address,uint256,uint256)']
                  (account1.address,2, BigInt(4000000000000000000),{value: ethers.utils.parseEther(royaltyFeesInEth)});

        const rc = await tx.wait(); // 0ms, as tx is already confirmed
        const event = rc.events.find(event => event.event === 'royaltyPaid');
        const payResult = event.args['os'];
        expect(payResult).to.equal(true);

        // Now release the balance from payment splitter to payees
        // [0] because we have only one payment splitter, index=0
        await cloneproxy.releaseforIds(paySplitAddr1, [0]);
        await cloneproxy.releaseforIds(paySplitAddr2, [0]);
        // get wallet balances
        console.log("\nfinal payee wallet Balances after Royalty:")
        let balance = await provider.getBalance(paySplitAddr1);
        let balanceInEth = ethers.utils.formatEther(balance);
        expect(balanceInEth).to.equal('10016.07');
        console.log(`${addrlist[0]}: ${balanceInEth}`);
        balance = await provider.getBalance(paySplitAddr2);
        balanceInEth = ethers.utils.formatEther(balance);
        expect(balanceInEth).to.equal('10042.03');
        console.log(`${addrlist[1]}: ${balanceInEth}`);
      });

      it("Set and Get royalty amount with default royalty ", async function () {

        // In this test we transfer royalty to a single artist
        let artistRecipient = account3.address;   // hardhat local chain account3  signer address
        console.log("artist:",artistRecipient);
        // To deploy our contract, we just have to call nft.deploy() and await
        // for it to be deployed(), which happens once its transaction has been
        // mined.
        token = await nft.deploy(name, symbol, baseuri,'0x0000000000000000000000000000000000000000');
        // The contract is NOT deployed yet; we must wait until it is mined
        await token.deployed();

        // Already we have minted from token 1-20 as part of constructor
        let _INTERFACE_ID_ERC2981 = "0x2a55205a";
        let checkERC2981support = await token.supportsInterface(_INTERFACE_ID_ERC2981);
        expect(checkERC2981support).to.equal(true);

        // royalty percent must be in bps (2.5% is 250, 5% is 500, 20% is 2000... 100% is 10000)
        // token = 3, recipient address = artistRecipient and royalty percentage = 10%
        token.setTokenRoyalty(3,artistRecipient, 1000);
        // First transfer token=3, will be sent from creator(artist) to account1
        await token['safeTransferFrom(address,address,uint256)'](owner.address, account1.address, 3);
        // Now transfer token=3 from account1 to account2. For this, the seller
        // in this case account1, needs to pay royalty
        await token.connect(account1)['safeTransferFrom(address,address,uint256)'](account1.address, account2.address,3);

        // get royalty for a salePrice of 10 Ether = 10*10^18 wei
        // Send 10 ether with BigInt or as string "10000000000000000000"
        // token = 3
        let response = await token.getRoyaltyFees(3, BigInt(10000000000000000000));
        // It is in dict form
        const {0:royaltyRecipient, 1:fees} = response;
        expect(artistRecipient).to.equal(royaltyRecipient);

        // pay royalty from account1 for token = 3
        // To get return value on payable functions, use the 
        // below method
        const royaltyFeesInEth = ethers.utils.formatEther(fees)
        console.log("recipient, fees",royaltyRecipient, royaltyFeesInEth);
        let tx = await token.connect(account1)['payRoyaltyFees(address,uint256,uint256)']
                  (account1.address, 3, BigInt(10000000000000000000),{value: ethers.utils.parseEther(royaltyFeesInEth)});

        const rc = await tx.wait(); // 0ms, as tx is already confirmed
        const event = rc.events.find(event => event.event === 'royaltyPaid');
        const payResult = event.args['os'];
        expect(payResult).to.equal(true);
        // get wallet balances
        console.log("\nfinal Artist wallet Balance after Royalty:")
        let balance = await provider.getBalance(artistRecipient);
        let balanceInEth = ethers.utils.formatEther(balance);
        expect(balanceInEth).to.equal('10001.0');
        console.log(`${addrlist[0]}: ${balanceInEth}`);


      });

    });
}); // end of the royalty tests






