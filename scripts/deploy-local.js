const hre = require("hardhat");
const { time } = require('@openzeppelin/test-helpers');

async function main() {
  signers = await ethers.getSigners();

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

  timeNow = await time.latest();
  timeNow = timeNow.toNumber();

  await zestyNFT.mint(
    timeNow + 100,
    timeNow + 100000,
    'https://ipfs.io/ipfs/QmUE7A69FH3MobZLGpfprGBfLErbq3HmyX9NDdSJq82Dbv',
    'testLocation'
  );
  await zestyNFT.approve(auctionHTLC.address, 0);
  await zestyToken.approve(auctionHTLC.address, 10000000);
  await zestyToken.transfer(signers[1].address, 100000);
  await zestyToken.connect(signers[1]).approve(auctionHTLC.address, 10000000)
  await auctionHTLC.auctionStart(
    0,
    1000,
    timeNow + 90000,
  );
  
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
