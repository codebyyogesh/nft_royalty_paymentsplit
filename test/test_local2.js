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
const configParams = require("../cfg.json");

// `describe` is a Mocha function that allows you to organize your tests. It's
// not actually needed, but having your tests organized makes debugging them
// easier. All Mocha functions are available in the global scope.

// `describe` receives the name of a section of your test suite, and a callback.
// The callback must define the tests of that section. This callback can't be
// an async function.
describe("NFT testsuite 2 start:", function () {

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
      token = await nft.deploy(name, symbol, baseuri,'0x0000000000000000000000000000000000000000');
      // The contract is NOT deployed yet; we must wait until it is mined
      await token.deployed()
  });

  // Pause tests
  describe("Pause usecases",function () {
      it("For Paused = true/false mint should fail/succeed", async function () {
        await token.setPaused(true);
        await expect(
                      token.mint(maxMintAmountPerTx)
                    ).to.be.revertedWith("The contract is paused!");
        await token.setPaused(false);
        await token.mint(maxMintAmountPerTx);
        ownerBalance = await token.balanceOf(owner.address);
        expect(ownerBalance).to.equal(2*maxMintAmountPerTx);
      });

      it("addr1 cannot change Paused", async function () {
          await expect(
                        token.connect(addr1)['setPaused(bool)'](true)
                      ).to.be.reverted;
      });

      it("addr2 cannot change Paused", async function () {
          await expect(
                      token.connect(addr2)['setPaused(bool)'](true)
                      ).to.be.reverted;
      });
  }); //End of Pause usecases


  // maxMintAmountPerTx cases
  describe("maxMintAmountPerTx usecases",function () {
      it("decrease maxMintAmountPerTx to 10", async function () {
        maxMintAmountPerTx = 10;
        await token.setMaxMintAmountPerTx(maxMintAmountPerTx);
        await expect(
                      token.mint(maxMintAmountPerTx + 1)
                    ).to.be.revertedWith("Invalid mint amount!");

        await token.mint(maxMintAmountPerTx);
        ownerBalance = await token.balanceOf(owner.address);
        expect(ownerBalance).to.equal(30);
      });

      it("increase maxMintAmountPerTx to 30", async function () {
        maxMintAmountPerTx = 30;
        await token.setMaxMintAmountPerTx(maxMintAmountPerTx);
        await expect(
                      token.mint(maxMintAmountPerTx + 5)
                    ).to.be.revertedWith("Invalid mint amount!");

        await token.mint(maxMintAmountPerTx - 5)
        ownerBalance = await token.balanceOf(owner.address);
        expect(ownerBalance).to.equal(45);
      });    

      it("addr1 cannot change maxMintAmountPerTx", async function () {
          await expect(
                        token.connect(addr1)['setMaxMintAmountPerTx(uint256)'](10)
                      ).to.be.reverted;
      });

      it("addr2 cannot change maxMintAmountPerTx", async function () {
          await expect(
                        token.connect(addr2)['setMaxMintAmountPerTx(uint256)'](10)
                      ).to.be.reverted;
      });
  }); //End of maxMintAmountPerTx usecases

  // whitelist use cases
  describe("Whitelist usecases",function () {
    it("add/remove addr2 to whitelist", async function () {
      // After add, addr2 can mint() without any cost in msg.value(free)
      await token.whitelistUser(addr2.address);
      await token.connect(addr2)['mint(uint256)'](maxMintAmountPerTx);
      addr2Balance = await token.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(maxMintAmountPerTx);

      // After remove, addr2 cannot mint() and reverts, until we send amount in msg.value
      // above we minted 20, below another 20
      await token.removeWhitelistUser(addr2.address);
      await expect(
                    token.connect(addr2)['mint(uint256)'](maxMintAmountPerTx)
                  ).to.be.revertedWith("Insufficient funds!");

      await token.connect(addr2)['mint(uint256)'](maxMintAmountPerTx, {value: ethers.utils.parseEther("1.0")});
      addr2Balance = await token.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(2*maxMintAmountPerTx);
    });

    it("add both addr1/addr2 to whitelist", async function () {
        await token.whitelistUser(addr1.address);
        await token.whitelistUser(addr2.address);

      // After add, addr1/addr2 can mint() without any cost in msg.value(free)
      await token.whitelistUser(addr1.address);
      await token.connect(addr1)['mint(uint256)'](maxMintAmountPerTx);
      addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(maxMintAmountPerTx);

      await token.whitelistUser(addr2.address);
      await token.connect(addr2)['mint(uint256)'](maxMintAmountPerTx);
      addr2Balance = await token.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(maxMintAmountPerTx);
    });

    it("addr1/addr2 cannot add themselves to whitelist", async function () {
      // transaction must be reverted in such cases.
      // Only owner can add them to whitelist like above test
       await expect (
                     token.connect(addr1)['whitelistUser(address)'](addr1.address)
                    ).to.be.reverted;
       await expect(
                     token.connect(addr2)['whitelistUser(address)'](addr2.address)
                    ).to.be.reverted;
    });

  }); // end of whitelist cases  

  // PresaleList use cases
  describe("addr1/addr2 to presaleList",function () {
    it("add addr1 to presaleList", async function () {
      // with presaleList you can use presaleCost = 0.001 ether for minting each token
      // sufficient funds = presaleCost*maxMintAmountPerTx
      await token.addPresaleUser(addr1.address);
      let valueformint = (presaleCost*maxMintAmountPerTx).toString(); // value must be in string
      await token.connect(addr1)['mint(uint256)'](maxMintAmountPerTx, {value: ethers.utils.parseEther(valueformint)});
    });

    it("addr1 to presaleList, revert if value < sufficient funds", async function () {
      // with presaleList,  if value passed < sufficient funds, mint should revert transaction
      await token.addPresaleUser(addr1.address);
      let valueformint = (presaleCost).toString(); // value must be in string
      await expect (
                    token.connect(addr1)['mint(uint256)'](maxMintAmountPerTx, {value: ethers.utils.parseEther(valueformint)})
                   ).to.be.revertedWith("Insufficient funds!");
    });

    it("add/remove addr2 to/from presaleList", async function () {
      // After adding mint balance should be = maxMintAmount, 
      // then removing it must use normal cost for minting
      await token.addPresaleUser(addr2.address);
      let valueformint = (presaleCost*maxMintAmountPerTx).toString(); // value must be in string
      await token.connect(addr2)['mint(uint256)'](maxMintAmountPerTx, {value: ethers.utils.parseEther(valueformint)});

      // removing it and passing value with presaleCost must revert the transaction.
      // However it should be successful with normal cost 
      await token.removePresaleUser(addr2.address);
      await expect (
                    token.connect(addr2)['mint(uint256)'](maxMintAmountPerTx, 
                                    {value: ethers.utils.parseEther(valueformint)})
                  ).to.be.revertedWith("Insufficient funds!");

      // check for normal cost, balance must = 2*maxMintAmountPerTx
      valueformint = (cost * maxMintAmountPerTx).toString();
      await token.connect(addr2)['mint(uint256)'](maxMintAmountPerTx, 
                                    {value: ethers.utils.parseEther(valueformint)});

      addr2Balance = await token.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(2*maxMintAmountPerTx);
    });
  }); // end of PresaleList use cases

  // Test walletOfOwner, must give token IDs associated with the address
  describe("check walletOfOwner",function () {
    it("walletOfOwner() for owner", async function () {
        const tokenList = await token.walletOfOwner(owner.address);
        const OwnerList = [...Array(20)].map((_, index) => index + 1);
        const { assert } = require('chai');

        if (assert.deepEqual(tokenList.length,OwnerList.length))
        {
            for (let i = 0; i < OwnerList.length; ++i) {
              assert(tokenList[i] == OwnerList[i], "Owner Token ID's dont match");
            }
        }
    });

    it("walletOfOwner() for addr1", async function () {
       // mint tokens for addr1
        await token.connect(addr1)['mint(uint256)'](maxMintAmountPerTx, {value: ethers.utils.parseEther("1.0")});
        const tokenList = await token.connect(addr1)['walletOfOwner(address)'](addr1.address);

        // indexes start from 21 as first 20 are minted by owner in constructor
        const addr1List = [...Array(20)].map((_, index) => index + 21);
        const { assert } = require('chai');

        if (assert.deepEqual(tokenList.length,addr1List.length))
        {
            for (let i = 0; i < addr1List.length; ++i) {
              assert(tokenList[i] == addr1List[i], "Addr1 Token ID's dont match"); // compare token IDs
            }
        }
    });

  }); // end of walletOfOwner

  // Test to check if we mint > max supply
  // Run this at the end as we cannot mint after we reach max value
  describe("fail if mint > max-supply(100)",function () {
    it(" mint > max-supply(100)", async function () {

      // upto now we have minted total 20 in constructor
      // mint upto maxMintAmountPerTx
      for (i= 0;  i< (max_supply-maxMintAmountPerTx)/maxMintAmountPerTx; i++)
      {
        let mint = await token.mint(maxMintAmountPerTx);
      }
      await expect(
                    token.mint(1)
                  ).to.be.revertedWith("Max supply exceeded!")
    });

  }); // end of fail Mint > Max Supply

}); // end of the NFT testsuite 2






// To get balance associated with the Account address for local blockchain:
/*
      provider      = ethers.provider;
      balanceBefore = await provider.getBalance(owner.address)
      const balanceBeforeInEth = ethers.utils.formatEther(balanceBefore)
      console.log(`balance: ${balanceBeforeInEth} ETH`);
*/
