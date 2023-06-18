/*-----------------------------------------------------------
 @Filename:         test_local_mainnet.js
 @Copyright Author: Nfthing.co
 @Date:             20/02/2022
 @Description:     Test the NfThing smart contract along with ERC721
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
describe("NFT testsuite 1 start:", function () {

  // Mocha has four functions that let you hook into the the test runner's
  // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

  // They're very useful to setup the environment for tests, and to clean it
  // up after they run.

  // A common pattern is to declare some variables, and assign them in the
  // `before` and `beforeEach` callbacks.

  let nft;
  let token;
  let owner;
  let addr1;
  let addr2;
  let addrs;
  let baseuri;
  let maxMintAmountPerTx;
  let max_supply;
  let name;
  let symbol;
    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.

  beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      nft = await ethers.getContractFactory("NFThing");
      name               = configParams.name;
      symbol             = configParams.symbol;
      baseuri            = configParams.baseuri;
      // assign the same values as used in the contract initialization
      maxMintAmountPerTx = 20;
      max_supply         = 100;
      presaleCost        = 0.001;
      cost               = 0.002;
      provider           = ethers.provider;

      [owner ,addr1, addr2, ...addrs] = await ethers.getSigners();
    
      // To deploy our contract, we just have to call nft.deploy() and await
      // for it to be deployed(), which happens once its transaction has been
      // mined.
      // During NFT tests, we dont need payment splitter address (using default 0x0)
      token = await nft.deploy(name, symbol, baseuri, '0x0000000000000000000000000000000000000000');
      // The contract is NOT deployed yet; we must wait until it is mined
      await token.deployed()
  });


  // You can nest describe calls to create subsections.
  describe("After deployment", function () {    
  // `it` is another Mocha function. This is the one you use to define your
    // tests. It receives the test name, and a callback function.

    // If the callback function is async, Mocha will `await` it.
    it("Should set the right owner", async function () {
      // Expect receives a value, and wraps it in an Assertion object. These
      // objects have a lot of utility methods to assert values.

      // This test expects the owner variable stored in the contract to be equal
      // to our Signer's owner.
      expect(await token.owner()).to.equal(owner.address);
    });
   
    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      console.log("     owner balance:",ownerBalance.toNumber())
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });
  }); // end of After Deployment



  // Test safeTransferFrom() of ERC721
  // Transfer token id 1 to addr1, then transfer token id 1 to addr2.
  // At the end, balances of owner=19, addr1=0 and  addr2=1

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      // Transfer token id 0 from owner to addr1 
      await token['safeTransferFrom(address,address,uint256)'](owner.address, addr1.address, 1);
      let addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(1);

      // Transfer token id from addr1 to addr2
      // We use .connect(signer) to send a transaction from another account
      await token.connect(addr1)['safeTransferFrom(address,address,uint256)'](addr1.address, addr2.address,1);
      const addr2Balance = await token.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(1);

      // balance owner = 19 and balance addr1 = 0
      const ownerBalance = await token.balanceOf(owner.address);
      expect(ownerBalance).to.equal(maxMintAmountPerTx -1);
 
      addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(0);
    });
  }); // end of Transactions


  // Tests to check if it reverts transaction when
  // maxMintAmountPerTx is > max_mint_per_addr
  describe("fail if mint amount > maxMintAmountPerTx",function () {
    it("Mint > maxMintAmountPerTx", async function () {
      await expect(
                    token.mint(maxMintAmountPerTx+5)
                  ).to.be.revertedWith("Invalid mint amount!")
    });
  }); // end of mint amount > maxMintAmountPerTx


  // get the token URI of token Ids and match them with ipfs images
  // generated. Until now we have minted only upto 20 tokens
  describe("token URI", function () {
    it("get token URI", async function () {
      for(id=1;  id<=maxMintAmountPerTx; id++){
        let uri = await token.tokenURI(id);
        json = id.toString() + '.json'
        expect(uri).to.equal(baseuri + json);
      }
    });
  }); // end of token URI

  // mint for addr1 and addr2 as owner already mints during deploy.
  // Need to send ether with msg.value during mint() as addr1/addr2 are not in whitelist
  describe("mint for addr1 and addr2",function () {
    it("mint addr1 and addr2 ", async function () {
      await token.connect(addr1)['mint(uint256)'](maxMintAmountPerTx, {value: ethers.utils.parseEther("1.0")});
      await token.connect(addr2)['mint(uint256)'](maxMintAmountPerTx, {value: ethers.utils.parseEther("1.0")});
      addr1Balance = await token.connect(addr1)['balanceOf(address)'](addr1.address);
      addr2Balance = await token.connect(addr2)['balanceOf(address)'](addr2.address);
      ownerBalance = await token.balanceOf(owner.address);

      expect(ownerBalance).to.equal(maxMintAmountPerTx);
      expect(addr1Balance).to.equal(maxMintAmountPerTx);
      expect(addr2Balance).to.equal(maxMintAmountPerTx);
    });
  }); // end of mint addr1 and addr2 

}); // end of the NFT test starts






// To get balance associated with the Account address for local blockchain:
/*
      provider      = ethers.provider;
      balanceBefore = await provider.getBalance(owner.address)
      const balanceBeforeInEth = ethers.utils.formatEther(balanceBefore)
      console.log(`balance: ${balanceBeforeInEth} ETH`);
*/
