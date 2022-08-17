const { assert, expect } = require("chai")
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const overrides = {
    gasLimit: 9999999,
}
const MINIMUM_LIQUIDITY = 10 ** 3

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Multi Sig Unit Test On Testnet", function () {
          let accounts
          beforeEach(async () => {
              accounts = await ethers.getSigners()
          })
          describe("Account Test", async function () {
              it("Should equal", async () => {
                //   assert.equal(accounts[0].address, "0xDA6839464c46857E8DA02b9a677B2383ab9697cb")
                  console.log(accounts[1].address)
              })
          })
      })
