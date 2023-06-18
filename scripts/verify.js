// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const configParams = require("../cfg.json")



task("Verify", "Verifies Contract on Etherscan")
  .addParam("address", "deployed address")
  .addParam("name", "contract name") // NFThing or PaymentSplitter
  .setAction(async (taskArgs) => {

    console.log("Verifying contract...")

    const name   = configParams.name;
    const symbol = configParams.symbol;
    const baseuri= configParams.baseuri;
    let contractName = taskArgs.name;
    let contractAddress = taskArgs.address;

    // We get the contract to verify
    if (contractName.localeCompare("NFThing") === 0) 
    {
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: [
                name,
                symbol,
                baseuri,
            ],
        }); // end of verify:verify
    } // end of if
    else{   // Right now we have only Payment splitter, thus else is fine
        await hre.run("verify:verify", {
            address: contractAddress
        });
    }
});