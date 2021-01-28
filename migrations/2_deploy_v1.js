const { deployProxy } = require("@openzeppelin/truffle-upgrades");

const EthJpyFeed = artifacts.require("EthJpyFeed");
const YENc = artifacts.require("YENc");
const TokenSwap = artifacts.require("TokenSwap");

module.exports = async (deployer) => {
  await deployer.deploy(EthJpyFeed);
  const token = await deployProxy(YENc, [0], { deployer });
  await deployer.deploy(TokenSwap, YENc.address, EthJpyFeed.address);
  await token.addAdmin(TokenSwap.address);
};
