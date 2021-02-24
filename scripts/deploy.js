const hre = require("hardhat");

async function main() {
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
    "0x706400D5200f49D89F016cfbBB90Bb94668Fc80c"
  );
  await auctionHTLC.deployed();
  console.log("AuctionHTLC deployed to:", auctionHTLC.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
