// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract ZestyNFT is ERC721, ERC721Pausable, Ownable { 
    using SafeMath for uint256;
    uint256 private _tokenCount = 0;

    constructor()  ERC721("Zesty Market NFT", "ZESTNFT") {
    }

    event Mint(
        uint256 indexed id,
        address indexed publisher,
        string tokenGroup,
        uint256 timeCreated,
        uint256 timeStart,
        uint256 timeEnd,
        string uri,
        uint256 timestamp
    );
    
    event Burn(
        uint256 indexed id,
        uint256 timestamp
    );

    event ModifyToken (
        uint256 indexed id,
        address indexed publisher,
        string tokenGroup,
        uint256 timeCreated,
        uint256 timeStart,
        uint256 timeEnd,
        string uri,
        uint256 timestamp
    );

    struct tokenData {
        string tokenGroup;
        address publisher;
        uint256 timeCreated;
        uint256 timeStart;
        uint256 timeEnd;
    }

    mapping (uint256 => tokenData) private _tokenData;

    function mint(
        uint256 _timeStart,
        uint256 _timeEnd,
        string memory _uri,
        string memory _tokenGroup
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

        _tokenData[_tokenCount] = tokenData(
            _tokenGroup,
            _msgSender(),
            _timeNow,
            _timeStart,
            _timeEnd
        );

        emit Mint(
            _tokenCount,
            _msgSender(),
            _tokenGroup,
            _timeNow,
            _timeStart,
            _timeEnd,
            _uri,
            block.timestamp
        );

        _tokenCount.add(1);
    }
    
    function burn(uint256 _tokenId) public {
        //solhint-disable-next-line max-line-length
        require(_isApprovedOrOwner(_msgSender(), _tokenId), "Caller is not owner nor approved");
        
        delete _tokenData[_tokenId];
        
        _burn(_tokenId);

        emit Burn(
            _tokenId,
            block.timestamp
        );        
    }

    function getTokenData(uint256 tokenId) public view returns (
        string memory tokenGroup,
        address publisher,
        uint256 timeCreated,
        uint256 timeStart,
        uint256 timeEnd,
        string memory uri
    ) {
        require(_exists(tokenId), "Token does not exist");
        tokenData storage a = _tokenData[tokenId];
        string memory _uri = tokenURI(tokenId);

        return (
            a.tokenGroup,
            a.publisher,
            a.timeCreated,
            a.timeStart,
            a.timeEnd,
            _uri
        );
    }

    function setTokenURI(uint256 _tokenId, string memory _uri) public {
        require(_exists(_tokenId), "Token does not exist");

        tokenData storage a = _tokenData[_tokenId];

        require(_isApprovedOrOwner(_msgSender(), _tokenId), "Caller is not owner or approved");

        _setTokenURI(_tokenId, _uri);

        emit ModifyToken(
            _tokenId,
            a.publisher,
            a.tokenGroup,
            a.timeCreated,
            a.timeStart,
            a.timeEnd,
            _uri,
            block.timestamp
        );
    }

    function setTokenGroup(uint256 _tokenId, string memory _tokenGroup) public {
        require(_exists(_tokenId), "Token does not exist");

        tokenData storage a = _tokenData[_tokenId];

        require(a.publisher == _msgSender(), "Not publisher of NFT");

        a.tokenGroup = _tokenGroup;
        string memory _uri = tokenURI(_tokenId);

        emit ModifyToken(
            _tokenId,
            a.publisher,
            a.tokenGroup,
            a.timeCreated,
            a.timeStart,
            a.timeEnd,
            _uri,
            block.timestamp
        );
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
    
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override (ERC721, ERC721Pausable) {
        super._beforeTokenTransfer(from, to, amount);

        require(!paused(), "Contract has been paused");
    }
}