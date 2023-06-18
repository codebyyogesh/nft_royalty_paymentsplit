// SPDX-License-Identifier: MIT
/*-----------------------------------------------------------
 @Filename:         PaymentSplitterCloneManager.sol
 @Copyright Author: NFThing.co
 @Date:             02/03/2022
-------------------------------------------------------------*/
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./PaymentSplitter.sol";
/**
 * @title PaymentSplitterCloneManager
 * @dev This contract allows to manage or create multiple payment splitters using OpenZeppelin's clone contract, thus making it
 * very gas efficient, instead of deploying multiple splitters separately.
 */

contract PaymentSplitterCloneFactory is Ownable {
    mapping(address => address[]) private _registeredSplitters; // maps splitter creator to splitter address
    mapping(address => address[]) private _payeestoSplitters; // maps payee to splitter address
    address[] public splitters;
    event PaymentSplitterCreated(address newSplitter);

    constructor() {
        PaymentSplitter implementation = new PaymentSplitter();
        address[] memory payees_ = new address[](1);
        payees_[0] = address(this);
        uint256[] memory shares_ = new uint256[](1);
        shares_[0] = 1;
        implementation.initialize(payees_, shares_);
        splitters.push(address(implementation));
        _registeredSplitters[address(this)].push(address(implementation));
        _payeestoSplitters[address(this)].push(address(implementation));
    }

    /**
     * @dev Getter for the address of the PaymentSplitterCloneable implementation contract.
     */
    function splitterImplementation() public view returns (address) {
        return splitters[0];
    }

    /**
     * @dev Getter for the number of PaymentSplitters registered where
     * `_owner` is splitter creator
     */
    function registeredCountOf(address _owner) external view returns (uint256) {
        return _registeredSplitters[_owner].length;
    }

    /**
     * @dev Getter for the addresses of the PaymentSplitters registered where
     * `_owner`is splitter creator.
     */
    function registeredSplittersOf(address _owner)
        external
        view
        returns (address[] memory)
    {
        return _registeredSplitters[_owner];
    }

    /**
     * @dev Getter for the address of the PaymentSplitters created by `_payee`.
     */
    function payeestoSplittersOf(address _payee)
        external
        view
        returns (address[] memory)
    {
        return _payeestoSplitters[_payee];
    }

    // Views
    /**
     * @dev Getter helper for the amount of shares held by an account.
     */
    function sharesOfAccount(address splitter, address account)
        public
        view
        returns (uint256)
    {
        return PaymentSplitter(payable(splitter)).shares(account);
    }

    /**
     * @dev Getter helper for the shares distribution of the splitter at `splitter`.
     */
    function shares(address splitter) public view returns (uint256[] memory) {
        PaymentSplitter ps = PaymentSplitter(payable(splitter));

        uint256 numPayees = ps.numPayees();
        uint256[] memory shares_ = new uint256[](numPayees);
        for (uint256 i = 0; i < numPayees; i++) {
            address p = ps.payee(i);
            shares_[i] = ps.shares(p);
        }
        return shares_;
    }

    /**
     * @dev Getter helper for payee address for the `index` of the splitter `splitter`.
     */
    function payee(address splitter, uint256 index)
        public
        view
        returns (address)
    {
        return PaymentSplitter(payable(splitter)).payee(index);
    }

    /**
     * @dev Getter helper for the payees of the splitter at `splitter`.
     */
    function payees(address splitter) public view returns (address[] memory) {
        PaymentSplitter ps = PaymentSplitter(payable(splitter));
        uint256 numPayees = ps.numPayees();
        address[] memory payees_ = new address[](numPayees);
        for (uint256 i = 0; i < numPayees; i++) {
            payees_[i] = ps.payee(i);
        }
        return payees_;
    }

    /**
     * @dev Getter helper for the current releaseable funds associated with each payee in the
     * splitter at `splitter`.
     */
    function balances(address splitter) public view returns (uint256[] memory) {
        PaymentSplitter ps = PaymentSplitter(payable(splitter));

        uint256 balance = splitter.balance;

        uint256 totalReleased = ps.totalReleased();
        uint256 totalShares = ps.totalShares();
        uint256 numPayees = ps.numPayees();
        uint256[] memory balances_ = new uint256[](numPayees);
        uint256 totalReceived = balance + totalReleased;
        for (uint256 i = 0; i < numPayees; i++) {
            address payeeAddress = ps.payee(i);
            uint256 shares_ = ps.shares(payeeAddress);
            // adapt this logic from payment splitter
            // uint256 payment = (totalReceived * _shares[account]) / _totalShares - _released[account];

            uint256 released = ps.released(payeeAddress);
            balances_[i] = (totalReceived * shares_) / totalShares - released;
        }
        return balances_;
    }

    /**
     * @dev Release funds associated with the payee address `_payeeaccount`, for the given splitter
     * ids using `_payeestoSplitters`.
     */
    function releaseforIds(address payable _payeeaccount, uint256[] memory _ids)
        external
    {
        for (uint256 i = 0; i < _ids.length; i++) {
            PaymentSplitter(payable(_payeestoSplitters[_payeeaccount][_ids[i]]))
                .release(_payeeaccount);
        }
    }

    /**
     * @dev Release all funds associated with the payee address `_payeeaccount` for all the splitters.
            A payee account may be associated with multiple splitters.
     */
    function releaseAll(address payable _payeeaccount) external {
        for (uint256 i = 0; i < _payeestoSplitters[_payeeaccount].length; i++) {
            PaymentSplitter(payable(_payeestoSplitters[_payeeaccount][i]))
                .release(_payeeaccount);
        }
    }

    /**
     * @dev Spawn a new PaymentSplitter passing in `payees_` and `shares_` to its initializer, and
     * records the splitter in memory.
     */
    function newSplitter(address[] memory payees_, uint256[] memory shares_)
        external
        payable
    {
        address _newSplitter = Clones.clone(splitterImplementation());
        PaymentSplitter(payable(_newSplitter)).initialize(payees_, shares_);
        splitters.push(_newSplitter);
        _registeredSplitters[msg.sender].push(_newSplitter);

        for (uint256 i = 0; i < payees_.length; i++) {
            _payeestoSplitters[payees_[i]].push(_newSplitter);
        }

        emit PaymentSplitterCreated(_newSplitter);
    }
}
