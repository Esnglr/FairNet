// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract Cid is ERC721URIStorage {
    uint256 private _nextTokenId;

    struct Post {
        uint id;
        address author;
        address owner;
        string cid;
        uint timestamp;
        bool isMinted;
        uint price;
        bool forSale;
        // --- NEW: TIPPING FIELD ---
        uint tipAmount; // Tracks total earnings
    }

    Post[] public posts;
    mapping(address => address[]) public following;
    mapping(uint => uint) public postToTokenId; 
    mapping(address => string) public usernames; 

    // Events
    event PostCreated(uint postId, address author, string cid, uint timestamp);
    event PostMinted(uint postId, uint tokenId, address owner);
    event PostListed(uint postId, uint price);
    event PostSold(uint postId, address buyer, uint price);
    event UserFollowed(address follower, address followed);
    event UsernameSet(address indexed user, string newName);
    
    // --- NEW EVENT ---
    event PostTipped(uint postId, address from, address receiver, uint amount);

    constructor() ERC721("FairNet", "FNET") {}

    function createPost(string memory _cid) public {
        uint postId = posts.length;
        // Initialize tipAmount (last argument) to 0
        posts.push(Post(postId, msg.sender, msg.sender, _cid, block.timestamp, false, 0, false, 0));
        emit PostCreated(postId, msg.sender, _cid, block.timestamp);
    }

    // --- NEW: TIP FUNCTION ---
    function tipPost(uint _postId) public payable {
        require(_postId < posts.length, "Post does not exist");
        require(msg.value > 0, "Tip must be greater than 0");

        // 1. Identify the current owner (The person holding the NFT gets the money)
        address payable receiver = payable(posts[_postId].owner);
        
        // 2. Send ETH
        receiver.transfer(msg.value);

        // 3. Update Stats
        posts[_postId].tipAmount += msg.value;

        emit PostTipped(_postId, msg.sender, receiver, msg.value);
    }

    function mintPost(uint _postId) public returns (uint256) {
        require(_postId < posts.length, "Post does not exist");
        require(posts[_postId].author == msg.sender, "Only author can mint");
        require(!posts[_postId].isMinted, "Already minted");

        _nextTokenId++;
        uint256 newItemId = _nextTokenId;

        _mint(msg.sender, newItemId);
        _setTokenURI(newItemId, posts[_postId].cid);

        posts[_postId].isMinted = true;
        postToTokenId[_postId] = newItemId;

        emit PostMinted(_postId, newItemId, msg.sender);
        return newItemId;
    }

    function listNft(uint _postId, uint _price) public {
        require(posts[_postId].isMinted, "Must be minted first");
        require(posts[_postId].owner == msg.sender, "You don't own this NFT");
        require(_price > 0, "Price > 0");

        posts[_postId].price = _price;
        posts[_postId].forSale = true;
        emit PostListed(_postId, _price);
    }

    function buyNft(uint _postId) public payable {
        require(posts[_postId].forSale, "Not for sale");
        require(msg.value >= posts[_postId].price, "Not enough ETH");
        
        address seller = posts[_postId].owner;
        require(seller != msg.sender, "Already own it");

        uint tokenId = postToTokenId[_postId];
        _transfer(seller, msg.sender, tokenId);

        payable(seller).transfer(msg.value);

        posts[_postId].forSale = false;
        posts[_postId].owner = msg.sender;

        emit PostSold(_postId, msg.sender, posts[_postId].price);
    }

    function setUsername(string memory _name) public {
        usernames[msg.sender] = _name;
        emit UsernameSet(msg.sender, _name);
    }

    function getAllPosts() public view returns (Post[] memory) {
        return posts;
    }
    
    function followUser(address _userToFollow) public {
        following[msg.sender].push(_userToFollow);
        emit UserFollowed(msg.sender, _userToFollow);
    }

    function getMyFollowing() public view returns (address[] memory) {
        return following[msg.sender];
    }
}