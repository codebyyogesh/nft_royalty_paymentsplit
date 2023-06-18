//SPDX-License-Identifier: MIT
/// @title NFT minting for artists
/// @author NFThing.co
/// @notice Use this contract for minting of art. It is gas optimized
/// @dev All function calls are currently implemented without side effects

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract NFThing is ERC721, Ownable, ERC2981 {
    // =============================================================================
    //              Contract variables start here
    // =============================================================================
    using Strings for uint256; // uint256 variable can call up functions in the Strings library.e.g. value.toString()
    using Counters for Counters.Counter;
    event royaltyPaid(bool os); // event emitted after successful royalty pay

    Counters.Counter private _supply;

    string public uriPrefix = "";
    string public uriSuffix = ".json";

    uint256 public cost = 1 ether; // cost of minting
    uint256 public presaleCost = 0.5 ether; // presale offer cost
    uint256 public maxSupply = 100; // 10K NFT
    uint256 public maxMintAmountPerTx = 1; // max allowed to mint per transaction
    bool public paused = false; // pauses the minting functionality if needed
    mapping(address => bool) public whitelisted; // if you are whitelisted, you dont have to pay gas for minting
    mapping(address => bool) public presaleWallets; // for presale use presale cost for minting

    // For payment splitter and royalty
    address payable public payments; // payment splitter address for mint amount
    mapping(address => bool) public royaltyWhitelist; // if you are whitelisted, you dont have to pay royalty(Artist)

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _initBaseURI,
        address payable _payments
    ) ERC721(_name, _symbol) {
        setUriPrefix(_initBaseURI);
        payments = _payments; // address of the payment splitter created
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

    /// @notice function to update payment splitter address. Need to be owner
    /// @param _payment new payment splitter address to be used.

    function updatePaymentSplitterAddress(address payable _payment)
        public
        onlyOwner
    {
        payments = _payment;
    }

    /// @notice function to add address to royalty white list. Need to be owner.
    /// @param _user user address to add to the royalty whitelist.

    function royaltyWhitelistUser(address _user) public onlyOwner {
        royaltyWhitelist[_user] = true;
    }

    /// @notice function to remove address from royalty white list. Need to be owner.
    /// @param _user user address to remove from royalty whitelist.

    function removeRoyaltyWhitelistUser(address _user) public onlyOwner {
        royaltyWhitelist[_user] = false;
    }

    /// @notice  This will transfer the contract balance to the owner.Need to be owner.
    ///          Do not remove this otherwise you will not be able to withdraw the funds.

    function withdraw() public onlyOwner {
        (bool os, ) = payable(payments).call{value: address(this).balance}("");
        require(os, "Failed to withdraw amount!");
    }

    // ########################################################################
    // Royalty stuff
    // ########################################################################

    /// @notice Needed to resolve clash between ERC2981 and ERC721 as
    /// both implement this function and we override them
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC2981, ERC721)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /// @notice Allows to set the royalties per token. An artist must call this.
    /// @param recipient the royalties recipient. Recipient can be
    /// payment splitter address if you need to split the royalty amount or an
    /// artists address
    /// @param fraction royalty percentage in BPS (5% will be 500, 2.5% will be 250...
    ///  100% will be 10000)
    /// @dev Sets the royalty information for a specific token id, overriding the global default
    function setTokenRoyalty(
        uint256 tokenId,
        address recipient,
        uint96 fraction
    ) public onlyOwner {
        _setTokenRoyalty(tokenId, recipient, fraction);
    }

    /// @notice Same royalty for every token i.e. per contract.
    /// @param recipient the royalties recipient. Recipient can be
    /// payment splitter address if you need to split the royalty amount or
    /// artists address
    /// @param fraction royalty percentage in BPS (5% will be 500, 2.5% will be 250...
    ///  100% will be 10000)
    function setDefaultRoyalty(address recipient, uint96 fraction)
        public
        onlyOwner
    {
        _setDefaultRoyalty(recipient, fraction);
    }

    /// @notice To Delete default royalty
    function deleteDefaultRoyalty() public onlyOwner {
        _deleteDefaultRoyalty();
    }

    /// @notice This function need to be discussed in future on how the royalty fees can
    /// be paid when calling safeTransferFrom().
    /// As of now platforms like Rarible, OpenSea etc implement the royalty payment outside
    /// the safeTransferFrom() function (check doc for more details) using UI/UX,
    /// where after the token transfer they initiate royalty payment using multiple
    /// protocols implemented as smart contracts (see rarible).
    /// A much complex smart contract royalty protocol may be needed in future.
    /// As of now this is implemented to test the royalty transfer functionality.
    /// Recipient can be a Payment splitter address or an Artists address

    function payRoyaltyFees(
        address from,
        uint256 tokenId,
        uint256 salePrice
    ) public payable {
        uint256 royaltyamount;
        address recipient;
        (recipient, royaltyamount) = this.royaltyInfo(tokenId, salePrice);
        require(from == msg.sender, "Must be the token seller account");
        require(msg.value >= royaltyamount, "Not sufficient Royalty funds");
        require(
            royaltyWhitelist[msg.sender] == false,
            "Whitelisted, no royalty needed"
        );

        if (msg.value > royaltyamount) {
            uint256 temp = msg.value - royaltyamount;
            royaltyamount = msg.value - temp;
        } else {
            royaltyamount = msg.value;
        }
        (bool os, ) = payable(recipient).call{value: royaltyamount}("");
        require(os, "Failed to withdraw royalty funds!");
        emit royaltyPaid(os);
    }

    /// @notice get the royalty fee associated with the token after transfer
    /// @param tokenId tokenID of the token to know the royalty amount
    /// @param salePrice price you want to sell it for (must be in Wei the lowest possible unit)

    function getRoyaltyFees(uint256 tokenId, uint256 salePrice)
        public
        view
        returns (address, uint256)
    {
        address addr;
        uint256 amount;
        (addr, amount) = this.royaltyInfo(tokenId, salePrice);
        return (addr, amount);
    }

    // =============================================================================
    //              Internal functions start here
    // =============================================================================

    /// @notice Does the actual minting using ERC721's safe mint.
    ///         Minting starts from token id = 1,2,3...10K
    /// @param _mintAmount is the quantity of mint.
    /// @param _receiver address for minting.

    function _mintLoop(address _receiver, uint256 _mintAmount) internal {
        for (uint256 i = 0; i < _mintAmount; i++) {
            _supply.increment();
            _safeMint(_receiver, _supply.current());
        }
    }

    /// @notice returns the base uri
    /// @return base uri
    function _baseURI() internal view virtual override returns (string memory) {
        return uriPrefix;
    }
}
