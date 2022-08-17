const { ethers, getNamedAccounts } = require("hardhat")
const { getBscTestnetEnviroment } = require("../utils/get-bsc-test-net-enviroment")

async function test() {
    const bscTestnetEnv = await getBscTestnetEnviroment()
    await bscTestnetEnv.multiSigContract.addOwners("0xDA6839464c46857E8DA02b9a677B2383ab9697cb")
    // // await bscTestnetEnv.multiSigContract.executeTransaction(0)
    // await (
    //     await bscTestnetEnv.multiSigContract.connect(bscTestnetEnv.signers[1])
    // ).confirmTransaction(3)
    // for (let i = 2; i < 4; i++) {
    //     await (
    //         await bscTestnetEnv.multiSigContract.connect(bscTestnetEnv.signers[i])
    //     ).confirmTransaction(3)
    // }
}

test()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
