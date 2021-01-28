// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity <0.8.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";

contract YENc is Initializable {
    string public constant name = "YEN Coin";
    string public constant symbol = "YENC";
    string public constant version = "1";
    uint8 public constant decimals = 18;

    event Approval(address indexed tokenOwner, address indexed spender, uint256 tokens);
    event Transfer(address indexed from, address indexed to, uint256 tokens);

    mapping(address => bool) public admins;
    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowed;

    uint256 private totalSupply_;

    using SafeMath for uint256;

    modifier onlyAdmins() {
        require(admins[msg.sender] == true, "yenc/only-admin");
        _;
    }

    function initialize(uint256 _initialSupply) public initializer {
        totalSupply_ = _initialSupply;
        balances[msg.sender] = totalSupply_;
        admins[msg.sender] = true;
    }

    function isAdmin(address _address) public view returns (bool) {
        return admins[_address];
    }

    function addAdmin(address _address) public onlyAdmins {
        admins[_address] = true;
    }

    function removeAdmin(address _address) public onlyAdmins {
        require(msg.sender != _address, "yenc/self-remove");
        admins[_address] = false;
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

    function approve(address delegate, uint256 numTokens) public returns (bool) {
        allowed[msg.sender][delegate] = numTokens;
        emit Approval(msg.sender, delegate, numTokens);
        return true;
    }

    function allowance(address owner, address delegate) public view returns (uint256) {
        return allowed[owner][delegate];
    }

    function transferFrom(address owner, address buyer, uint256 numTokens) public returns (bool) {
        require(numTokens <= balances[owner], "yenc/excessive-transferFrom");
        require(numTokens <= allowed[owner][msg.sender], "yenc/above-allowance");

        balances[owner] = balances[owner].sub(numTokens);
        allowed[owner][msg.sender] = allowed[owner][msg.sender].sub(numTokens);
        balances[buyer] = balances[buyer].add(numTokens);
        emit Transfer(owner, buyer, numTokens);
        return true;
    }

    function mint(address account, uint256 value) public onlyAdmins returns (bool) {
        require(account != address(0));

        totalSupply_ = totalSupply_.add(value);
        balances[account] = balances[account].add(value);
        emit Transfer(address(0), account, value);
        return true;
    }

    function burn(address account, uint256 value) public onlyAdmins returns (bool) {
        require(account != address(0));

        totalSupply_ = totalSupply_.sub(value);
        balances[account] = balances[account].sub(value);
        emit Transfer(account, address(0), value);
        return true;
    }
}
