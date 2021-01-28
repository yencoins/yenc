// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity <0.8.0;

import "./Interfaces.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenSwap is Ownable {
    using SafeMath for uint256;

    receive() external payable {}

    address immutable token;
    address priceFeed;

    // Fee ratio in 8 decimals.
    int256 buyFee;
    int256 sellFee;

    event TokenBuy(uint256 weis, uint256 tokens);
    event TokenSell(uint256 weis, uint256 tokens);

    constructor(address _token, address _priceFeed) {
        token = _token;
        priceFeed = _priceFeed;
    }

    function getTokenAddress() public view returns (address) {
        return token;
    }

    function getPriceFeedAddress() public view returns (address) {
        return priceFeed;
    }

    function setPriceFeed(address _feed) public onlyOwner {
        require(_feed != address(0));
        priceFeed = _feed;
    }

    function setFee(int256 buy, int256 sell) public onlyOwner {
        require(buy <= 100000000);
        require(sell <= 100000000);
        buyFee = buy;
        sellFee = sell;
    }

    function getBuyFee() public view returns (int256) {
        return buyFee;
    }

    function getSellFee() public view returns (int256) {
        return sellFee;
    }

    function calculateBuyFee(uint256 _value) public view returns (int256) {
        return (int256(_value) * buyFee) / 100000000;
    }

    function calculateSellFee(uint256 _value) public view returns (int256) {
        return (int256(_value) * sellFee) / 100000000;
    }

    function buyTokens() public payable returns (bool) {
        uint256 payment = msg.value;
        int256 fee = calculateBuyFee(payment);
        uint256 amount = uint256(int256(payment) - fee);
        uint256 price = uint256(PriceFeedInterface(priceFeed).latestAnswer());
        uint256 mintTokens = amount.mul(price) / 100000000;

        require(
            TokenInterface(token).mint(msg.sender, mintTokens),
            "swap/mint-failed"
        );

        emit TokenBuy(payment, mintTokens);
        return true;
    }

    function sellTokens(uint256 tokens) public returns (bool) {
        int256 fee = calculateSellFee(tokens);
        uint256 amount = uint256(int256(tokens) - fee);
        uint256 price = uint256(PriceFeedInterface(priceFeed).latestAnswer());
        uint256 returnWeis = amount.mul(100000000) / price;

        uint256 myBalance = address(this).balance;
        require(returnWeis < myBalance, "swap/insufficient-funds");

        TokenInterface tokenInterface = TokenInterface(token);
        require(
            tokens <= tokenInterface.balanceOf(msg.sender),
            "swap/insufficient-token-balance"
        );

        require(tokenInterface.burn(msg.sender, tokens), "swap/burn-failed");
        _transferETH(msg.sender, returnWeis);

        emit TokenSell(returnWeis, tokens);
        return true;
    }

    function _transferETH(address _recipient, uint256 _wei) private {
        require(_recipient != address(0), "swap/eth-burn");

        address payable _to = payable(_recipient);
        _to.transfer(_wei);
    }

    function moveFunds(address destination, uint256 amount) public onlyOwner returns (bool) {
        _transferETH(destination, amount);
        return true;
    }

    function moveAllFunds(address destination, bool _destroy) public onlyOwner returns (bool) {
        uint256 myBalance = address(this).balance;
        _transferETH(destination, myBalance);

        if (_destroy) {
            destroy();
        }

        return true;
    }

    function destroy() public onlyOwner {
        selfdestruct(msg.sender);
    }
}
