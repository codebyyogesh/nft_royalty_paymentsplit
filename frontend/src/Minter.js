import { useEffect, useState } from "react";
import {connectWallet, getCurrentWalletConnected} from "./connect";
import * as contractInterface from './blockchain/interact';

const MAX_PER_WALLET = 5;

const Minter = (props) => {

  //State variables
  const [walletAddress, setWallet] = useState("");
  const [status, setStatus] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setURL] = useState("");
  const [buttonText, setButtonText] = useState("Mint NFT"); 
 
function jsontest(){
  //console.log(config.configInfo[0].rinkebyEtherscanApi);
  //console.log(config.configInfo[1].contract);
}

// helper function to display all nfts, when connected to wallet
async function  display_nfts_json(){
      if(window.ethereum){
        let instance = await contractInterface.contract_instance();
        // display all the NFTs for the wallet (in metadata json)
        console.log("Tokens minted for this wallet:")
        let uris =await contractInterface.contract_tokenURI(instance);
      }
}

  // react runs the effects after every render-including the first render.
  useEffect(() => {
    async function getWalletConnected(){
      const { address, status } = await getCurrentWalletConnected();
      setWallet(address);
      setStatus(status);
      console.log("Connection Status:", status);
      if (status === "Success!"){
        await display_nfts_json()
      }
    };
    addWalletListener(); // this is to react for account change in metamask
    getWalletConnected();
  }, []);

// need to react to account change in metamask, in case user changes 
// account in metamask and accounts will be the new account that user
// changed to.
function addWalletListener() {

    if (window.ethereum) {
      // here we basically look for "accountsChanged" event.
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setWallet(accounts[0]);
          setStatus("Success!");
        } else {
          setWallet("");
          setStatus("🦊 Connect to Metamask using the top right button.");
        }
      });
    } else {
      setStatus(
        <p>
          {" "}
          🦊{" "}
          <a target="_blank" href={`https://metamask.io/download.html`}>
            You must install Metamask, a virtual Ethereum wallet, in your
            browser.
          </a>
        </p>
      );
    }

  }
  const connectWalletPressed = async () => {
    const walletResponse = await connectWallet();
    setStatus(walletResponse.status);
    setWallet(walletResponse.address);
    console.log("Connection Status:", walletResponse.status);
    if (walletResponse.status === "Success!"){
        await display_nfts_json()
      }
  };

  const onMintPressed = async (amount) => {
    if (walletAddress.length <= 0){ // if connection is not done, then please connect first
        connectWalletPressed();
    }
    if(window.ethereum){
      let instance = await contractInterface.contract_instance();
      try{
          let ownertokenbalance = await contractInterface.contract_balanceOf(instance);
          let maxSupply = await contractInterface.contract_maxSupply(instance);
          let totalSupply = await contractInterface.contract_totalSupply(instance);// current count of tokens
          console.log("Owner Token Balance", ownertokenbalance);
          console.log("total supply tokens", totalSupply);
          console.log("Max supply tokens", maxSupply);
          if (ownertokenbalance <= MAX_PER_WALLET-1 && totalSupply <= maxSupply){ // MAX_PER_WALLET -1 because count starts from 0
              const response = await contractInterface.contract_mint(instance, amount);
              console.log("response:", response);
          }
          else{ // Comes here only when minting is not possible due to max limit exceeded
                if(totalSupply > maxSupply) // exceeded max supply
                {
                  setButtonText("Max Supply Exceeded");
                }
                else{
                  setButtonText("Max Per Wallet Exceeded");
                }
          }
          // display all the NFTs for the wallet (in metadata json)
          let uris =await contractInterface.contract_tokenURI(instance);
          let {m, u} = await contractInterface.contract_count_mint_unmint(instance);
      }catch(err){
        console.log("error:", err);
      }
    } // end of try
  };

  return (
    <div className="Minter">
      <button className="button" id="walletButton" onClick={connectWalletPressed}>
        {walletAddress.length > 0 ? (
          "Connected: " +
          String(walletAddress).substring(0, 6) +
          "..." +
          String(walletAddress).substring(38)
        ) : (
          <span>Connect Wallet</span>
        )}
      </button>

      <button className="button" id="mintButton" onClick={()=>{onMintPressed(1)}}>
          {buttonText}
      </button>
    </div>
  );
};

export default Minter;
