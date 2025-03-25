// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleNFT is ERC721URIStorage, Ownable {
    // Utiliser un compteur simple au lieu de la bibliothèque Counters
    uint256 private _tokenIdCounter;

    constructor() ERC721("Simple NFT", "SNFT") Ownable(msg.sender) {}

    function createNFT(address recipient, string memory tokenURI) public returns (uint256) {
        // Incrémenter le compteur
        _tokenIdCounter++;
        uint256 newItemId = _tokenIdCounter;
        
        _mint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }
}