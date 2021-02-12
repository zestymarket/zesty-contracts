const { expect } = require('chai');
const { time } = require('@openzeppelin/test-helpers');


describe('AuctionHTLC', function() {
  let zestyNFT;
  let auctionHTLC;
  let signers;
  let timeNow;

  const preimage = '0x007e125abb9404a768ae9b494a9fb36910101010101010101010101010101010';
  const hashlock = '0xf889f963852f60c411aa31d4b1b9548a4601ad1660699020ba68a22decb280e7';
  const shares = [
    '1-0x62fb64c396dbf19818a7a401bc21c1df',
    '2-0xc574ff68e10beed988bce5d8a7e35605',
    '3-0xa7f189f1cc441be6f8b5da90515d24b3',
    '4-0x8a6bc83e0eabd05aa88a666a90667936',
    '5-0xe8eebea723e42565d883592266d80b80'
  ]


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

    // check if auction has tokens
    const balance = await zestyToken.balanceOf(auctionHTLC.address);
    // this happened instantaneously so bid price is start price
    expect(balance.eq(ethers.BigNumber.from(1000)));

    // check if contract is successfully created
    const contractData = await auctionHTLC.getContract(0);
    expect(contractData[0] === signers[0].address);
    expect(contractData[1] === signers[1].address);
    expect(contractData[2].eq(ethers.constants.Zero));
    expect(contractData[3].eq(ethers.constants.Zero));
    expect(contractData[4].eq(ethers.BigNumber.from(1000)));
    expect(contractData[5] === ethers.constants.HashZero);
    expect(contractData[6].eq(ethers.BigNumber.from(timeNow + 100000 + 14400)));
    expect(!contractData[7]);
    expect(!contractData[8]);
    expect(contractData[9] === [] || contractData[9].length === 0);
    expect(contractData[10] === 0);
  });

  it('It should allow an advertiser to change token URI upon successful bid', async function() {
    await auctionHTLC.startAuction(
      0,
      1000,
      timeNow + 90000,
    );    
    await auctionHTLC.connect(signers[1]).bidAuction(0);

    await auctionHTLC.connect(signers[1]).setTokenURI(0, 'test');

    expect(await zestyNFT.tokenURI(0)).to.equal('test');
  });

  it('It should allow a validator to set a hashlock and distribute shares', async function() {
    await auctionHTLC.startAuction(
      0,
      1000,
      timeNow + 90000,
    );    
    await auctionHTLC.connect(signers[1]).bidAuction(0);

    // Don't allow non-validators to set password
    await expect(auctionHTLC.setHashlock(0, hashlock, 5)).to.be.reverted;

    await auctionHTLC.connect(signers[2]).setHashlock(0, hashlock, 5);

    // Don't allow double setting of hashlock
    await expect(auctionHTLC.connect(signers[2]).setHashlock(0, hashlock, 5)).to.be.reverted;

    const contractData = await auctionHTLC.getContract(0);
    expect(contractData[5]).to.equal(hashlock);
    expect(contractData[10]).to.equal(5);

    // distribute shares
    await auctionHTLC.connect(signers[2]).setShare(0, shares[0]);
    await auctionHTLC.connect(signers[2]).setShare(0, shares[1]);
    const contractData2 = await auctionHTLC.getContract(0);
    expect(contractData2[9] === shares[0,2]);
  });
  
  it('It should allow a publisher to withdraw locked funds if service is done', async function() {
    await auctionHTLC.startAuction(
      0,
      1000,
      timeNow + 90000,
    );    
    await auctionHTLC.connect(signers[1]).bidAuction(0);
    await auctionHTLC.connect(signers[2]).setHashlock(0, hashlock, 5);

    for (let i = 0; i < shares.length; i++) {
      await auctionHTLC.connect(signers[2]).setShare(0, shares[i]);
    }

    await expect(auctionHTLC.withdraw(0, "0x0")).to.be.reverted;
    await auctionHTLC.withdraw(0, preimage);
    const contractData = await auctionHTLC.getContract(0);
    expect(contractData[7]);
    await expect(auctionHTLC.withdraw(0, preimage)).to.be.reverted;

    // check balance
    // console.log(await zestyToken.balanceOf(signers[0].address));
    expect(await zestyToken.balanceOf(signers[0].address)).to.equal(ethers.BigNumber.from("999999999999999999900960"));
    expect(await zestyToken.balanceOf(signers[1].address)).to.equal(ethers.BigNumber.from(100000 - 1000));
    expect(await zestyToken.balanceOf(signers[2].address)).to.equal(ethers.BigNumber.from(20));
    expect(await zestyToken.cap()).to.equal(ethers.BigNumber.from("99999999999999999999999980"));
    expect(await zestyToken.totalSupply()).to.equal(ethers.BigNumber.from("999999999999999999999980"));
  });

  it('It should not allow a publisher to withdraw locked funds if service is not done', async function() {
    await auctionHTLC.startAuction(
      0,
      1000,
      timeNow + 90000,
    );    
    await auctionHTLC.connect(signers[1]).bidAuction(0);
    await auctionHTLC.connect(signers[2]).setHashlock(0, hashlock, 5);

    for (let i = 0; i < shares.length - 2; i++) {
      await auctionHTLC.connect(signers[2]).setShare(0, shares[i]);
    }

    await expect(auctionHTLC.withdraw(0, preimage)).to.be.reverted;
  });

  it('It should allow a advertiser to be refunded if the service is not done', async function() {
    await auctionHTLC.startAuction(
      0,
      1000,
      timeNow + 90000,
    );    
    await auctionHTLC.connect(signers[1]).bidAuction(0);

    // revert if timelock not over
    await expect(auctionHTLC.connect(signers[1]).withdraw(0)).to.be.reverted;

    await time.increase(timeNow + 100000 + 14400 + 1);
    await auctionHTLC.connect(signers[1]).refund(0);
    expect(await zestyToken.balanceOf(signers[1].address)).to.equal(ethers.BigNumber.from(100000));
  });
});
