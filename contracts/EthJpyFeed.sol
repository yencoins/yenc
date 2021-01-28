// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity <0.8.0;

import "./Interfaces.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EthJpyFeed is Ownable {
    using SafeMath for uint256;

    function getEthUsdPrice() public view virtual returns (int256) {
        // https://docs.chain.link/docs/ethereum-addresses
        address feed = 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419; // Mainnet
        // address feed = 0x9326BFA02ADD2366b30bacB125260Af641031331;  // Kovan
        // address feed = 0x8A753747A1Fa494EC906cE90E9f37563A8AF630e;  // Rinkeby
        PriceFeedInterface priceFeed = PriceFeedInterface(feed);

        // 1 ETH in USD (with 8 decimals)
        int256 price = priceFeed.latestAnswer();
        return price;
    }

    function getJpyUsdPrice() public view virtual returns (int256) {
        address feed = 0xBcE206caE7f0ec07b545EddE332A47C2F75bbeb3; // Mainnet
        // address feed = 0xD627B1eF3AC23F1d3e576FA6206126F3c1Bd0942;  // Kovan
        // address feed = 0x3Ae2F46a2D84e3D5590ee6Ee5116B80caF77DeCA;  // Rinkeby
        PriceFeedInterface priceFeed = PriceFeedInterface(feed);

        // 1 JPY in USD (with 8 decimals)
        int256 price = priceFeed.latestAnswer();
        return price;
    }

    function latestAnswer() public view returns (int256) {
        int256 ethUsd = getEthUsdPrice();
        int256 jpyUsd = getJpyUsdPrice();

        require(ethUsd > 0, "feed/ethusd-not-positive");
        require(jpyUsd > 0, "feed/jpyusd-not-positive");

        // 1 ETH in JPY (with 8 decimals)
        int256 price = (ethUsd * 100000000) / jpyUsd;
        return price;
    }

    function destroy() public onlyOwner {
        selfdestruct(msg.sender);
    }
}
