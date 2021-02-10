// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/GSN/Context.sol";

contract ZestyNFT is ERC721, ERC721Pausable, Ownable { 
    uint256 private _tokenCount = 0;

    constructor()  ERC721("Zesty Market NFT", "ZESTNFT") {
    }

    event SetTokenGroupURI(
        address indexed publisher,
        uint256 indexed tokenGroup,
        string tokenGroupURI
    );

    event Mint(
        uint256 indexed id,
        uint256 indexed tokenGroup,
        address indexed publisher,
        address advertiser,
        uint256 timeCreated,
        uint256 timeStart,
        uint256 timeEnd,
        string location,  // location refers to the ad slot on the publisher's app or site
        string uri,  // uri refers to the media that will be served on the ad slot
        uint256 timeModified
    );
    
    event Burn(
        uint256 indexed id,
        uint256 indexed tokenGroup,
        address indexed publisher,
        uint256 timeModified
    );

    event ModifyToken (
        uint256 indexed id,
        uint256 indexed tokenGroup,
        address indexed publisher,
        address advertiser,
        uint256 timeCreated,
        uint256 timeStart,
        uint256 timeEnd,
        string location,
        string uri,
        uint256 timeModified
    );

    struct adData {
        uint256 tokenGroup;
        address publisher;
        address advertiser;
        uint256 timeCreated;
        uint256 timeStart;
        uint256 timeEnd;
        string location;
    }

    mapping (uint256 => adData) private _adData;
    mapping (address => mapping (uint256 => string)) private _tokenGroupURIs;

    // Mints to msg.sender
    function mint(
        uint256 _timeStart,
        uint256 _timeEnd,
        uint256 _tokenGroup,
        string memory _uri,
        string memory _location
    ) public {
        // Checks
        uint256 _timeNow = block.timestamp;
        require(_timeEnd > _timeNow, "Ending time of token set in the past");
        require(_timeStart > _timeNow, "Starting time of token set in the past");
        require(_timeEnd > _timeStart, "Ending time is before timeStart");

        // mint token
        _safeMint(_msgSender(), _tokenCount);

        // set uri
        _setTokenURI(_tokenCount, _uri);

        _adData[_tokenCount] = adData(
            _tokenGroup,
            _msgSender(),
            address(0),
            _timeNow,
            _timeStart,
            _timeEnd,
            _location
        );

        emit Mint(
            _tokenCount,
            _tokenGroup,
            _msgSender(),
            address(0),
            _timeNow,
            _timeStart,
            _timeEnd,
            _location,
            _uri,
            block.timestamp
        );

        _tokenCount++;
    }
    
    function burn(uint256 _tokenId) public {
        //solhint-disable-next-line max-line-length
        require(_isApprovedOrOwner(_msgSender(), _tokenId), "Caller is not owner nor approved");
        
        // Get adData
        adData storage a = _adData[_tokenId];
        
        emit Burn(
            _tokenId,
            a.tokenGroup,
            a.publisher,
            block.timestamp
        );        

        // Clear ad adData
        delete _adData[_tokenId];
        
        _burn(_tokenId);
    }

    function getTokenData(uint256 tokenId) public view returns (
        uint256 tokenGroup,
        address publisher,
        address advertiser,
        uint256 timeCreated,
        uint256 timeStart,
        uint256 timeEnd,
        string memory location,
        string memory uri
    ) {
        require(_exists(tokenId), "Token does not exist");
        adData storage a = _adData[tokenId];
        string memory _uri = tokenURI(tokenId);

        return (
            a.tokenGroup,
            a.publisher,
            a.advertiser,
            a.timeCreated,
            a.timeStart,
            a.timeEnd,
            a.location,
            _uri
        );
    }

    function setTokenURI(uint256 _tokenId, string memory _uri) public {
        require(_exists(_tokenId), "Token does not exist");

        adData storage a = _adData[_tokenId];

        require(_isApprovedOrOwner(_msgSender(), _tokenId), "Caller is not owner or approved");

        _setTokenURI(_tokenId, _uri);

        emit ModifyToken(
            _tokenId,
            a.tokenGroup,
            a.publisher,
            a.advertiser,
            a.timeCreated,
            a.timeStart,
            a.timeEnd,
            a.location,
            _uri,
            block.timestamp
        );
    }

    function setTokenGroup(uint256 _tokenId, uint256 _tokenGroup) public {
        require(_exists(_tokenId), "Token does not exist");

        adData storage a = _adData[_tokenId];

        require(a.publisher == _msgSender(), "Not publisher of NFT");

        a.tokenGroup = _tokenGroup;
        string memory _uri = tokenURI(_tokenId);

        emit ModifyToken(
            _tokenId,
            a.tokenGroup,
            a.publisher,
            a.advertiser,
            a.timeCreated,
            a.timeStart,
            a.timeEnd,
            a.location,
            _uri,
            block.timestamp
        );
    }

    function setTokenGroupURI(uint256 _tokenGroup, string memory _tokenGroupURI) public {
        _tokenGroupURIs[msg.sender][_tokenGroup] = _tokenGroupURI;

        emit SetTokenGroupURI(
            msg.sender,
            _tokenGroup,
            _tokenGroupURI
        );
    }

    function tokenGroupURI(address _publisher, uint256 _tokenGroup) public view returns (
        string memory
    ) {
        return _tokenGroupURIs[_publisher][_tokenGroup];
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
    
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override (ERC721, ERC721Pausable) {
        super._beforeTokenTransfer(from, to, amount);

        require(!paused(), "ERC20Pausable: token transfer while paused");
    }
}