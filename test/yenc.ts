require("./set_config");
import { accounts, contract, defaultSender as deployer } from "@openzeppelin/test-environment";
//@ts-ignore
import { constants, expectEvent, expectRevert } from "@openzeppelin/test-helpers";
import { deployProxy } from "@openzeppelin/truffle-upgrades";
import { ContractInstance } from "@openzeppelin/truffle-upgrades/dist/truffle";
import BN from "bn.js";
import chai from "chai";
import YENc from "../build/types/YENc";

chai.use(require("chai-bn")(BN));
const expect = chai.expect;

const [_ /* = deployer */, alice, bob, charlie] = accounts;
const YENcContract = contract.fromArtifact("YENc");
YENcContract.detectNetwork();

//@ts-ignore
const expectBN = (value: BN) => expect(value).to.be.a.bignumber;

describe("YENcデプロイ直後。", () => {  // Right after YENc deploy.
  let instance: YENc.YENcInstance & ContractInstance;

  beforeEach(async () => {
    instance = await deployProxy(YENcContract, [0]) as any;
  });

  it("トークンの設定。", async () => {  // Token config.
    expect(await instance.name()).to.equal("YEN Coin");
    expect(await instance.symbol()).to.equal("YENC");
    expect(await instance.version()).to.equal("1");
    expectBN(await instance.decimals()).that.equals(new BN(18));
  });

  it("資金を受け取ってはいけません。", async () => { // Do not receive funds.
    const wei = new BN(10);
    const tx = instance.send(wei, { from: alice });
    await expectRevert(tx, "revert");
  });

  it("デプロイ後は全てゼロです。", async () => {  // All zero after deploy.
    expectBN(await instance.totalSupply()).that.is.zero;
    expectBN(await instance.balanceOf(deployer)).that.is.zero;
    expectBN(await instance.balanceOf(alice)).that.is.zero;
  });

  it("誰でも0 YENCの送金が可能です。", async () => { // Anyone can transfer 0 YENC.
    const receipt = await instance.transfer(bob, 0, { from: alice });
    expectEvent(receipt, "Transfer", { from: alice, to: bob, tokens: new BN(0) });

    expectBN(await instance.balanceOf(deployer)).that.is.zero;
    expectBN(await instance.balanceOf(alice)).that.is.zero;
    expectBN(await instance.balanceOf(bob)).that.is.zero;
  });

  it("デプロイヤーは最初は唯一の管理者です。", async () => { // The deployer is the only admin at first.
    expect(await instance.isAdmin(deployer)).to.true;
    expect(await instance.isAdmin(alice)).to.false;
  });

  it("管理者はミントをすることができます。", async () => { // The admin can mint.
    const numTokens = new BN(10);
    const mintTx = instance.mint(alice, numTokens, { from: deployer });

    expectEvent(await mintTx, "Transfer", {
      from: constants.ZERO_ADDRESS,
      to: alice,
      tokens: numTokens
    });

    expectBN(await instance.totalSupply()).that.equals(numTokens);
    expectBN(await instance.balanceOf(deployer)).that.is.zero;
    expectBN(await instance.balanceOf(alice)).that.equals(numTokens);
    expectBN(await instance.balanceOf(bob)).that.is.zero;
  });

  it("ユーザーはミントできません。", async () => { // Users cannot mint.
    const numTokens = new BN(10);
    const mintTx = instance.mint(alice, numTokens, { from: bob });

    await expectRevert(mintTx, "yenc/only-admin");
  });
});

describe("YENcミントの後。", () => { // After YENc mint.
  let instance: YENc.YENcInstance & ContractInstance;
  const mintTokens = new BN(100);
  const fewTokens = new BN(20);
  const fewerTokens = new BN(10);

  beforeEach(async () => {
    instance = await deployProxy(YENcContract, [0]) as any;
    await instance.mint(alice, mintTokens, { from: deployer });
  });

  it("管理者は燃やすことができます。", async () => { // The admin can burn.
    const burnTokens = fewTokens;
    const burnTx = instance.burn(alice, burnTokens, { from: deployer });

    expectEvent(await burnTx, "Transfer", {
      from: alice,
      to: constants.ZERO_ADDRESS,
      tokens: burnTokens
    });

    const remainder = mintTokens.sub(burnTokens);
    expectBN(await instance.totalSupply()).that.equals(remainder);
    expectBN(await instance.balanceOf(deployer)).that.is.zero;
    expectBN(await instance.balanceOf(alice)).that.equals(remainder);
    expectBN(await instance.balanceOf(bob)).that.is.zero;
  });

  it("ユーザーは燃やすことができません。", async () => { // Users cannot burn.
    const burnTokens = fewTokens;
    const burnTx = instance.burn(alice, burnTokens, { from: bob });

    await expectRevert(burnTx, "yenc/only-admin");
  });

  it("管理者は残高以上に燃やすことはできません。", async () => { // The admin cannot burn more than the balance.
    const burnTokens = mintTokens.add(fewTokens);
    const burnTx = instance.burn(alice, burnTokens, { from: deployer });

    await expectRevert(burnTx, "SafeMath: subtraction overflow");
  });

  it("ユーザーは資金移動ができます。", async () => { // Users can transfer funds.
    const transferTx1 = instance.transfer(bob, fewTokens, { from: alice });
    expectEvent(await transferTx1, "Transfer", {
      from: alice,
      to: bob,
      tokens: fewTokens
    });

    const transferTx2 = instance.transfer(charlie, fewerTokens, { from: bob });
    expectEvent(await transferTx2, "Transfer", {
      from: bob,
      to: charlie,
      tokens: fewerTokens
    });

    expectBN(await instance.totalSupply()).that.equals(mintTokens);
    expectBN(await instance.balanceOf(deployer)).that.is.zero;
    expectBN(await instance.balanceOf(alice)).that.equals(mintTokens.sub(fewTokens));
    expectBN(await instance.balanceOf(bob)).that.equals(fewTokens.sub(fewerTokens));
    expectBN(await instance.balanceOf(charlie)).that.equals(fewerTokens);
  });

  it("ユーザーは残高以上に資金移動はできません。", async () => { // Users cannot transfer more than the balance.
    const transferTokens = mintTokens.add(fewTokens);
    const transferTx = instance.transfer(bob, transferTokens, { from: alice });

    await expectRevert(transferTx, "yenc/excessive-transfer");
  });

  it("転送してから燃やします。", async () => { // Transfer and then burn.
    const transferTx = instance.transfer(bob, fewTokens, { from: alice });
    expectEvent(await transferTx, "Transfer", {
      from: alice,
      to: bob,
      tokens: fewTokens
    });

    const burnTx1 = instance.burn(alice, fewerTokens, { from: deployer });
    expectEvent(await burnTx1, "Transfer", {
      from: alice,
      to: constants.ZERO_ADDRESS,
      tokens: fewerTokens
    });

    const burnTx2 = instance.burn(bob, fewerTokens, { from: deployer });
    expectEvent(await burnTx2, "Transfer", {
      from: bob,
      to: constants.ZERO_ADDRESS,
      tokens: fewerTokens
    });

    expectBN(await instance.totalSupply()).that.equals(mintTokens.sub(fewerTokens).sub(fewerTokens));
    expectBN(await instance.balanceOf(deployer)).that.is.zero;
    expectBN(await instance.balanceOf(alice)).that.equals(mintTokens.sub(fewTokens).sub(fewerTokens));
    expectBN(await instance.balanceOf(bob)).that.equals(fewTokens.sub(fewerTokens));
  });
});

describe("管理者を変更します。", () => { // Change admins.
  let instance: YENc.YENcInstance & ContractInstance;
  const mintTokens = new BN(100);

  beforeEach(async () => {
    instance = await deployProxy(YENcContract, [0]) as any;
  });

  it("新しい管理者を追加します。", async () => { // Add a new admin.
    await instance.addAdmin(alice, { from: deployer });

    expect(await instance.isAdmin(deployer)).to.true;
    expect(await instance.isAdmin(alice)).to.true;
    expect(await instance.isAdmin(bob)).to.false;

    const mintTx = instance.mint(bob, mintTokens, { from: alice });
    expectEvent(await mintTx, "Transfer", {
      from: constants.ZERO_ADDRESS,
      to: bob,
      tokens: mintTokens
    });

    expectBN(await instance.totalSupply()).that.equals(mintTokens);
    expectBN(await instance.balanceOf(deployer)).that.is.zero;
    expectBN(await instance.balanceOf(alice)).that.is.zero;
    expectBN(await instance.balanceOf(bob)).that.equals(mintTokens);
  });

  it("管理者としての自分を削除できません。", async () => { // Cannot remove self as an admin.
    const removeTx = instance.removeAdmin(deployer, { from: deployer });
    await expectRevert(removeTx, "yenc/self-remove");
  });

  it("既存の管理者を削除します。", async () => { // Remove an existing admin.
    await instance.addAdmin(alice, { from: deployer });
    await instance.removeAdmin(deployer, { from: alice });

    expect(await instance.isAdmin(deployer)).to.false;
    expect(await instance.isAdmin(alice)).to.true;
    expect(await instance.isAdmin(bob)).to.false;
  });
});
