// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract Cid {
    struct Post {
        uint id;
        address author;
        string cid;
        uint timestamp;
    }

    Post[] public posts;
    
    // NEW: Mapping to store who follows whom
    // Key: User Address -> Value: List of people they follow
    mapping(address => address[]) public following;

    function createPost(string memory _cid) public {
        posts.push(Post(posts.length, msg.sender, _cid, block.timestamp));
    }

    function getAllPosts() public view returns (Post[] memory) {
        return posts;
    }

    // NEW: Function to follow a user
    function followUser(address _userToFollow) public {
        require(_userToFollow != msg.sender, "You cannot follow yourself");
        following[msg.sender].push(_userToFollow);
    }

    // NEW: Function to check who I am following
    function getMyFollowing() public view returns (address[] memory) {
        return following[msg.sender];
    }
}