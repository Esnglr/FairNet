// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// 1. Import the NFT Standard
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

// 2. Inherit from ERC721URIStorage (Now it's an NFT contract + Social Network)
contract Cid is ERC721URIStorage {
    
    // Counter for NFT IDs (Simple integer instead of using a library)
    uint256 private _nextTokenId;

    // --- YOUR DATA STRUCTURES (Kept Safe) ---
    struct Post {
        uint id;
        address author;
        string cid;
        uint timestamp;
        bool isMinted;
    }

    Post[] public posts;
    mapping(address => address[]) public following;
    mapping(uint => uint) public postToTokenId; // Maps Post ID -> NFT Token ID

    // --- EVENTS ---
    event PostCreated(uint postId, address author, string cid, uint timestamp);
    event UserFollowed(address follower, address followed);
    event PostMinted(uint postId, uint tokenId, address owner); // New Event for Day 2

    // 3. Constructor: Name your NFT Collection "FairNet"
    constructor() ERC721("FairNet", "FNET") {}

    // --- YOUR ORIGINAL FUNCTIONS ---

    function createPost(string memory _cid) public {
        uint postId = posts.length;
        // Create post with isMinted = false
        posts.push(Post(postId, msg.sender, _cid, block.timestamp, false));
        emit PostCreated(postId, msg.sender, _cid, block.timestamp);
    }

    function getAllPosts() public view returns (Post[] memory) {
        return posts;
    }

    function followUser(address _userToFollow) public {
        require(_userToFollow != msg.sender, "Cannot follow yourself");
        following[msg.sender].push(_userToFollow);
        emit UserFollowed(msg.sender, _userToFollow);
    }

    function getMyFollowing() public view returns (address[] memory) {
        return following[msg.sender];
    }

    // --- NEW: THE MINT FUNCTION (Day 2 Logic) ---
    function mintPost(uint _postId) public returns (uint256) {
        // Validation checks
        require(_postId < posts.length, "Post does not exist");
        require(posts[_postId].author == msg.sender, "Only the author can mint this");
        require(!posts[_postId].isMinted, "Post already minted");

        // 1. Increment Token ID
        _nextTokenId++;
        uint256 newItemId = _nextTokenId;

        // 2. Mint the NFT to the user
        _mint(msg.sender, newItemId);
        
        // 3. Attach the IPFS link to the NFT (This makes the image appear on OpenSea!)
        _setTokenURI(newItemId, posts[_postId].cid);

        // 4. Update the struct so it can't be minted again
        posts[_postId].isMinted = true;
        postToTokenId[_postId] = newItemId;

        emit PostMinted(_postId, newItemId, msg.sender);

        return newItemId;
    }
}