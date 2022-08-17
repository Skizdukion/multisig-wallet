const { network, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const accounts = await ethers.getSigners()
    if (developmentChains.includes(network.name)) {
        await deploy("MultiSigWalletWithTwoAccount", {
            contract: "MultiSigWallet",
            from: accounts[0].address,
            log: true,
            args: [[accounts[0].address]],
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
    } else {
        const multiSig = await deploy("MultiSigWalletWithSingleAccount", {
            contract: "MultiSigWallet",
            from: deployer,
            log: true,
            args: [[deployer]],
        })

        await verify(multiSig.address, [[deployer]])

    }
}
module.exports.tags = ["all", "multisig"]
