// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is ReentrancyGuard, Ownable {
    // Structure pour stocker les informations d'un produit
    struct Product {
        uint256 id;
        string name;
        string description;
        uint256 price;
        address seller;
        bool active;
        address nftContract;
        uint256 tokenId;
        string metadata;
    }

    // Compteur pour les IDs des produits
    uint256 public nextProductId = 1;
    
    // Mapping des produits par ID
    mapping(uint256 => Product) public products;
    
    // Adresse du contrat ERC20 pour les paiements
    IERC20 public paymentToken;

    // Événements
    event ProductAdded(
        uint256 indexed productId,
        string name,
        uint256 price,
        address seller,
        address nftContract,
        uint256 tokenId,
        string metadata
    );
    
    event ProductUpdated(
        uint256 indexed productId,
        string name,
        uint256 price,
        bool active,
        string metadata
    );
    
    event ProductPurchased(
        uint256 indexed productId,
        address buyer,
        address seller,
        uint256 price
    );

    constructor(address _paymentToken) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
    }

    // Ajouter un produit au marketplace
    function addProduct(
        string memory _name,
        string memory _description,
        uint256 _price,
        address _nftContract,
        uint256 _tokenId,
        string memory _metadata
    ) external {
        // Vérifier que le vendeur est bien le propriétaire du NFT
        require(
            IERC721(_nftContract).ownerOf(_tokenId) == msg.sender,
            "You must own the NFT"
        );
        
        // Vérifier que le marketplace est approuvé pour transférer le NFT
        require(
            IERC721(_nftContract).getApproved(_tokenId) == address(this) ||
            IERC721(_nftContract).isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved to transfer NFT"
        );

        // Créer le produit
        products[nextProductId] = Product({
            id: nextProductId,
            name: _name,
            description: _description,
            price: _price,
            seller: msg.sender,
            active: true,
            nftContract: _nftContract,
            tokenId: _tokenId,
            metadata: _metadata
        });
        
        emit ProductAdded(
            nextProductId,
            _name,
            _price,
            msg.sender,
            _nftContract,
            _tokenId,
            _metadata
        );
        
        nextProductId++;
    }

    // Mettre à jour un produit
    function updateProduct(
        uint256 _productId,
        string memory _name,
        string memory _description,
        uint256 _price,
        bool _active,
        string memory _metadata
    ) external {
        require(_productId < nextProductId, "Product does not exist");
        Product storage product = products[_productId];
        require(product.seller == msg.sender, "Not the seller");
        
        product.name = _name;
        product.description = _description;
        product.price = _price;
        product.active = _active;
        product.metadata = _metadata;
        
        emit ProductUpdated(_productId, _name, _price, _active, _metadata);
    }

    // Acheter un produit
    function purchaseProduct(uint256 _productId) external nonReentrant {
        require(_productId < nextProductId, "Product does not exist");
        Product storage product = products[_productId];
        require(product.active, "Product is not active");
        require(product.seller != msg.sender, "Cannot buy your own product");
        
        // Vérifier que l'acheteur a suffisamment de tokens
        require(
            paymentToken.balanceOf(msg.sender) >= product.price,
            "Insufficient token balance"
        );
        
        // Transférer les tokens du vendeur à l'acheteur
        require(
            paymentToken.transferFrom(msg.sender, product.seller, product.price),
            "Token transfer failed"
        );
        
        // Transférer le NFT du vendeur à l'acheteur
        IERC721(product.nftContract).transferFrom(product.seller, msg.sender, product.tokenId);
        
        // Marquer le produit comme inactif
        product.active = false;
        
        emit ProductPurchased(_productId, msg.sender, product.seller, product.price);
    }

    // Récupérer un produit par ID
    function getProduct(uint256 _productId) external view returns (Product memory) {
        require(_productId < nextProductId, "Product does not exist");
        return products[_productId];
    }

    // Récupérer tous les produits actifs
    function getActiveProducts() external view returns (Product[] memory) {
        uint256 activeCount = 0;
        
        // Compter les produits actifs
        for (uint256 i = 1; i < nextProductId; i++) {
            if (products[i].active) {
                activeCount++;
            }
        }
        
        // Créer un tableau des produits actifs
        Product[] memory activeProducts = new Product[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i < nextProductId; i++) {
            if (products[i].active) {
                activeProducts[index] = products[i];
                index++;
            }
        }
        
        return activeProducts;
    }

    // Récupérer les produits d'un vendeur
    function getProductsBySeller(address _seller) external view returns (Product[] memory) {
        uint256 sellerProductCount = 0;
        
        // Compter les produits du vendeur
        for (uint256 i = 1; i < nextProductId; i++) {
            if (products[i].seller == _seller) {
                sellerProductCount++;
            }
        }
        
        // Créer un tableau des produits du vendeur
        Product[] memory sellerProducts = new Product[](sellerProductCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i < nextProductId; i++) {
            if (products[i].seller == _seller) {
                sellerProducts[index] = products[i];
                index++;
            }
        }
        
        return sellerProducts;
    }
}