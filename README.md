# Zesty Market Smart Contracts
This repository possesses the smart contracts used by Zesty Market.

Contracts are deployed on rinkeby
```
ZestyNFT deployed to: 0x52D8Bc5F3C6d882c6Fa72FB228FEbAaE0B916292
ZestyToken deployed to: 0xd0A84d783870fC833CC806f4ba55Ab9D43a96895
AuctionHTLC deployed to: 0xEf5621DCcAF578077628eA2CF8febe4e86ab6C88
```

## Quickstart
1. Install hardhat with npx
```
npx hardhat
```

1. Create a `.env` file with the following information
```
INFURA_PROJECT_ID=<Get this from infura.io>
PRIVATE_KEY=<Get this from your eth account>
```

1. Compile, test, and run
```
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js  // local deploy
npx hardhat run scripts/deploy.js --network rinkeby  // rinkeby deploy
```

1. Set up hardhat local network on metamask details
```
Network Name: Hardhat (or anything you want)
New RPC URL: http://localhost:8545
Chain ID: 31337
Currency Symbol: DEV (or anything you want)
Block Explorer: (Leave Blank)
```

## Overview
The smart contracts fall into three key categories, core, governance, and profit sharing.

1. **Core**: These set of contracts are pertinent to the core functionality the contracts are as follows:
    - **ERC20 contracts**
        - ZestyToken.sol
            This is the ERC20 token implementation for $ZEST. 
            The tokenomics is still subject to change. 
            We intend on introducing governance mechanics.

    - **ERC721 contract**
        - ZestyNFT.sol
            The NFT specification here tokenizes advertising spaces that a publisher may have. 
            The tokenized advertising space can be used in the AuctionHTLC.sol

    - **Business contract**
        - AuctionHTLC.sol
            This is a hash timelock contract augmented with a Dutch auction mechanism. 

            - Part 1: Dutch Auction
            
              The Dutch Auction is a way of providing price discovery of the advertising slot.
              The publisher gets to set the starting price from which the price would decay linearly till 0 when the advertising slot expires.
              The formula used, price is measured in $ZEST, time is measured in unix time.
              ```
              current_price = starting_price - starting_price / (time_end - time_start) * (time_current - time_start)
              ```

              The first bidder is the winner of the Dutch Auction. Upon successful auction, the system proceeds to the second section locking the bidded $ZEST.

            - Part 2: Hash Timelock Contract

              The Hash Timelock Contract used is augmented with publicly verifiable secret sharing. We will use Shamir's secret as part of the secret sharing.
              When the auction completes, the contract would elect a dealer and a set of validators from the pool of validator nodes.
              To be a validator node $ZEST token would need to be staked in a pool contract.
              The dealer would create the secret and deal secret shares as well as a proof to the validators.
              Should the proof be invalid the dealer's staked share would be slashed and burned. 
              Validators can publish the proof of the secret offchain. Should the proofs be invalid the validator's stake would also be slashed and burned.
              Validators and dealers who were slashed would be removed from the pool of validator nodes.

              Should the system be honest the dealer would set the secret for the hashlock component in the the hash timelock contract.
              The advertiser can then modify the tokenURI field to set the media files for the intended advertisement.
              Validators would help check if the publisher did serve the advertiser's advertisement at a random time selected from the start and end time of the advertising slot.
              Should the advertisement be served successfully the validator would announce the share on the contract. 
              If a sufficient threshold is reached, the publisher can reference the publisher can assemble the shares to obtain the secret and unlock the funds. 
              If the publisher did not successfully advertise the advertisement, the advertiser can be refunded at the end of the timelock.
            
1. **Governance (TODO)**: These set of contracts provide governance utilizing the ERC20 as the governance token

1. **Profit Sharing (TODO)**: These set of contracts provide profit sharing functionality 
