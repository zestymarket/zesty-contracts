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

  it('It should be able to create the token successfully', async function() {
    await zestyNFT.mint(timeNow + 100, timeNow + 100000, 'uri', 'tokenGroup');
    expect(await zestyNFT.totalSupply()).to.equal(ethers.constants.One);
    expect(await zestyNFT.balanceOf(signers[0].address)).to.equal(ethers.constants.One);
  })
});
