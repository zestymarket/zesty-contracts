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

  timeNow = Math.floor(Date.now() / 1000);
  let data = await zestyNFT.mint(
    timeNow + 1000,
    timeNow + 100000,
    'test',
    'https://ipfs.io/ipfs/QmUE7A69FH3MobZLGpfprGBfLErbq3HmyX9NDdSJq82Dbv',
    { gasLimit: 3000000 }
  );
  
  await zestyNFT.approve(auctionHTLC.address, 0, { gasLimit: 3000000});
  await zestyToken.approve(auctionHTLC.address, 10000000, { gasLimit: 3000000});

  await auctionHTLC.auctionStart(
    0,
    10000000,
    timeNow + 90000,
    { gasLimit: 3000000}
  );

  await zestyNFT.setTokenGroup(0, 'test', { gasLimit: 3000000 });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
