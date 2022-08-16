const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const overrides = {
    gasLimit: 9999999,
}
const MINIMUM_LIQUIDITY = 10 ** 3

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Multi Sig Unit Test", function () {
          let multiSig2, multiSig5, accounts
          beforeEach(async () => {
              await deployments.fixture(["all"])
              accounts = await ethers.getSigners()
              multiSig2 = await ethers.getContract("MultiSigWalletWithTwoAccount")
              multiSig5 = await ethers.getContract("MultiSigWalletWithFiveAccount")
          })
          describe("Authority Test", async function () {
              it("Add new owners", async () => {
                  await multiSig2.addOwners(accounts[3].address)
                  assert.equal((await multiSig2.getTransactionCount()).toString(), "1")
                  const maliciousAttackerWithMultiSig = await multiSig2.connect(accounts[2])
                  // This could also a test for cofirming transaction
                  await expect(
                      maliciousAttackerWithMultiSig.confirmTransaction(0)
                  ).to.be.revertedWith("not owner")
                  await expect(multiSig2.confirmTransaction(0)).to.be.revertedWith(
                      "tx already confirmed"
                  )
                  await (await multiSig2.connect(accounts[1])).confirmTransaction(0)
                  assert.equal(
                      (await multiSig2.getOwners()).toString(),
                      `${accounts[0].address},${accounts[1].address},${accounts[3].address}`
                  )
              })

              it("Remove owners", async () => {
                  await expect(multiSig2.removeOwner(accounts[1].address)).to.be.revertedWith(
                      "Reached Minimum owners"
                  )

                  assert.equal((await multiSig5.getLv1ComfirmationsNeededNow()).toString(), "2")
                  assert.equal((await multiSig5.getLv2ComfirmationsNeededNow()).toString(), "4")

                  await multiSig5.removeOwner(accounts[1].address)

                  for (let i = 1; i < 4; i++) {
                      await (await multiSig5.connect(accounts[i])).confirmTransaction(0)
                  }

                  assert.equal((await multiSig5.getLv1ComfirmationsNeededNow()).toString(), "2")
                  assert.equal((await multiSig5.getLv2ComfirmationsNeededNow()).toString(), "3")
                  assert.equal((await multiSig5.isOwner(accounts[1].address)).toString(), "false")

                  const owners = await multiSig5.getOwners()
                  for (let i = 0; i < owners.length; i++) {
                      assert.notEqual(owners[i], accounts[1].address)
                  }
              })

              
          })
      })
