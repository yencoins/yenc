require("./set_config");
import { accounts, contract, defaultSender as deployer } from "@openzeppelin/test-environment";
import { deployProxy, upgradeProxy } from "@openzeppelin/truffle-upgrades";
import { ContractInstance } from "@openzeppelin/truffle-upgrades/dist/truffle";
import BN from "bn.js";
import chai from "chai";
import YENc from "../build/types/YENc";
import YENcUpgrade from "../build/types/YENcUpgrade";

chai.use(require("chai-bn")(BN));
const expect = chai.expect;

const [_ /* = deployer */, alice, bob, charlie] = accounts;
const YENcContract = contract.fromArtifact("YENc");
const YENcUpgradeContract = contract.fromArtifact("YENcUpgrade");
YENcContract.detectNetwork();
YENcUpgradeContract.detectNetwork();

//@ts-ignore
const expectBN = (value: BN) => expect(value).to.be.a.bignumber;

describe("YENcアップグレード。", () => {  // YENc Upgrades.
  let v1: YENc.YENcInstance & ContractInstance;

  beforeEach(async () => {
    v1 = await deployProxy(YENcContract, [0]) as any;
  });

  it("アップグレードに成功。", async () => { // Successful upgrade.
    const v99 = await upgradeProxy(v1.address, YENcUpgradeContract);
    expect(await v99.version()).to.equal("99");
  });

  it("残高は維持されています。", async () => { // Balances are kept.
    const mintTokens = new BN(100);
    const fewTokens = new BN(20);
    const fewerTokens = new BN(10);

    await v1.mint(alice, mintTokens, { from: deployer });
    await v1.transfer(bob, fewTokens, { from: alice });
    await v1.transfer(charlie, fewerTokens, { from: bob });

    const checkBalance = async (instance: YENc.YENcInstance) => {
      expectBN(await instance.totalSupply()).that.equals(mintTokens);
      expectBN(await instance.balanceOf(deployer)).that.is.zero;
      expectBN(await instance.balanceOf(alice)).that.equals(mintTokens.sub(fewTokens));
      expectBN(await instance.balanceOf(bob)).that.equals(fewTokens.sub(fewerTokens));
      expectBN(await instance.balanceOf(charlie)).that.equals(fewerTokens);
    };

    await checkBalance(v1);
    const v99: YENcUpgrade.YENcUpgradeInstance & ContractInstance =
      await upgradeProxy(v1.address, YENcUpgradeContract) as any;

    //@ts-ignore
    await checkBalance(v99);
  });

  it("資金移動がうまくいきます。", async () => { // Fund transfer works.
    const mintTokens = new BN(100);
    const fewTokens = new BN(20);
    const fewerTokens = new BN(10);

    const checkBalance = async (instance: YENc.YENcInstance) => {
      expectBN(await instance.totalSupply()).that.equals(mintTokens);
      expectBN(await instance.balanceOf(deployer)).that.is.zero;
      expectBN(await instance.balanceOf(alice)).that.equals(mintTokens.sub(fewTokens));
      expectBN(await instance.balanceOf(bob)).that.equals(fewTokens.sub(fewerTokens));
      expectBN(await instance.balanceOf(charlie)).that.equals(fewerTokens);
    };

    const v99: YENcUpgrade.YENcUpgradeInstance & ContractInstance =
      await upgradeProxy(v1.address, YENcUpgradeContract) as any;
    await v99.mint(alice, mintTokens, { from: deployer });
    await v99.transfer(bob, fewTokens, { from: alice });
    await v99.transfer(charlie, fewerTokens, { from: bob });

    //@ts-ignore
    await checkBalance(v99);
  });

  it("管理者は変わりません。", async () => { // Admins do not change.
    await v1.addAdmin(alice, { from: deployer });
    await v1.removeAdmin(deployer, { from: alice });

    const checkAdmin = async (instance: YENc.YENcInstance) => {
      expect(await instance.isAdmin(deployer)).to.false;
      expect(await instance.isAdmin(alice)).to.true;
      expect(await instance.isAdmin(bob)).to.false;
    };

    await checkAdmin(v1);
    const v99: YENcUpgrade.YENcUpgradeInstance & ContractInstance =
      await upgradeProxy(v1.address, YENcUpgradeContract) as any;

    //@ts-ignore
    await checkAdmin(v99);
  });

  it("新機能が使えるようになりました。", async () => { // New function usable.
    const v99: YENcUpgrade.YENcUpgradeInstance & ContractInstance =
      await upgradeProxy(v1.address, YENcUpgradeContract) as any;
    expectBN(await v99.testNewFunction()).that.equals(new BN(42));
  });
});
