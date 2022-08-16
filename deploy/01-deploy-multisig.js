const { network, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    // const { deployer } = await getNamedAccounts()
    const accounts = await ethers.getSigners()

    await deploy("MultiSigWalletWithTwoAccount", {
        contract: "MultiSigWallet",
        from: accounts[0].address,
        log: true,
        args: [[accounts[0].address, accounts[1].address]],
    })

    await deploy("MultiSigWalletWithFiveAccount", {
        contract: "MultiSigWallet",
        from: accounts[0].address,
        log: true,
        args: [
            [
                accounts[0].address,
                accounts[1].address,
                accounts[2].address,
                accounts[3].address,
                accounts[4].address,
            ],
        ],
    })
}
module.exports.tags = ["all", "factory"]
