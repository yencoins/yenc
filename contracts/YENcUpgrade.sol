// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity <0.8.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";

// Below are extracted codes from the original YENc to test its upgradability.
// DO NOT USE for the actual deployment.
contract YENcUpgrade is Initializable {
    string public constant name = "YEN Coin";
    string public constant symbol = "YENC";
    string public constant version = "99";
    uint8 public constant decimals = 18;

    event Transfer(address indexed from, address indexed to, uint256 tokens);

    mapping(address => bool) public admins;
    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowed;

    uint256 private totalSupply_;

    using SafeMath for uint256;

    function isAdmin(address _address) public view returns (bool) {
        return admins[_address];
    }

    function totalSupply() public view returns (uint256) {
        return totalSupply_;
    }

    function balanceOf(address tokenOwner) public view returns (uint256) {
        return balances[tokenOwner];
    }

    function transfer(address receiver, uint256 numTokens) public returns (bool) {
        require(numTokens <= balances[msg.sender], "yenc/excessive-transfer");

        balances[msg.sender] = balances[msg.sender].sub(numTokens);
        balances[receiver] = balances[receiver].add(numTokens);
        emit Transfer(msg.sender, receiver, numTokens);
        return true;
    }

    function mint(address account, uint256 value) public returns (bool) {
        require(account != address(0));

        totalSupply_ = totalSupply_.add(value);
        balances[account] = balances[account].add(value);
        emit Transfer(address(0), account, value);
        return true;
    }

    function testNewFunction() public pure returns (uint256) {
        return 42;
    }
}
