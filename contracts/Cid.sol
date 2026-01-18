// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract Cid is ERC721URIStorage {
    
    uint256 private _nextTokenId;

    struct Post {
        uint id;
        address author; // 🎨 The Original Creator (Never changes)
        address owner;  // 💼 The Current Owner (Changes when sold)
        string cid;
        uint timestamp;
        bool isMinted;
        uint price;
        bool forSale;
    }

    Post[] public posts;
    
    // --- YOUR ORIGINAL MAPPINGS (Kept Safe) ---
    mapping(address => address[]) public following;
    mapping(uint => uint) public postToTokenId; 

    // --- EVENTS ---
    event PostCreated(uint postId, address author, string cid, uint timestamp);
    event UserFollowed(address follower, address followed);
    event PostMinted(uint postId, uint tokenId, address owner);
    event PostListed(uint postId, uint price);
    event PostSold(uint postId, address buyer, uint price);

    constructor() ERC721("FairNet", "FNET") {}

    // --- 1. CREATE POST (Updated) ---
    function createPost(string memory _cid) public {
        uint postId = posts.length;
        
        // Initialize: Author = You, Owner = You
        posts.push(Post(postId, msg.sender, msg.sender, _cid, block.timestamp, false, 0, false));
        
        emit PostCreated(postId, msg.sender, _cid, block.timestamp);
    }

    // --- 2. GET ALL POSTS (Kept Safe) ---
    function getAllPosts() public view returns (Post[] memory) {
        return posts;
    }

    // --- 3. FOLLOW USER (Kept Safe) ---
    function followUser(address _userToFollow) public {
        require(_userToFollow != msg.sender, "Cannot follow yourself");
        following[msg.sender].push(_userToFollow);
        emit UserFollowed(msg.sender, _userToFollow);
    }

    // --- 4. GET FOLLOWING (Kept Safe) ---
    function getMyFollowing() public view returns (address[] memory) {
        return following[msg.sender];
    }

    // --- 5. MINT NFT (Kept Safe) ---
    function mintPost(uint _postId) public returns (uint256) {
        require(_postId < posts.length, "Post does not exist");
        // Only the ORIGINAL AUTHOR can mint
        require(posts[_postId].author == msg.sender, "Only the author can mint this");
        require(!posts[_postId].isMinted, "Post already minted");

        _nextTokenId++;
        uint256 newItemId = _nextTokenId;

        _mint(msg.sender, newItemId);
        _setTokenURI(newItemId, posts[_postId].cid);

        posts[_postId].isMinted = true;
        postToTokenId[_postId] = newItemId;

        emit PostMinted(_postId, newItemId, msg.sender);

        return newItemId;
    }

    // --- 6. LIST FOR SALE (Updated check) ---
    function listNft(uint _postId, uint _price) public {
        require(posts[_postId].isMinted, "Must be minted first");
        // Check if the caller is the CURRENT OWNER
        require(posts[_postId].owner == msg.sender, "You don't own this NFT");
        require(_price > 0, "Price must be greater than 0");

        posts[_postId].price = _price;
        posts[_postId].forSale = true;

        emit PostListed(_postId, _price);
    }

    // --- 7. BUY NFT (Fixed Logic) ---
    function buyNft(uint _postId) public payable {
        require(posts[_postId].forSale, "Item not for sale");
        require(msg.value >= posts[_postId].price, "Not enough ETH sent");
        
        // Get the current seller from our struct
        address seller = posts[_postId].owner;
        require(seller != msg.sender, "You already own this!");

        // A. Transfer NFT: Seller -> Buyer
        uint tokenId = postToTokenId[_postId];
        _transfer(seller, msg.sender, tokenId);

        // B. Pay the Seller
        payable(seller).transfer(msg.value);

        // C. Update the Post Status
        posts[_postId].forSale = false;
        
        // CRITICAL FIX: Update OWNER, keeping AUTHOR the same
        posts[_postId].owner = msg.sender; 

        emit PostSold(_postId, msg.sender, posts[_postId].price);
    }
}