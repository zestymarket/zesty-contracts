// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Holder.sol";
import "./ZestyNFT.sol";
import "./ZestyToken.sol";

contract AuctionHTLC is Context, ERC721Holder {
    address private _tokenAddress;
    address private _NFTAddress;
    address private _validator;  // single validator implementation
    uint256 private _auctionCount = 0;

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
        uint256 timestamp
    );

    event AuctionCancel(
        uint256 indexed auctionId,
        address indexed publisher,
        uint256 tokenGroup,
        uint256 tokenId,
        uint256 timestamp
    );

    event AuctionExpire(
        uint256 indexed auctionId,
        address indexed publisher,
        uint256 tokenGroup,
        uint256 tokenId,
        uint256 timestamp
    );

    event AuctionSuccess(
        uint256 indexed auctionId,
        address indexed publisher,
        address indexed advertiser,
        uint256 tokenGroup,
        uint256 tokenId,
        uint256 bidPrice,
        uint256 timestamp
    );

    struct Auction {
        address publisher;
        address advertiser;
        uint256 tokenGroup;
        uint256 tokenId;
        uint256 startPrice;
        uint256 startTime;
        uint256 endTime;
        uint256 bidPrice;
        bool active;
    }

    mapping (uint256 => Auction) private _auctions;

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
            a.bidPrice,
            a.active
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
            block.timestamp
        );
        _auctionCount++;
    }


}