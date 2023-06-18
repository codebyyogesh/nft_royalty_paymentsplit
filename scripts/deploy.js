// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

// Note: We must always deploy the payment splitter and then NFThing
// For payment splitter to be deployed, first there must be payment splitter proxy
// already deployed only once.


const configParams = require("../cfg.json");
var fs = require('fs');


saveFrontendFiles =(contract) =>{
  const configDir = __dirname + "/../frontend/src/config";
  var obj = { configInfo: [] };
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
  }
  obj.configInfo.push(configParams);
  let networkName = hre.network.name;
  console.log("Creating cfg file in frontend...")
  obj.configInfo.push({'contract' :contract.address});
  var json = JSON.stringify(obj); //convert it back to json
  fs.writeFileSync(configDir + '/cfg.json', json, 'utf8', () => {});
  console.log("Success!")
}


check_paymentcfg_params = (addrlist, sharePercent) => {
  // Check if payment addresses and share percentages are
  // properly configured
  if (!addrlist.length || !sharePercent.length) {
    console.log("payment split addr or shares cannot be empty!");
    return false;
  }
  if (addrlist.length !== sharePercent.length) {
    console.log("payment split addr or shares not equal!");
    return false;
  }
  let result = false;
  result = addrlist.some(element => {
    if (element === '') {
      console.log("payment split addr cant be Empty in cfg!");
      return true;
    }
  });
  if (result) {
    return false;
  }
  result = sharePercent.some(element => {
    if (element === '') {
      console.log("share percent cant be Empty in cfg!");
      return true;
    }
  });
  if (result) {
    return false;
  }
  return true
}

create_cloneproxy_factory = async () => {

  // First check if file exists
  // If not create one
  // If yes read the content 
  console.log("create_cloneproxy_factory")
  const path = './contract-address.json'

  try {
        if (fs.existsSync(path)) 
        {
          console.log("reading clone-proxy from file...");
          let data = fs.readFileSync(path, 'utf8');
          obj = JSON.parse(data); //now it is an object
          // First read network info. If it the same as current network then we can read
          // clone proxy, otherwise it means we still to create clone proxy for this network
          // hre.network.name
          let keys = Object.keys(obj.deployedAt);
           // read all the keys and compare with hre.network.name
          for (i=0; i<keys.length; i++){
            console.log("network:", Object.keys(obj.deployedAt[i])[0]); // first 0 is array index and second is actual key
            let network = Object.keys(obj.deployedAt[i])[0];
            if(network.localeCompare(hre.network.name) === 0){
              console.log("already clone proxy deployed. Reading the same:");
              let cloneproxy_addr = obj.deployedAt[i][network]; //read value for the key
              return cloneproxy_addr;
            }
          }
          // If it comes here means the clone proxy is not deployed on this network 
          // Deploy the same and write to the file
          console.log("create clone proxy for:", hre.network.name);
          // create and push
          const clone = await ethers.getContractFactory("PaymentSplitterCloneFactory");
          const cloneproxy = await clone.deploy();
          await cloneproxy.deployed();
          let networkName = hre.network.name;
          obj.deployedAt.push({[networkName] : cloneproxy.address});
          var json = JSON.stringify(obj); //convert it back to json
          fs.writeFile('contract-address.json', json, 'utf8', () => {});
          return cloneproxy.address;
        }// end of if file exists
       else 
      {
          console.log("create contract-address.json file...");
          const clone = await ethers.getContractFactory("PaymentSplitterCloneFactory");
          const cloneproxy = await clone.deploy();
          await cloneproxy.deployed();
          var obj = { deployedAt: [] };
          let networkName = hre.network.name;
          obj.deployedAt.push({[networkName] : cloneproxy.address});
          var json = JSON.stringify(obj);
          fs.writeFile('contract-address.json', json, 'utf8', () => {});
          return cloneproxy.address;
       }
  }catch (err) {
    console.error(err)
  } // end of try
} // end of function

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const networkName = hre.network.name;
  const chainId = hre.network.config.chainId;
  let cloneproxyAddr;
  console.log("networkName:", networkName);
  console.log("chainID:", chainId);
  console.log("Deploying Payment splitter...");
  addrlist = configParams.payAddr;
  sharePercent = configParams.sharePercent;
  console.log("Addrlist:", addrlist);
  console.log("sharelist:", sharePercent);
  // Check if payment addresses and share percentages are
  // properly configured
  const result = check_paymentcfg_params(addrlist, sharePercent);
  if (!result) {
    return;
  }
  const [deployer] = await ethers.getSigners(); //get the account to deploy the contract

  // First step is to deploy the payment splitter clone factory contract.
  // clone factory needs to be deployed only once.
  // This internally will deploy the actual payment splitter contract with 
  // some default payees and shares and will be used as the base
  // for creating more splitters in future (using the clone feature erc- 1167)
  // Deployer will be the account(PRIVATE_KEY1) configured in the hardhat.config network accounts
  // of rinkeby, ropsten etc.
  console.log("Deploying contracts with the account:", deployer.address);

  // For local networks such as hardhat there is not point in saving
  // payment splitter clone factory to a file, because local networks
  // are temporary
  if (networkName.localeCompare("hardhat") === 0 || networkName.localeCompare("localhost")=== 0)
  {
    const clone = await ethers.getContractFactory("PaymentSplitterCloneFactory");
    const cloneproxy = await clone.deploy();
    await cloneproxy.deployed();
    cloneproxyAddr = cloneproxy.address;
  }// for other networks such as ropsten, rinkeby, mainnet, we have to 
  // create once and write the details to a file
  else{
    cloneproxyAddr = await create_cloneproxy_factory();
  }
  
  const clone = await ethers.getContractFactory("PaymentSplitterCloneFactory");
  console.log("cloneproxy-addr:", cloneproxyAddr);
  const cloneproxy = await clone.attach(cloneproxyAddr);
  // Create a new splitter with shares and payees.
  const tx = await cloneproxy.newSplitter(addrlist, sharePercent);
  const rc = await tx.wait(); // 0ms, as tx is already confirmed
  const event = rc.events.find(event => event.event === 'PaymentSplitterCreated');
  const splitterAddr = event.args['newSplitter'];
  // get all the splitter contract addresses for the given creator
  // this must be passed to NFThing contract deployment
  let paymentSplitAddr = await cloneproxy.registeredSplittersOf(deployer.address);

  // For every NFThing contract we have one payment splitter, which
  // needs to be passed as param to the contract deployment

  const Nfthing = await hre.ethers.getContractFactory("NFThing");

  const name = configParams.name;
  const symbol = configParams.symbol;
  const baseuri = configParams.baseuri;
  const payment = paymentSplitAddr[0]; // payment split address
  const nft = await Nfthing.deploy(name, symbol, baseuri, payment);

  await nft.deployed();

  console.log("NFThing deployed at:", nft.address);

  saveFrontendFiles(nft);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
