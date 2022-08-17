const { network, ethers } = require("hardhat")
const { verify } = require("../utils/verify")
const { developmentChains } = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const accounts = await ethers.getSigners()
    if (developmentChains.includes(network.name)) {
        await deploy("MockERC20", {
            contract: "MockERC20",
            from: accounts[0].address,
            log: true,
            args: ["Token", "t"],
        })
    } else {
        const token = await deploy("MockERC20", {
            contract: "MockERC20",
            from: accounts[0].address,
            log: true,
            args: ["Token", "t"],
        })

        await verify(token.address, ["Token", "t"])
    }
}
module.exports.tags = ["all", "mocks"]
