// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile 
  // manually to make sure everything is compiled
  // await hre.run('compile');
  signers = await ethers.getSigners();

  // We get the contract to deploy
  const ZestyNFT = await hre.ethers.getContractFactory("ZestyNFT");
  const zestyNFT = await ZestyNFT.deploy();
  await zestyNFT.deployed();
  console.log("ZestyNFT deployed to:", zestyNFT.address);

  const ZestyToken = await hre.ethers.getContractFactory("ZestyToken");
  const zestyToken = await ZestyToken.deploy();
  await zestyToken.deployed();
  console.log("ZestyToken deployed to:", zestyToken.address);

  const AuctionHTLC = await hre.ethers.getContractFactory("AuctionHTLC");
  const auctionHTLC = await AuctionHTLC.deploy(
    zestyToken.address,
    zestyNFT.address,
    signers[2].address
  );
  await auctionHTLC.deployed();
  console.log("AuctionHTLC deployed to:", auctionHTLC.address);

  await zestyNFT.mint(
    timeNow + 100,
    timeNow + 100000,
    0,
    'testURI',
    'testLocation'
  );
  await zestyNFT.approve(auctionHTLC.address, 0);
  await zestyToken.approve(auctionHTLC.address, 10000000);
  await zestyToken.transfer(signers[1].address, 100000);
  await zestyToken.connect(signers[1]).approve(auctionHTLC.address, 10000000)
  await auctionHTLC.startAuction(
    0,
    1000,
    timeNow + 90000,
  );
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
