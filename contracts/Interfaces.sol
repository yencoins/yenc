// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity <0.8.0;

interface PriceFeedInterface {
    function latestAnswer() external view returns (int256);
}

abstract contract TokenInterface {
    function balanceOf(address tokenOwner) public virtual returns (uint256);
    function mint(address account, uint256 value) public virtual returns (bool);
    function burn(address account, uint256 value) public virtual returns (bool);
}
