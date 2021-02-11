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
      signers[2].address,
    );
    await auctionHTLC.deployed();
    
    await zestyNFT.approve(auctionHTLC.address, 0);
    await zestyToken.approve(auctionHTLC.address, 10000000);

    await zestyToken.transfer(signers[1].address, 100000);
    await zestyToken.connect(signers[1]).approve(auctionHTLC.address, 10000000);
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
    expect(data[7].eq(ethers.BigNumber.from(timeNow + 100000)));  // tokenEndTime
    expect(data[8].eq(ethers.constants.Zero));  // bidPrice
    expect(data[9]);  // active

    // check if contract owns the tokens
    expect(await zestyNFT.ownerOf(0) === auctionHTLC.address);
  });

  it('It should not allow bidding on an inactive auction', async function() {
    await expect(auctionHTLC.bidAuction(10)).to.be.reverted;
  });

  it('It should allow for bidding on an active auction', async function() {
    await auctionHTLC.startAuction(
      0,
      1000,
      timeNow + 90000,
    );

    await auctionHTLC.connect(signers[1]).bidAuction(0);
    const data = await auctionHTLC.getAuction(0);
    expect(data[0] === signers[0].address); // publisher
    expect(data[1] === signers[1].address);  // advertiser
    expect(!data[9]);  // active

  })
});
