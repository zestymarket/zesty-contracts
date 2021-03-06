const { expect } = require('chai');
const { time } = require('@openzeppelin/test-helpers');

describe('ZestyNFT', function() {
  let zestyNFT;
  let signers;
  let timeNow;

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const ZestyNFT = await ethers.getContractFactory('ZestyNFT');
    zestyNFT = await ZestyNFT.deploy();
    await zestyNFT.deployed();

    timeNow = await time.latest();
    timeNow = timeNow.toNumber();
  });

  it('It should display name and symbol correctly', async function() {
    // Sanity check to see if everything is working properly
    expect(await zestyNFT.name()).to.equal('Zesty Market NFT');
    expect(await zestyNFT.symbol()).to.equal('ZESTNFT');
  });

  it('It should be able to create multiple NFTs successfully', async function() {
    await zestyNFT.mint(timeNow + 100, timeNow + 100000, 'uri', 'tokenGroup');
    expect(await zestyNFT.totalSupply()).to.equal(ethers.constants.One);
    expect(await zestyNFT.balanceOf(signers[0].address)).to.equal(ethers.constants.One);

    let data = await zestyNFT.getTokenData(0);
    expect(data.tokenGroup).to.equal('tokenGroup');
    expect(data.publisher).to.equal(signers[0].address);
    expect(data.timeStart).to.equal(timeNow + 100);
    expect(data.timeEnd).to.equal(timeNow + 100000);
    expect(data.uri).to.equal('uri');

    await zestyNFT.mint(timeNow + 100, timeNow + 100000, 'uri2', 'tokenGroup2');
    expect(await zestyNFT.totalSupply()).to.equal(ethers.BigNumber.from(2));
    expect(await zestyNFT.balanceOf(signers[0].address)).to.equal(ethers.BigNumber.from(2));

    let data2 = await zestyNFT.getTokenData(1);
    expect(data2.tokenGroup).to.equal('tokenGroup2');
    expect(data2.publisher).to.equal(signers[0].address);
    expect(data2.timeStart).to.equal(timeNow + 100);
    expect(data2.timeEnd).to.equal(timeNow + 100000);
    expect(data2.uri).to.equal('uri2');

    await zestyNFT.mint(timeNow + 100, timeNow + 100000, 'uri3', 'tokenGroup3');
    expect(await zestyNFT.totalSupply()).to.equal(ethers.BigNumber.from(3));
    expect(await zestyNFT.balanceOf(signers[0].address)).to.equal(ethers.BigNumber.from(3));

    let data3 = await zestyNFT.getTokenData(2);
    expect(data3.tokenGroup).to.equal('tokenGroup3');
    expect(data3.publisher).to.equal(signers[0].address);
    expect(data3.timeStart).to.equal(timeNow + 100);
    expect(data3.timeEnd).to.equal(timeNow + 100000);
    expect(data3.uri).to.equal('uri3');
  });

  it('It should only allow the owner of the token to set the tokenURI', async function() {
    await zestyNFT.mint(timeNow + 100, timeNow + 100000, 'uri', 'tokenGroup');
    await expect(zestyNFT.connect(signers[2]).setTokenURI(0, "test")).to.be.reverted;
    await zestyNFT.setTokenURI(0, "test");
    let data = await zestyNFT.getTokenData(0);
    expect(data.tokenGroup).to.equal('tokenGroup');
    expect(data.publisher).to.equal(signers[0].address);
    expect(data.timeStart).to.equal(timeNow + 100);
    expect(data.timeEnd).to.equal(timeNow + 100000);
    expect(data.uri).to.equal('test');
  });

  it('It should only allow the publisher of the token to set the tokenGroup', async function() {
    await zestyNFT.mint(timeNow + 100, timeNow + 100000, 'uri', 'tokenGroup');
    await expect(zestyNFT.connect(signers[2]).setTokenGroup(0, "test")).to.be.reverted;
    await zestyNFT.setTokenGroup(0, "test");
    let data = await zestyNFT.getTokenData(0);
    expect(data.tokenGroup).to.equal('test');
    expect(data.publisher).to.equal(signers[0].address);
    expect(data.timeStart).to.equal(timeNow + 100);
    expect(data.timeEnd).to.equal(timeNow + 100000);
    expect(data.uri).to.equal('uri');
  });

  it('It should allow token transfers when unpaused and prevent token transfers when paused', async function() {
    await zestyNFT.mint(timeNow + 100, timeNow + 100000, 'uri', 'tokenGroup');
    await zestyNFT.pause();
    await expect(zestyNFT['safeTransferFrom(address,address,uint256)'](signers[0].address, signers[1].address, 0)).to.be.reverted;

    await zestyNFT.unpause();
    await zestyNFT['safeTransferFrom(address,address,uint256)'](signers[0].address, signers[1].address, 0);
    expect(await zestyNFT.balanceOf(signers[1].address)).to.equal(ethers.constants.One);

  })
});
