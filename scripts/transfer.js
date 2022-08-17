const { ethers, getNamedAccounts } = require("hardhat")
const { getBscTestnetEnviroment } = require("../utils/get-bsc-test-net-enviroment")

async function test() {
    const bscTestnetEnv = await getBscTestnetEnviroment()
    // await bscTestnetEnv.token.transfer(bscTestnetEnv.multiSigContract.address, 200000000000)
    // const transferData = bscTestnetEnv.token.interface.encodeFunctionData("transfer", [
    //     bscTestnetEnv.signers[2].address,
    //     100000000000,
    // ])
    // await bscTestnetEnv.multiSigContract.submitTransaction(
    //     bscTestnetEnv.token.address,
    //     0,
    //     transferData,
    //     true
    // )
    // for (let i = 1; i < 2; i++) {
    //     await (
    //         await bscTestnetEnv.multiSigContract.connect(bscTestnetEnv.signers[i])
    //     ).confirmTransaction(4)
    // }
}

test()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
