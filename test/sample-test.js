const { expect } = require("chai");

describe("ZestyNFT", function() {
  it("It should display name and symbol correctly", async function() {
    const ZestyNFT = await ethers.getContractFactory("ZestyNFT");
    const zestyNFT = await ZestyNFT.deploy();
    
    // Sanity check to see if everything is working properly
    await zestyNFT.deployed();
    expect(await zestyNFT.name()).to.equal("Zesty Market NFT");
    expect(await zestyNFT.symbol()).to.equal("ZESTNFT");
  });
});
