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
        uint tipAmount;
        bool isPremium; 
    }

    Post[] public posts;
    mapping(address => address[]) public following;
    mapping(uint => uint) public postToTokenId; 
    mapping(address => string) public profiles;
    
    // --- UPDATED: GATED CONTENT STORAGE ---
    mapping(uint => string) private lockedCids;
    
    // --- UPDATED: SUBSCRIPTION MAPPING ---
    // Mapping: Subscriber Address => Author Address => Is Subscribed?
    mapping(address => mapping(address => bool)) public subscribers;

    // Events
    event PostCreated(uint postId, address author, string cid, uint timestamp);
    event PostMinted(uint postId, uint tokenId, address owner);
    event PostListed(uint postId, uint price);
    event PostSold(uint postId, address buyer, uint price);
    event UserFollowed(address follower, address followed);
    event ProfileUpdated(address indexed user, string cid);
    event PostTipped(uint postId, address from, address receiver, uint amount);
    
    // --- UPDATED EVENT ---
    event NewSubscriber(address subscriber, address author, uint amount);

    constructor() ERC721("FairNet", "FNET") {}

    function createPost(string memory _cid, bool _isPremium) public {
        uint postId = posts.length;
        
        if (_isPremium) {
            lockedCids[postId] = _cid;
            // Store "LOCKED" publicly
            posts.push(Post(postId, msg.sender, msg.sender, "LOCKED", block.timestamp, false, 0, false, 0, true));
        } else {
            posts.push(Post(postId, msg.sender, msg.sender, _cid, block.timestamp, false, 0, false, 0, false));
        }

        emit PostCreated(postId, msg.sender, _cid, block.timestamp);
    }

    // --- NEW: Subscribe to a Specific Author ---
    function subscribeToAuthor(address _author) public payable {
        require(msg.value >= 0.01 ether, "Subscription cost: 0.01 ETH");
        require(_author != msg.sender, "Cannot subscribe to yourself");
        
        // 1. Pay the Author directly! (100% goes to creator)
        payable(_author).transfer(msg.value);
        
        // 2. Mark as subscriber
        subscribers[msg.sender][_author] = true;
        
        emit NewSubscriber(msg.sender, _author, msg.value);
    }

    // --- UPDATED: Access Control ---
    function unlockPost(uint _postId) public view returns (string memory) {
        require(posts[_postId].isPremium, "Not a premium post");
        
        address author = posts[_postId].author;

        // Access Rule: You must be the Author OR a Subscriber of that Author
        require(
            msg.sender == author || subscribers[msg.sender][author], 
            "Access Denied: Subscribe to this author to view"
        );
        
        return lockedCids[_postId];
    }
    
    // --- NEW: Helper to check if I am subscribed to someone ---
    function amISubscribed(address _author) public view returns (bool) {
        return subscribers[msg.sender][_author];
    }

    // ... (Keep the rest of the functions: tipPost, mintPost, listNft, buyNft, etc. unchanged) ...
    
    function tipPost(uint _postId) public payable {
        require(_postId < posts.length, "Post does not exist");
        require(msg.value > 0, "Tip must be greater than 0");
        address payable receiver = payable(posts[_postId].owner);
        receiver.transfer(msg.value);
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
        string memory finalCid = posts[_postId].isPremium ? lockedCids[_postId] : posts[_postId].cid;
        _setTokenURI(newItemId, finalCid);
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

    function setProfile(string memory _cid) public {
        profiles[msg.sender] = _cid;
        emit ProfileUpdated(msg.sender, _cid);
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