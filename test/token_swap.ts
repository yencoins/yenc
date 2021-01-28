require("./set_config");
import { accounts, config, contract, defaultSender as deployer, web3 } from "@openzeppelin/test-environment";
//@ts-ignore
import { balance, ether } from "@openzeppelin/test-helpers";
import { deployProxy } from "@openzeppelin/truffle-upgrades";
import { ContractInstance } from "@openzeppelin/truffle-upgrades/dist/truffle";
import BN from "bn.js";
import chai from "chai";
import MockEthJpyFeed from "../build/types/MockEthJpyFeed";
import TokenSwap from "../build/types/TokenSwap";
import YENc from "../build/types/YENc";

chai.use(require("chai-bn")(BN));
const expect = chai.expect;

const [_ /* = deployer */, alice, bob] = accounts;
const MockEthJpyFeedContract = contract.fromArtifact("MockEthJpyFeed");
const YENcContract = contract.fromArtifact("YENc");
const TokenSwapContract = contract.fromArtifact("TokenSwap");
MockEthJpyFeedContract.detectNetwork();
YENcContract.detectNetwork();
TokenSwapContract.detectNetwork();

//@ts-ignore
const expectBN = (value: BN) => expect(value).to.be.a.bignumber;
const toWei = web3.utils.toWei;
const add18zero = (value: BN) => value.mul(new BN("1000000000000000000"));

describe("スワップコントラクト。", () => {  // Swap contract.
  let price: MockEthJpyFeed.MockEthJpyFeedInstance & ContractInstance;
  let token: YENc.YENcInstance & ContractInstance;
  let swap: TokenSwap.TokenSwapInstance & ContractInstance;

  beforeEach(async () => {
    price = await MockEthJpyFeedContract.new({ from: deployer });
    token = await deployProxy(YENcContract, [0]) as any;
    swap = await TokenSwapContract.new(token.address, price.address, { from: deployer });
    await swap.setFee(new BN(100000), new BN(200000));
    await token.addAdmin(swap.address);
  });

  it("資金の受け取りや移動ができます。", async () => { // Can receive and move funds.
    const two = ether("2");
    await swap.send(two, { from: alice });
    expectBN(await balance.current(swap.address)).that.equals(two);

    const one = ether("1");
    const bobPrev: BN = await balance.current(bob);
    await swap.moveFunds(bob, one, { from: deployer });
    const bobNow1: BN = await balance.current(bob);
    expectBN(bobNow1.sub(bobPrev)).that.equals(one);

    await swap.moveAllFunds(bob, false, { from: deployer });
    const bobNow2: BN = await balance.current(bob);
    expectBN(bobNow2.sub(bobPrev)).that.equals(two);
  });

  it("トークンを売買することができます。", async () => { // Can buy and sell tokens.
    await price.setMockPrice(
      new BN("100000000000"), // 1 ETH = 1,000 USD
      new BN("1000000"));     // 1 JPY = 0.010 USD
    await swap.setFee(
      new BN("100000"),       // 0.1% token-buy fee
      new BN("200000"));      // 0.2% token-sell fee

    // Alice buys YENc with 100,000 JPY equivalent ETH.
    const buyAmount = ether(new BN("1"));
    await swap.buyTokens.sendTransaction({ value: buyAmount, from: alice });
    expectBN(await token.balanceOf(alice)).that.equals(
      add18zero(new BN("99900")),
      "Alice should have 99,900 YENc.");

    // Alice transfers 90,000 YENc to Bob.
    const sellAmount = add18zero(new BN("90000"));
    token.transfer(bob, sellAmount, { from: alice });

    // Meanwhile, ETH/USD and JPY/USD change.
    await price.setMockPrice(
      new BN("112275000000"), // 1 ETH = 1,122.75 USD
      new BN("900000"));      // 1 JPY = 0.009    USD

    // Bob sells 90,000 YENc to get ETH back.
    const bobPrev: BN = await balance.current(bob);
    const swapPrev: BN = await balance.current(swap.address);
    const sellTx = await swap.sellTokens(sellAmount, { from: bob });
    const etherConsumed = new BN(sellTx.receipt.gasUsed).mul(new BN(config.contracts.defaultGasPrice));
    const swapNow: BN = await balance.current(swap.address);
    const bobNow: BN = await balance.current(bob);

    // ETH balance should match after the transaction.
    const redeemEth = toWei(new BN("720"), "milli");
    expectBN(swapNow.sub(swapPrev)).that.equals(
      redeemEth.neg(),
      "Swap contract should have sent 0.72 ETH.");
    expectBN(bobNow.sub(bobPrev).add(new BN(etherConsumed))).that.equals(
      redeemEth,
      "Bob should get 0.72 ETH for YENc redemption.");
    expectBN(await token.balanceOf(bob)).that.is.zero;
  });
});
