const { expect } = require('chai');

describe('ZestyNFT', function() {
  let zestyNFT;
  let signers;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    const ZestyNFT = await ethers.getContractFactory('ZestyNFT');
    zestyNFT = await ZestyNFT.deploy();
    await zestyNFT.deployed();
  });

  it('It should display name and symbol correctly', async function() {
    // Sanity check to see if everything is working properly
    expect(await zestyNFT.name()).to.equal('Zesty Market NFT');
    expect(await zestyNFT.symbol()).to.equal('ZESTNFT');
  });

  it('It should be able to set the token group uri correctly', async function() {
    await zestyNFT.setTokenGroupURI(0, 'test');
    expect(await zestyNFT.tokenGroupURI(signers[0].address, 0)).to.equal('test');

    await zestyNFT.setTokenGroupURI(0, 'test2');
    expect(await zestyNFT.tokenGroupURI(signers[0].address, 0)).to.equal('test2');
  })
});
