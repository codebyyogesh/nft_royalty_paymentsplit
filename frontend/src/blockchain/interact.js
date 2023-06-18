// This file will be the interace for the contract. Add all contract functions here
import { ethers, BigNumber } from 'ethers';
import config from '../config/cfg.json';
import contractAbi from '../abi/NFThing.json';

const contractAddr = config.configInfo[1].contract;

// usually gets the default provider which includes
// infura, alchemy etc
function get_provider(){
    return new ethers.providers.Web3Provider(window.ethereum);
}

async function get_signer(){
    let provider = get_provider();
    return (await provider.getSigner());
}

// address of the signer
async function get_signer_addr(){
    let signer = await get_signer();
    return (await signer.getAddress());
}
// create a contract instance
export async function contract_instance(){
    let signer = await get_signer();
    const contract = new ethers.Contract(
            contractAddr,
            contractAbi,
            signer
    )
    return contract;
}

// current mint token count for a given address
export async function contract_balanceOf(contract){
    let signer_addr = await get_signer_addr();
    return (await contract.balanceOf(signer_addr)).toNumber();
}

// max tokens that can be minted
export async function contract_maxSupply(contract){
    return (await contract.maxSupply()).toNumber();
}

// current total count of tokens minted
export async function contract_totalSupply(contract){
    return (await contract.totalSupply()).toNumber(); 
}

// get cost for mint
export async function contract_cost(contract){
    return (await contract.cost()).toString();
}

// does minting
export async function contract_mint(contract, amount){
    let cost = await contract_cost(contract);
    let valueformint = (cost*amount).toString(); // value must be in string
    const response = await contract.mint(amount, {value:valueformint});
    await response.wait();  // wait for Tx success i.e. mining to happen
    return response;
}

// Token IDs for a given signer/owner address
export async function contract_walletOfOwner(contract){
    let signer_addr = await get_signer_addr();
    let tokenIds = await contract.walletOfOwner(signer_addr);
    return tokenIds;
}

// Token URI (NFT's) for a given signer/owner address
export async function contract_tokenURI(contract){
    let tokenIds = await contract_walletOfOwner(contract);
    // length for loop should start from first token number for the given address
    let length = tokenIds[0].toNumber() + tokenIds.length;
    const tokenUris = [];
    for(let i=tokenIds[0].toNumber(); i<length; i++){
        let jsonuri = await contract.tokenURI(i);
        tokenUris.push(jsonuri);
        console.log(jsonuri);
    }
    return tokenUris;
}

// Total NFTs minted/unminted
export async function contract_count_mint_unmint(contract){
    let minted = await contract_totalSupply(contract);
    let maxAvailable = await contract_maxSupply(contract);
    let unminted = maxAvailable - minted;
    console.log("total minted, unminted", minted, unminted);
    return (minted, unminted);

}
