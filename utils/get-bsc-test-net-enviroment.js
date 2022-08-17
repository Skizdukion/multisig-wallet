const multiSigAddress = "0xa9Dbf4e44825A7fA0893C7Ee6C6A169C65406a88"
const ERCToken = "0x1c11E004a9b8560287110faaaE4Be3387BC503f0"
const { ethers, network } = require("hardhat")

const getBscTestnetEnviroment = async () => {
    const provider = new ethers.providers.Web3Provider(network.provider)
    const signers = [
        new ethers.Wallet(process.env.PRIVATE_KEY, provider),
        new ethers.Wallet(process.env.ACCOUNT_1_PK, provider),
        new ethers.Wallet(process.env.ACCOUNT_2_PK, provider),
        new ethers.Wallet(process.env.ACCOUNT_3_PK, provider),
        new ethers.Wallet(process.env.ACCOUNT_4_PK, provider),
    ]
    const multiSig = (await ethers.getContractAt("MultiSigWallet", multiSigAddress)).connect(
        signers[0]
    )

    const token = (await ethers.getContractAt("MockERC20", ERCToken)).connect(
        signers[0]
    )
    return {
        signers: signers,
        multiSigContract: multiSig,
        token: token,
    }
}

module.exports = { getBscTestnetEnviroment }
