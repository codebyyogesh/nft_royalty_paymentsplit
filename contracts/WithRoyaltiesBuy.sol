// SPDX-License-Identifier: GPL-3.0-or-later
pragma  solidity ^0.8.7;

import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract NFThing is ERC721, Ownable, ERC2981 {
    event TokenOwner(uint256 tokenId, address _current_owner); // event emitted after buy
    struct TokenInfo
    {
        address payable current_owner;
        uint256 salePrice;
        bool    readytosell;
    }
    mapping(uint256 => TokenInfo) private tokenInfo; // map id to price and current owner
    // =============================================================================
    //              Contract variables start here
    // =============================================================================
    using Strings for uint256; // uint256 variable can call up functions in the Strings library.e.g. value.toString()
    using Counters for Counters.Counter;

    Counters.Counter private _supply;

    string public uriPrefix = "";
    string public uriSuffix = ".json";

    uint256 public cost = 0.002 ether; // cost of minting
    uint256 public presaleCost = 0.001 ether; // presale offer cost
    uint256 public maxSupply = 100; // 10K NFT
    uint256 public maxMintAmountPerTx = 20; // max allowed to mint per transaction
    bool public paused = false; // pauses the minting functionality if needed
    mapping(address => bool) public whitelisted; // if you are whitelisted, you dont have to pay gas for minting
    mapping(address => bool) public presaleWallets; // for presale use presale cost for minting
    address payable public payments;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _initBaseURI
        //address payable _payments
    ) ERC721(_name, _symbol) {
        setUriPrefix(_initBaseURI);
         mint(maxMintAmountPerTx);
        //payments = _payments; // address of the payment splitter created
    }

    // =============================================================================
    //              Public functions start here
    // =============================================================================

    /// @notice modifier to check compliance
    /// @param _mintAmount the amount to be

    modifier mintCompliance(uint256 _mintAmount) {
        require(
            _mintAmount > 0 && _mintAmount <= maxMintAmountPerTx,
            "Invalid mint amount!"
        );
        require(
            _supply.current() + _mintAmount <= maxSupply,
            "Max supply exceeded!"
        );
        _; // resume with function execution
    }

    /// @notice gets the total supply of tokens
    /// @return total token supply

    function totalSupply() public view returns (uint256) {
        return _supply.current();
    }

    /// @notice regular mint function. Anyone can perform minting, need not be owner. It
    ///         does not make sense to mint for a receiver address if you are not the owner
    /// @param _mintAmount is the quantity of mint

    function mint(uint256 _mintAmount)
        public
        payable
        mintCompliance(_mintAmount)
    {
        require(!paused, "The contract is paused!");

        if (msg.sender != owner()) {
            if (whitelisted[msg.sender] != true) {
                if (presaleWallets[msg.sender] != true) {
                    //general public
                    require(
                        msg.value >= cost * _mintAmount,
                        "Insufficient funds!"
                    );
                } else {
                    //presale offer
                    require(
                        msg.value >= presaleCost * _mintAmount,
                        "Insufficient funds!"
                    );
                }
            }
        }
        _mintLoop(msg.sender, _mintAmount);
    }

    /// @notice mint tokens for a given address. You must be the owner to perform this
    /// @param _mintAmount is the quantity of mint
    /// @param _to is the address of the receiver for which minting must be done

    function mintForAddress(uint256 _mintAmount, address _to)
        public
        mintCompliance(_mintAmount)
        onlyOwner
    {
        _mintLoop(_to, _mintAmount);
    }

    /// @notice gets the token id's for an address
    /// @param _owner token ids for this address must be returned
    /// @return ownedTokenIds array of token ids for the given address

    function walletOfOwner(address _owner)
        public
        view
        returns (uint256[] memory)
    {
        uint256 ownerTokenCount = balanceOf(_owner);
        uint256[] memory ownedTokenIds = new uint256[](ownerTokenCount);
        uint256 currentTokenId = 1;
        uint256 ownedTokenIndex = 0;

        while (
            ownedTokenIndex < ownerTokenCount && currentTokenId <= maxSupply
        ) {
            address currentTokenOwner = ownerOf(currentTokenId);

            if (currentTokenOwner == _owner) {
                ownedTokenIds[ownedTokenIndex] = currentTokenId;
                ownedTokenIndex++;
            }

            currentTokenId++;
        }

        return ownedTokenIds;
    }

    /// @notice Returns the URI(set using setUriPrefix) for a given token ID.
    ///         May return an empty string.Reverts if the token ID does not exist.
    ///         This function is called by market places such as OpenSea, Rarible etc to
    ///         get the metadata associated with each token ID during display
    /// @param _tokenId token ids for this address must be returned
    /// @return string

    function tokenURI(uint256 _tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(
            _exists(_tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory currentBaseURI = _baseURI();
        //  abi.encodePacked() does not use padding, uses minimal space
        // and used to serialize things
        return
            bytes(currentBaseURI).length > 0
                ? string(
                    abi.encodePacked(
                        currentBaseURI,
                        _tokenId.toString(),
                        uriSuffix
                    )
                )
                : "";
    }

    /// @notice function to set cost for minting.Need to be owner.
    /// @param _cost new cost for minting

    function setCost(uint256 _cost) public onlyOwner {
        cost = _cost;
    }

    /// @notice function to set presale cost for minting.Need to be owner.
    /// @param _newCost new presale cost for minting

    function setPresaleCost(uint256 _newCost) public onlyOwner {
        presaleCost = _newCost;
    }

    /// @notice function to set maxMintAmoutPerTx.Need to be owner.
    /// @param _maxMintAmountPerTx max mint amount per transaction

    function setMaxMintAmountPerTx(uint256 _maxMintAmountPerTx)
        public
        onlyOwner
    {
        maxMintAmountPerTx = _maxMintAmountPerTx;
    }

    /// @notice function to set URI prefix.Need to be owner.
    /// @param _uriPrefix new uri prefix

    function setUriPrefix(string memory _uriPrefix) public onlyOwner {
        uriPrefix = _uriPrefix;
    }

    /// @notice function to set URI suffix.Need to be owner.
    /// @param _uriSuffix new uri suffix

    function setUriSuffix(string memory _uriSuffix) public onlyOwner {
        uriSuffix = _uriSuffix;
    }

    /// @notice function to set pause.Need to be owner.
    /// @param _state set new pause state (true or false)

    function setPaused(bool _state) public onlyOwner {
        paused = _state;
    }

    /// @notice function to whitelist a user.Need to be owner.
    /// @param _user user address to add to the whitelist

    function whitelistUser(address _user) public onlyOwner {
        whitelisted[_user] = true;
    }

    /// @notice function to remove user from whitelist.Need to be owner.
    /// @param _user user address to remove from the whitelist

    function removeWhitelistUser(address _user) public onlyOwner {
        whitelisted[_user] = false;
    }

    /// @notice function to add user to presale wallet.Need to be owner.
    /// @param _user user address to add to the presaleWallet

    function addPresaleUser(address _user) public onlyOwner {
        presaleWallets[_user] = true;
    }

    /// @notice function to remove user from presale wallet.Need to be owner.
    /// @param _user user address to remove from the presale wallet

    function removePresaleUser(address _user) public onlyOwner {
        presaleWallets[_user] = false;
    }

    /// @notice  This will transfer the contract balance to the owner.Need to be owner.
    ///          Do not remove this otherwise you will not be able to withdraw the funds.

    function withdraw() public onlyOwner {
        (bool os, ) = payable(payments).call{value: address(this).balance}("");
        require(os, "Failed to withdraw amount!");
    }

    // =============================================================================
    //              Internal functions start here
    // =============================================================================

    /// @notice Does the actual minting using ERC721's safe mint.
    ///         Minting starts from token id = 1,2,3...10K
    /// @param _mintAmount is the quantity of mint.
    /// @param _receiver address for minting.

    function _mintLoop(address _receiver, uint256 _mintAmount) internal {
        TokenInfo memory _info = TokenInfo(
                                 {
                                    current_owner: payable(_receiver),
                                    salePrice: 0,
                                    readytosell: false
                                 });
        for (uint256 i = 0; i < _mintAmount; i++) {
            _supply.increment();
            _safeMint(_receiver, _supply.current());
            tokenInfo[_supply.current()] = _info;

        }
    }

    /// @notice returns the base uri
    /// @return base uri
    function _baseURI() internal view virtual override returns (string memory) {
        return uriPrefix;
    }


// ################################################################################################

                     // Royalty stuff

// ################################################################################################

   // this is second sale, i.e. you want to buy from the current owner. Results in paying
   // royalties. First the token owner must call approve(address, token) to approve the transfer
   // This has to be done outside the smart contract as part of UI/UX (i.e JS)  before
   // calling buyToken()
    function buyToken(uint256 _tokenId) public payable
    {
        require(msg.sender != ownerOf(_tokenId), "You are the current owner for the token");

        // Perform the safe transfer
        address payable current_owner;  // seller
        uint256 salePrice;
        bool readytosell;

        TokenInfo memory _info = tokenInfo[_tokenId];
        current_owner = _info.current_owner;
        salePrice     = _info.salePrice;
        readytosell   = _info.readytosell;
        require(readytosell == true, "Token not set for sale");
        require(msg.value >= salePrice, "Not enough funds to buy");
        // First needs approval of the token ID from token owner outside the smart contract (such as JS)
        safeTransferFrom(current_owner, msg.sender, _tokenId); // transfer ownership of the art

        //return extra payment to the buyer
        if (msg.value > salePrice)
            payable(msg.sender).transfer(msg.value - salePrice);

        // now calculate and send the royalty to the artist before paying the current owner
        uint256 royaltyamount;
        address recipient;
        (recipient, royaltyamount) = this.royaltyInfo(_tokenId, salePrice);
        (bool os, ) = payable(recipient).call{value: royaltyamount}("");
        require(os, "Failed to pay royalty amount to recipient!");

        //Finally make a payment to the current owner
        (os, ) = current_owner.call{value: salePrice - royaltyamount}("");
        require(os, "Failed to pay the amount to the current owner!");

        // Update the new token owner and other info
        _info.current_owner = payable(msg.sender);
        _info.salePrice     = 0;
        _info.readytosell   = false;
        tokenInfo[_tokenId] = _info;

        emit TokenOwner(_tokenId, msg.sender);
    }

    // Reselling of token: To be called by the seller(token owner) to sell the token at a given sale Price
    function resaleToken(uint256 tokenId, uint256 _salePrice) public
    {
        require(ownerOf(tokenId) == msg.sender, " To resell you must be the token owner");

        // Update the new updated structure to the map
        TokenInfo memory _info = TokenInfo(
                                 {
                                    current_owner: payable(msg.sender),
                                    salePrice: _salePrice,
                                    readytosell: true
                                 });

        tokenInfo[tokenId] = _info;
    }


    function getTokenInfo(uint256 tokenId) public view returns (address, uint256, bool) {

        //TokenInfo memory _info =  tokenInfo[tokenId];
        //return (_info.current_owner, _info.salePrice, _info.readytosell);
        return (tokenInfo[tokenId].current_owner, tokenInfo[tokenId].salePrice, tokenInfo[tokenId].readytosell);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC2981, ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }



    /// @notice Allows to set the royalties on the contract
    /// @dev This function in a real contract should be protected with a onlyOwner (or equivalent) modifier
    /// @param recipient the royalties recipient
    // set recipient to Payment splitter address
    // @dev Sets the royalty information for a specific token id, overriding the global default
    function setTokenRoyalty(
            uint256 tokenId,
            address recipient,
            uint96 fraction
        ) public onlyOwner {
            _setTokenRoyalty(tokenId, recipient, fraction);
    }

    // Same royalty for every token i.e. per contract. But we prefer per token royalty
    // Again recipient will be payment splitter address
    function setDefaultRoyalty(address recipient, uint96 fraction) public onlyOwner{
        _setDefaultRoyalty(recipient, fraction);
    }


    function burn(uint256 tokenId) public onlyOwner {
        _burn(tokenId);
    }

    function deleteDefaultRoyalty() public onlyOwner {
        _deleteDefaultRoyalty();
    }


    function getRoyaltyFees(uint256 tokenId, uint256 _salePrice)
        public
        view
        returns (address, uint256)
    {
        address addr;
        uint256 amount;
        (addr, amount) = this.royaltyInfo(tokenId, _salePrice);
        return (addr, amount);
    }



   /*
    function withdrawRoyalty(uint256 tokenId, uint256 _salePrice) public onlyOwner {
        address addr;
        uint256 amount;
        (addr, amount) = this.royaltyInfo(tokenId, _salePrice);

        // payable(payments) are set to payment splitter contract address
        (bool os, ) = payable(addr).call{value: amount}("");
        require(os, "Failed to withdraw amount!");
    }
    */


}


