// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract Cid {
    // 1. UPDATED STRUCT: Added 'isMinted' for Day 2
    struct Post {
        uint id;
        address author;
        string cid;
        uint timestamp;
        bool isMinted; // <--- The only change to the struct
    }

    Post[] public posts;
    
    // 2. YOUR ORIGINAL MAPPINGS (Kept exactly as is)
    mapping(address => address[]) public following;
    
    // 3. NEW MAPPINGS (For Day 2 NFT Logic)
    mapping(uint => uint) public postToTokenId;

    // 4. NEW EVENTS (Crucial for a responsive Frontend)
    event PostCreated(uint postId, address author, string cid, uint timestamp);
    event UserFollowed(address follower, address followed);

    // 5. CREATE POST (Updated to set isMinted = false)
    function createPost(string memory _cid) public {
        uint postId = posts.length;
        
        // We push 'false' at the end because it's not an NFT yet
        posts.push(Post(postId, msg.sender, _cid, block.timestamp, false));
        
        // Emit event so frontend sees it instantly
        emit PostCreated(postId, msg.sender, _cid, block.timestamp);
    }

    // 6. GET ALL POSTS (Kept exactly as is)
    function getAllPosts() public view returns (Post[] memory) {
        return posts;
    }

    // 7. FOLLOW USER (Kept exactly as is, added Event)
    function followUser(address _userToFollow) public {
        require(_userToFollow != msg.sender, "You cannot follow yourself");
        
        // Check if already following (Optional optimization, but let's keep your logic simple)
        following[msg.sender].push(_userToFollow);
        
        emit UserFollowed(msg.sender, _userToFollow);
    }

    // 8. GET FOLLOWING (Kept exactly as is)
    function getMyFollowing() public view returns (address[] memory) {
        return following[msg.sender];
    }
}