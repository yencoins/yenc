// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity <0.8.0;

import "./EthJpyFeed.sol";

contract MockEthJpyFeed is EthJpyFeed {
    using SafeMath for uint256;

    int256 ethUsdPrice;
    int256 jpyUsdPrice;

    function setMockPrice(int256 _ethUsdPrice, int256 _jpyUsdPrice) public {
        ethUsdPrice = _ethUsdPrice;
        jpyUsdPrice = _jpyUsdPrice;
    }

    function getEthUsdPrice() public view override returns (int256) {
        return ethUsdPrice;
    }

    function getJpyUsdPrice() public view override returns (int256) {
        return jpyUsdPrice;
    }
}
