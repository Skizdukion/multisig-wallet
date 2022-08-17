const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const overrides = {
    gasLimit: 9999999,
}
const MINIMUM_LIQUIDITY = 10 ** 3

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Multi Sig Unit Test Locally", function () {
          let multiSig2, multiSig5, accounts, token
          beforeEach(async () => {
              await deployments.fixture(["all"])
              accounts = await ethers.getSigners()
              multiSig2 = await ethers.getContract("MultiSigWalletWithTwoAccount")
              await multiSig2.addOwners(accounts[1].address)
              await multiSig2.executeTransaction(0)
              multiSig5 = await ethers.getContract("MultiSigWalletWithFiveAccount")
              token = await ethers.getContract("MockERC20")
          })
          describe("Authority Test", async function () {
              it("Add new owners", async () => {
                  await multiSig2.addOwners(accounts[3].address)
                  assert.equal((await multiSig2.getTransactionCount()).toString(), "2")
                  const maliciousAttackerWithMultiSig = await multiSig2.connect(accounts[2])
                  // This could also a test for cofirming transaction
                  await expect(
                      maliciousAttackerWithMultiSig.confirmTransaction(1)
                  ).to.be.revertedWith("not owner")
                  await expect(multiSig2.confirmTransaction(1)).to.be.revertedWith(
                      "tx already confirmed"
                  )
                  await (await multiSig2.connect(accounts[1])).confirmTransaction(1)
                  assert.equal(
                      (await multiSig2.getOwners()).toString(),
                      `${accounts[0].address},${accounts[1].address},${accounts[3].address}`
                  )

                  assert.equal((await multiSig2.getComfirmationsNeededWithLevel(1)).toString(), "2")

                  assert.equal((await multiSig2.getComfirmationsNeededWithLevel(2)).toString(), "2")

                  assert.equal((await multiSig2.getComfirmationsNeededWithLevel(3)).toString(), "3")

                  await multiSig5.addOwners(accounts[5].address)

                  for (let i = 1; i < 5; i++) {
                      await (await multiSig5.connect(accounts[i])).confirmTransaction(0)
                  }

                  assert.equal(
                      (await multiSig5.getOwners()).toString(),
                      `${accounts[0].address},${accounts[1].address},${accounts[2].address},${accounts[3].address},${accounts[4].address},${accounts[5].address}`
                  )
              })

              it("Remove owners", async () => {
                  await expect(multiSig2.removeOwner(accounts[1].address)).to.be.revertedWith(
                      "Reached Minimum owners"
                  )

                  assert.equal((await multiSig5.getComfirmationsNeededWithLevel(1)).toString(), "2")
                  assert.equal((await multiSig5.getComfirmationsNeededWithLevel(2)).toString(), "4")

                  await multiSig5.removeOwner(accounts[1].address)

                  await multiSig5.revokeConfirmation(0)

                  for (let i = 1; i < 4; i++) {
                      await (await multiSig5.connect(accounts[i])).confirmTransaction(0)
                  }

                  await expect(multiSig5.executeTransaction(0)).to.be.revertedWith(
                      "cannot execute tx"
                  )

                  assert.equal((await multiSig5.isOwner(accounts[1].address)).toString(), "true")

                  await multiSig5.confirmTransaction(0)

                  assert.equal((await multiSig5.getComfirmationsNeededWithLevel(1)).toString(), "2")
                  assert.equal((await multiSig5.getComfirmationsNeededWithLevel(2)).toString(), "3")
                  assert.equal((await multiSig5.isOwner(accounts[1].address)).toString(), "false")

                  const owners = await multiSig5.getOwners()
                  for (let i = 0; i < owners.length; i++) {
                      assert.notEqual(owners[i], accounts[1].address)
                  }
              })

              it("Try to lower security level by using create transaction", async () => {
                  const data = await multiSig5.callStatic.addOwners(accounts[5].address)
                  await expect(
                      multiSig5.submitTransaction(multiSig5.address, 0, data, true)
                  ).to.be.revertedWith("Not allow to do this")
                  await accounts[0].sendTransaction({ to: multiSig5.address, data: data })
                  assert.equal((await multiSig5.isOwner(accounts[5].address)).toString(), "false")
              })

              it("Receive, transfer ERC20", async () => {
                  const tokenReceiveAmount = "200000000000"
                  const tokenTransferAmount = "100000000000"

                  await token.transfer(multiSig5.address, ethers.BigNumber.from(tokenReceiveAmount))
                  assert.equal(
                      (await token.balanceOf(multiSig5.address)).toString(),
                      tokenReceiveAmount
                  )
                  const transferData = token.interface.encodeFunctionData("transfer", [
                      accounts[2].address,
                      tokenTransferAmount,
                  ])
                  await multiSig5.submitTransaction(token.address, 0, transferData, true)
                  //   console.log(await multiSig5.getTransactionCount())
                  //   console.log(await multiSig5.getTransaction(0))
                  for (let i = 1; i < 2; i++) {
                      await (await multiSig5.connect(accounts[i])).confirmTransaction(0)
                  }
                  assert.equal(
                      (await token.balanceOf(accounts[2].address)).toString(),
                      tokenTransferAmount
                  )
                  assert.equal(
                      (await token.balanceOf(multiSig5.address)).toString(),
                      (
                          ethers.BigNumber.from(tokenReceiveAmount) -
                          ethers.BigNumber.from(tokenTransferAmount)
                      ).toString()
                  )
              })

              it("Multisig approve for anthoer address", async () => {
                  const tokenApproveAmount = "100000000000"
                  const tokenReceiveAmount = "200000000000"

                  await token.transfer(multiSig5.address, ethers.BigNumber.from(tokenReceiveAmount))

                  const approveData = token.interface.encodeFunctionData("approve", [
                      accounts[3].address,
                      tokenApproveAmount,
                  ])
                  await multiSig5.submitTransaction(token.address, 0, approveData, true)
                  for (let i = 1; i < 2; i++) {
                      await (await multiSig5.connect(accounts[i])).confirmTransaction(0)
                  }
                  await (
                      await token.connect(accounts[3])
                  ).transferFrom(multiSig5.address, accounts[4].address, tokenApproveAmount)
                  assert.equal(
                      (await token.balanceOf(accounts[4].address)).toString(),
                      tokenApproveAmount
                  )
              })

              it("Address approve for Multisig, and multisig transfer for other address", async () => {
                  const tokenApproveAmount = "100000000000"

                  await token.approve(multiSig5.address, tokenApproveAmount)

                  const transferFromData = token.interface.encodeFunctionData("transferFrom", [
                      accounts[0].address,
                      accounts[2].address,
                      tokenApproveAmount,
                  ])

                  await multiSig5.submitTransaction(token.address, 0, transferFromData, true)
                  for (let i = 1; i < 2; i++) {
                      await (await multiSig5.connect(accounts[i])).confirmTransaction(0)
                  }
                  assert.equal(
                      (await token.balanceOf(accounts[2].address)).toString(),
                      tokenApproveAmount
                  )
              })
          })
      })
