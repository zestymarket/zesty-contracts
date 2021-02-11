const { expect } = require('chai');

describe('AuctionHTLC', function() {
  let zestyNFT;
  let auctionHTLC;
  let signers;
  let timeNow;

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const ZestyNFT = await ethers.getContractFactory('ZestyNFT');
    zestyNFT = await ZestyNFT.deploy();
    await zestyNFT.deployed();

    const ZestyToken = await ethers.getContractFactory('ZestyToken');
    zestyToken = await ZestyToken.deploy();
    await zestyToken.deployed();

    const d = new Date();
    timeNow = Math.round(d.getTime() / 1000);
    await zestyNFT.mint(
      timeNow + 100,
      timeNow + 100000,
      0,
      'testURI',
      'testLocation'
    );

    const AuctionHTLC = await ethers.getContractFactory('AuctionHTLC');
    auctionHTLC = await AuctionHTLC.deploy(
      zestyToken.address,
      zestyNFT.address,
      signers[1].address,
    );
    await auctionHTLC.deployed();
    
    await zestyNFT.approve(auctionHTLC.address, 0);
    await zestyToken.approve(auctionHTLC.address, 10000000);
  });

  it('It should start an auction successfully', async function() {
    await auctionHTLC.startAuction(
      0,
      1000,
      timeNow + 90000,
    );

    const data = await auctionHTLC.getAuction(0);
    expect(data[0] === signers[0].address); // publisher
    expect(data[1] === ethers.constants.AddressZero);  // advertiser
    expect(data[2].eq(ethers.constants.Zero));  // tokenGroup
    expect(data[3].eq(ethers.constants.Zero));  // tokenId
    expect(data[4].eq(ethers.BigNumber.from(1000)));  // startPrice
    expect(data[5].eq(ethers.BigNumber.from(timeNow + 100))); // startTime
    expect(data[6].eq(ethers.BigNumber.from(timeNow + 90000)));  // endTime
    expect(data[7].eq(ethers.constants.Zero));  // bidPrice
    expect(data[8]);  // active

    // check if contract owns the tokens
    expect(await zestyNFT.ownerOf(0) === auctionHTLC.address);
  }) 
});
