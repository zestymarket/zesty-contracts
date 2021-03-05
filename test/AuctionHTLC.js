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

    const AuctionHTLC = await ethers.getContractFactory('AuctionHTLC');
    auctionHTLC = await AuctionHTLC.deploy(
      zestyToken.address,
      zestyNFT.address,
      signers[2].address,
    );
    await auctionHTLC.deployed();

    timeNow = await time.latest();
    timeNow = timeNow.toNumber();
    
    for (let i = 0; i < 3; i++) {
      await zestyNFT.mint(
        timeNow + 100,
        timeNow + 100000,
        'testURI' + i.toString(),
        'tokenGroup' + i.toString()
      );


      await zestyNFT.approve(auctionHTLC.address, i);
    }

    await zestyToken.approve(auctionHTLC.address, 10000000);
    await zestyToken.transfer(signers[1].address, 100000);
    await zestyToken.connect(signers[1]).approve(auctionHTLC.address, 10000000);
  });

  it('It should start multiple auctions successfully', async function() {
    for (let i = 0; i < 3; i++) {
      await auctionHTLC.auctionStart(
        i,
        1000,
        timeNow + 90000,
      );

      const data = await auctionHTLC.getAuction(i);
      expect(data[0]).to.equal(signers[0].address); // publisher
      expect(data[1]).to.equal(ethers.constants.AddressZero);  // advertiser
      expect(data[2]).to.equal("tokenGroup" + i.toString());  // tokenGroup
      expect(data[3]).to.equal(ethers.BigNumber.from(i));  // tokenId
      expect(data[4]).to.equal(ethers.BigNumber.from(1000));  // startPrice
      expect(data[6]).to.equal(ethers.BigNumber.from(timeNow + 90000));  // endTime
      expect(data[7]).to.equal(ethers.BigNumber.from(timeNow + 100000));  // tokenEndTime
      expect(data[8]).to.equal(ethers.constants.Zero);  // bidPrice
      expect(data[9]).to.equal(0);  // start

      // check if contract owns the tokens
      expect(await zestyNFT.ownerOf(i)).to.equal(auctionHTLC.address);
    }
  });

  it('It should cancel an auction successfully and return tokens', async function() {
    await auctionHTLC.auctionStart(
      0,
      1000,
      timeNow + 90000,
    );

    await auctionHTLC.auctionCancel(0);

    expect(await zestyNFT.ownerOf(0)).to.equal(signers[0].address);
    let data = await auctionHTLC.getAuction(0);
    expect(data[9]).to.equal(3);
  });

  it('It should expire an auction successfully and return tokens', async function() {
    await auctionHTLC.auctionStart(
      0,
      1000,
      timeNow + 90000,
    );

    time.increase(900000);

    await auctionHTLC.auctionCancel(0);

    expect(await zestyNFT.ownerOf(0)).to.equal(signers[0].address);
    let data = await auctionHTLC.getAuction(0);
    expect(data[9]).to.equal(2);
  });

  it('It should not allow bidding on an auction that does not exist', async function() {
    await expect(auctionHTLC.auctionBid(10)).to.be.reverted;
  });

  it('It should not allow bidding on your own auction', async function() {
    await auctionHTLC.auctionStart(
      0,
      1000,
      timeNow + 90000,
    ); 
    await expect(auctionHTLC.auctionBid(0)).to.be.reverted;

  });

  it('It should not allow bidding on an expired auction', async function() {
    await auctionHTLC.auctionStart(
      0,
      1000,
      timeNow + 90000,
    ); 
    await time.increase(200000);
    await expect(auctionHTLC.connect(signers[1]).auctionBid(0)).to.be.reverted;
  });

  it('It should allow for bidding on multiple active auctions', async function() {
    for (let i = 0; i < 3; i++) {
      await auctionHTLC.auctionStart(
        i,
        1000,
        timeNow + 90000,
      );

      await time.increase(10000);

      await auctionHTLC.connect(signers[1]).auctionBid(i);
      const data = await auctionHTLC.getAuction(i);
      expect(data[0]).to.equal(signers[0].address); // publisher
      expect(data[1]).to.equal(signers[1].address); // advertiser
      expect(data[9]).to.equal(1);  // success

      // check if contract has tokens
      const balance = await zestyToken.balanceOf(auctionHTLC.address);
      

      // check if contract is successfully created
      const contractData = await auctionHTLC.getContract(i);
      expect(contractData[0]).to.equal(signers[0].address);
      expect(contractData[1]).to.equal(signers[1].address);
      expect(contractData[2]).to.equal('tokenGroup' + i.toString());
      expect(contractData[3]).to.equal(i);
      expect(contractData[5]).to.equal(ethers.constants.HashZero);
      expect(contractData[7]).to.eql([]);
      expect(contractData[8]).to.equal(0);
      expect(contractData[9]).to.equal(0);

      // unique values due to block time behaviors
      switch (i) {
        case 0:
          expect(contractData[4]).to.equal(ethers.BigNumber.from(899));
          expect(balance).to.be.equal(ethers.BigNumber.from(899));
          expect(contractData[6]).to.equal(ethers.BigNumber.from(timeNow + 100000 + 86400));
          break;
        
        case 1:
          expect(contractData[4]).to.equal(ethers.BigNumber.from(888));
          expect(balance).to.be.equal(ethers.BigNumber.from(899 + 888));
          expect(contractData[6]).to.equal(ethers.BigNumber.from(timeNow + 100000 + 86400));
          break;

        case 2:
          expect(contractData[4]).to.equal(ethers.BigNumber.from(874));
          expect(balance).to.be.equal(ethers.BigNumber.from(899 + 888 + 874));
          expect(contractData[6]).to.equal(ethers.BigNumber.from(timeNow + 100000 + 86400));
          break;
      }
    }
  });

  it('It should only allow an advertiser to change token URI upon successful bid', async function() {
    await auctionHTLC.auctionStart(
      0,
      1000,
      timeNow + 90000,
    );    
    await auctionHTLC.connect(signers[1]).auctionBid(0);

    await auctionHTLC.connect(signers[1]).contractSetTokenURI(0, 'test');

    expect(await zestyNFT.tokenURI(0)).to.equal('test');

    await expect(auctionHTLC.contractSetTokenURI(0, 'test')).to.be.reverted;
  });

  it('It should allow a validator to set a hashlock and distribute shares', async function() {
    await auctionHTLC.auctionStart(
      0,
      1000,
      timeNow + 90000,
    );    
    await auctionHTLC.connect(signers[1]).auctionBid(0);

    // Don't allow non-validators to set password
    await expect(auctionHTLC.contractSetHashlock(0, hashlock, 5)).to.be.reverted;

    await auctionHTLC.connect(signers[2]).contractSetHashlock(0, hashlock, 5);

    // Don't allow double setting of hashlock
    await expect(auctionHTLC.connect(signers[2]).contractSetHashlock(0, hashlock, 5)).to.be.reverted;

    const contractData = await auctionHTLC.getContract(0);
    expect(contractData[5]).to.equal(hashlock);
    expect(contractData[8]).to.equal(5);
``
    // distribute shares
    await auctionHTLC.connect(signers[2]).contractSetShare(0, shares[0]);
    await auctionHTLC.connect(signers[2]).contractSetShare(0, shares[1]);
    const contractData2 = await auctionHTLC.getContract(0);
    expect(contractData2[7]).to.have.same.members(shares.slice(0,2));
  });
  
  it('It should allow a publisher to withdraw locked funds if service is done', async function() {
    await auctionHTLC.auctionStart(
      0,
      1000,
      timeNow + 90000,
    );    
    await auctionHTLC.connect(signers[1]).auctionBid(0);
    await auctionHTLC.connect(signers[2]).contractSetHashlock(0, hashlock, 5);

    for (let i = 0; i < shares.length; i++) {
      await auctionHTLC.connect(signers[2]).contractSetShare(0, shares[i]);
    }

    // Cannot withdraw with wrong preimage
    await expect(auctionHTLC.contractWithdraw(0, "0x0")).to.be.reverted;

    // Can withdraw with preimage
    await auctionHTLC.contractWithdraw(0, preimage);
    const contractData = await auctionHTLC.getContract(0);
    expect(contractData[7]).to.have.same.members(shares);
    expect(contractData[9]).to.be.equal(1);

    // Cannot withdraw again once the contract has been withdrawn
    await expect(auctionHTLC.contractWithdraw(0, preimage)).to.be.reverted;

    // check balance
    // console.log(await zestyToken.balanceOf(signers[0].address));
    expect(await zestyToken.balanceOf(signers[0].address)).to.equal(ethers.BigNumber.from("999999999999999999900961"));
    expect(await zestyToken.balanceOf(signers[1].address)).to.equal(ethers.BigNumber.from(100000 - 999));
    expect(await zestyToken.balanceOf(signers[2].address)).to.equal(ethers.BigNumber.from(19));
    expect(await zestyToken.cap()).to.equal(ethers.BigNumber.from("99999999999999999999999981"));
    expect(await zestyToken.totalSupply()).to.equal(ethers.BigNumber.from("999999999999999999999981"));

    // check if nft has been transferred to the advertiser
    expect(await zestyNFT.balanceOf(signers[1].address)).to.equal(ethers.BigNumber.from(1));

    // check if the state is updated
    let state = await auctionHTLC.getAuction
  });

  it('It should not allow a publisher to withdraw locked funds if service is not done', async function() {
    await auctionHTLC.auctionStart(
      0,
      1000,
      timeNow + 90000,
    );    
    await auctionHTLC.connect(signers[1]).auctionBid(0);
    await auctionHTLC.connect(signers[2]).contractSetHashlock(0, hashlock, 5);

    for (let i = 0; i < shares.length - 2; i++) {
      await auctionHTLC.connect(signers[2]).contractSetShare(0, shares[i]);
    }

    await expect(auctionHTLC.contractWithdraw(0, preimage)).to.be.reverted;
  });

  it('It should allow a advertiser to be refunded if the service is not done', async function() {
    await auctionHTLC.auctionStart(
      0,
      1000,
      timeNow + 90000,
    );    
    await auctionHTLC.connect(signers[1]).auctionBid(0);

    // revert if timelock not over
    await expect(auctionHTLC.connect(signers[1]).contractRefund(0)).to.be.reverted;

    await time.increase(100000 + 86400 + 1);
    await auctionHTLC.connect(signers[1]).contractRefund(0);
    expect(await zestyToken.balanceOf(signers[1].address)).to.equal(ethers.BigNumber.from(100000));
    expect(await zestyNFT.balanceOf(signers[0].address)).to.equal(ethers.BigNumber.from(3));
    const contractData = await auctionHTLC.getContract(0);
    expect(contractData[9]).to.be.equal(2);
  });

  it('It should allow a publisher to cancel and return NFT to publisher and tokens to advertiser', async function() {
    await auctionHTLC.auctionStart(
      0,
      1000,
      timeNow + 90000,
    );    
    await auctionHTLC.connect(signers[1]).auctionBid(0);

    // revert if timelock not over
    await auctionHTLC.contractCancel(0);
    expect(await zestyToken.balanceOf(signers[1].address)).to.equal(ethers.BigNumber.from(100000));
    expect(await zestyNFT.balanceOf(signers[0].address)).to.equal(ethers.BigNumber.from(3));
    const contractData = await auctionHTLC.getContract(0);
    expect(contractData[9]).to.be.equal(3);
  });
});