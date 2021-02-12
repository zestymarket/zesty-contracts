// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Holder.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./ZestyNFT.sol";
import "./ZestyToken.sol";

contract AuctionHTLC is Context, ERC721Holder {
    using SafeMath for uint256;
    using SafeMath for uint32;
    address private _tokenAddress;
    address private _NFTAddress;
    address private _validator;  // single validator implementation
    uint256 private _auctionCount = 0;
    uint256 private _contractCount = 0;
    uint32 private _availabilityThreshold = 8000; // 80.00% availability threshold
    uint256 private _burnPerc = 200; // 2.00 % burned upon successful transaction
    // TODO
    // uint256 private stakeRedistributionPerc = 400; // 4.00% redistributed to staking and liquidity provider pools
    uint256 private _validatorPerc = 200; // 2.00% redistributed to validators

    ZestyNFT private _zestyNFT;
    ZestyToken private _zestyToken;

    constructor(
        address tokenAddress_, 
        address NFTAddress_,
        address validator_
    ) {
        _tokenAddress = tokenAddress_;
        _NFTAddress = NFTAddress_;
        _validator = validator_;
        _zestyNFT = ZestyNFT(_NFTAddress);
        _zestyToken = ZestyToken(_tokenAddress);
    }

    // Auction Section 

    event AuctionStart(
        uint256 indexed auctionId,
        address indexed publisher,
        uint256 tokenGroup,
        uint256 tokenId,
        uint256 startPrice,
        uint256 startTime,
        uint256 endTime,
        uint256 tokenEndTime,
        uint256 timestamp,
        bool active
    );

    // event AuctionCancel(
    //     uint256 indexed auctionId,
    //     address indexed publisher,
    //     uint256 tokenGroup,
    //     uint256 tokenId,
    //     uint256 timestamp,
    //     bool active
    // );

    // event AuctionExpire(
    //     uint256 indexed auctionId,
    //     address indexed publisher,
    //     uint256 tokenGroup,
    //     uint256 tokenId,
    //     uint256 timestamp,
    //     bool active
    // );

    event AuctionSuccess(
        uint256 indexed auctionId,
        address indexed publisher,
        address indexed advertiser,
        uint256 tokenGroup,
        uint256 tokenId,
        uint256 bidPrice,
        uint256 timestamp,
        bool active
    );

    struct Auction {
        address publisher;
        address advertiser;
        uint256 tokenGroup;
        uint256 tokenId;
        uint256 startPrice;
        uint256 startTime;
        uint256 endTime;
        uint256 tokenEndTime;
        uint256 bidPrice;
        bool active;
    }

    mapping (uint256 => Auction) private _auctions;

    // Hash timelock contract section
    event ContractStart(
        uint256 indexed contractId,
        address indexed publisher, 
        address indexed advertiser,
        uint256 tokenGroup,
        uint256 tokenId,
        uint256 amount,
        uint256 timelock 
    );

    event ContractSetHashlock(
        uint256 indexed contractId,
        bytes32 hashlock,
        uint32 totalShares
    );

    event ContractSetShare(
        uint256 indexed contractId,
        string share
    );

    event ContractWithdraw(uint256 indexed contractId);
    event ContractRefund(uint256 indexed contractId);

    struct Contract {
        address publisher;
        address advertiser;
        uint256 tokenGroup;
        uint256 tokenId;
        uint256 amount;
        bytes32 hashlock;
        uint256 timelock;
        bool withdrawn;
        bool refunded;
        string[] shares;
        uint32 totalShares;
    }

    mapping (uint256 => Contract) private _contracts;


    function getTokenAddress() external view returns (address) {
        return _tokenAddress;
    }

    function getNFTAddress() external view returns (address) {
        return _NFTAddress;
    }

    function getValidator() external view returns (address) {
        return _validator;
    }

    function getAuction(uint256 _auctionId) public view returns (
        address,
        address,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        bool
    ) {
        Auction storage a = _auctions[_auctionId];

        return (
            a.publisher,
            a.advertiser,
            a.tokenGroup,
            a.tokenId,
            a.startPrice,
            a.startTime,
            a.endTime,
            a.tokenEndTime,
            a.bidPrice,
            a.active
        );
    }

    function getContract(uint256 _contractId) public view returns (
        address,
        address,
        uint256,
        uint256,
        uint256,
        bytes32,
        uint256,
        bool,
        bool,
        string[] memory,
        uint32
    ) {
        Contract storage c = _contracts[_contractId];

        return (
            c.publisher,
            c.advertiser,
            c.tokenGroup,
            c.tokenId,
            c.amount,
            c.hashlock,
            c.timelock,
            c.withdrawn,
            c.refunded,
            c.shares,
            c.totalShares
        );
    }

    function startAuction(
        uint256 _tokenId,
        uint256 _startPrice,
        uint256 _endTime
    ) public {
        require(
            _zestyNFT.getApproved(_tokenId) == address(this),
            "Contract is not approved to manage the token"
        );
        require(
            _startPrice > 0,
            "Starting Price of the Dutch auction must be greater than 0"
        );
        require(
            _endTime > block.timestamp,
            "Ending time of the Dutch auction must be in the future"
        );

        uint256 _tokenGroup;
        address _publisher;
        uint256 _timeCreated;
        uint256 _tokenTimeStart;
        uint256 _tokenTimeEnd;
        string memory _location;
        string memory _uri;

        (_tokenGroup,
         _publisher,
         _timeCreated,
         _tokenTimeStart,
         _tokenTimeEnd,
         _location,
         _uri) = _zestyNFT.getTokenData(_tokenId);

        require(
            _tokenTimeEnd > _endTime,
            "Ending time of auction is later than expiry of token"
        );

        _zestyNFT.safeTransferFrom(_msgSender(), address(this), _tokenId);

        _auctions[_auctionCount] = Auction(
            _publisher,
            address(0),
            _tokenGroup,
            _tokenId,
            _startPrice,
            block.timestamp,
            _endTime,
            _tokenTimeEnd,
            uint256(0),
            true
         );

        emit AuctionStart(
            _auctionCount,
            _publisher,
            _tokenGroup,
            _tokenId,
            _startPrice,
            block.timestamp,
            _endTime,
            _tokenTimeEnd,
            block.timestamp,
            true
        );
        _auctionCount++;
    }

    function bidAuction(uint256 _auctionId) public {
        Auction storage a = _auctions[_auctionId];

        require(a.active, "Auction is not active");
        require(a.publisher != _msgSender(), "Cannot bid on own auction");

        uint256 timeNow = block.timestamp;
        uint256 timePassed = timeNow.sub(a.startTime);
        uint256 timeTotal = a.tokenEndTime.sub(a.startTime);
        uint256 gradient = a.startPrice.div(timeTotal);
        uint256 bidPrice = a.startPrice.sub(gradient.mul(timePassed));

        if(!_zestyToken.transferFrom(_msgSender(), address(this), bidPrice)) {
            revert("Transfer $ZEST failed");
        }

        a.active = false;
        a.bidPrice = bidPrice;
        a.advertiser = _msgSender();

        emit AuctionSuccess(
            _auctionId,
            a.publisher,
            a.advertiser,
            a.tokenGroup,
            a.tokenId,
            a.bidPrice,
            timeNow,
            false
        );

        // create contract
        Contract storage c = _contracts[_contractCount];
        c.publisher = a.publisher;
        c.advertiser = a.advertiser;
        c.tokenGroup = a.tokenGroup;
        c.tokenId = a.tokenId;
        c.amount = a.bidPrice;
        c.timelock = a.tokenEndTime.add(14400); // add 4 hr to the end of ad slot
        c.withdrawn = false;
        c.refunded = false;

        emit ContractStart(
            _contractCount,
            a.publisher,
            a.advertiser,
            a.tokenGroup,
            a.tokenId,
            a.bidPrice,
            a.tokenEndTime.add(14400)
        );

         _contractCount++;
    }

    function setHashlock(
        uint256 _contractId, 
        bytes32 _hashlock, 
        uint32 _totalShares
    ) public {
        require(_msgSender() == _validator, "Not validator");

        Contract storage c = _contracts[_contractId];

        require(c.hashlock == 0x0, "Hashlock already set");

        c.hashlock = _hashlock;
        c.totalShares = _totalShares;

        emit ContractSetHashlock(
            _contractId, 
            c.hashlock,
            c.totalShares
        );
    }

    function setShare(uint256 _contractId, string memory _share) public {
        require(_msgSender() == _validator, "Not validator");
        Contract storage c = _contracts[_contractId];

        // does not check for validity of share
        // the checking will be done offchain through publicly veriable secret sharing
        c.shares.push(_share);

        emit ContractSetShare(
            _contractId, 
            _share
        );
    }

    function refund(uint256 _contractId) public {
        Contract storage c = _contracts[_contractId];
        require(c.publisher != address(0), "Contract does not exist");
        require(_msgSender() == c.advertiser, "Not advertiser");
        // check for shares length and totalShares, if it's 0 that means the validator malfunctioned
        if (c.shares.length != 0 && c.totalShares != 0) {
            require(
                c.shares.length < c.totalShares.mul(_availabilityThreshold).div(10000), 
                "Availability threshold reached"
            );
        }
        require(!c.refunded, "Already refunded");
        require(!c.withdrawn, "Already withdrawn");
        // We still keep a timelock in the event the advertiser is still delivering the adslot
        // but have yet to receive sufficient share
        require(c.timelock < block.timestamp, "Timelock not yet passed"); 

        c.refunded = true;
        _zestyToken.transfer(c.advertiser, c.amount);
        emit ContractRefund(_contractId);
    }

    function withdraw(uint256 _contractId, bytes32 _preimage) public {
        Contract storage c = _contracts[_contractId];
        require(c.publisher != address(0), "Contract does not exist");
        require(_msgSender() == c.publisher, "Not publisher");
        require(
            c.shares.length >= c.totalShares.mul(_availabilityThreshold).div(10000), 
            "Availability threshold not reached"
        );
        require(!c.refunded, "Already refunded");
        require(!c.withdrawn, "Already withdrawn");
        // We still use a hashlock as a final check because length of shares
        // is insufficient to demonstrate that the advertisement has been served
        // possibility of malicious nodes in multi public validator system
        require(
            c.hashlock == keccak256(abi.encodePacked(_preimage)), 
            "Hashlock does not match"
        );

        c.withdrawn = true;
    
        uint256 burnAmount = c.amount.mul(_burnPerc).div(10000);
        uint256 valAmount = c.amount.mul(_validatorPerc).div(10000);
        uint256 remaining = c.amount.sub(burnAmount).sub(valAmount);

        // burn tokens
        _zestyToken.burn(burnAmount);

        // give some to validators
        _zestyToken.transfer(_validator, valAmount);

        // give rest to publisher
        _zestyToken.transfer(c.publisher, remaining);

        emit ContractRefund(_contractId);
    }
}