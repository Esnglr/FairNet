import React, {useState} from 'react';
import '../style.css';
import { Link } from 'react-router-dom';

// 1. ADD 'mintNft' TO PROPS
const Feed = ({ posts, createPost, postContent, setPostContent, followUser, following, account, mintNft }) => {
    const [file, setFile] = useState(null);
    
    return (
    <div className="middle">
      <form className="create-post" onSubmit={(e) => {
        e.preventDefault(); // Prevent page refresh
        createPost(e, file);
        setFile(null)
      }}>
        <div className="profile-photo">
           <img src="https://ui-avatars.com/api/?name=You&background=random" alt="profile"/>
        </div>
        <input 
            type="text" 
            placeholder="What's on your mind?" 
            id="create-post" 
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            required
        />
        <input
            type="file"
            accept='image/*'
            onChange={(e) => setFile(e.target.files[0])}
            style={{fontSize: '0.8rem', width: '60%'}}
        />
        <input type="submit" value="Post" className="btn btn-primary" />
      </form>

      <div className="feeds">
        {posts.map((post, index) => {
            // Check if we are already following this author
            const isFollowing = following?.includes(post.author.toLowerCase());
            
            // Check if this post belongs to the current user
            const isMyPost = post.author.toLowerCase() === (account ? account.toLowerCase() : '');

            return (
                <div className="feed" key={index}>
                    <div className="head">
                        <div className="user">
                            <div className="profile-photo">
                                <img src={post.userImage} alt="profile" />
                            </div>
                            <div className="ingo">
                                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                                  
                                  {/* User Name Link */}
                                  <Link to={`/profile/${post.author}`} style={{textDecoration: 'none', color: 'inherit'}}>
                                      <h3 style={{cursor: 'pointer'}}>
                                          {post.author.slice(0,6)}...{post.author.slice(-4)}
                                      </h3>
                                  </Link>                      
                                    
                                  {/* --- FOLLOW BUTTON LOGIC (Your Original Code) --- */}
                                  {isMyPost ? (
                                      null 
                                  ) : isFollowing ? (
                                      <button 
                                          className="btn" 
                                          style={{padding: '2px 10px', fontSize: '0.7rem', background: 'gray', cursor: 'default', color: 'white'}}
                                          disabled
                                      >
                                          Following
                                      </button>
                                  ) : (
                                      <button 
                                          className="btn btn-primary" 
                                          style={{padding: '2px 10px', fontSize: '0.7rem', height: 'fit-content'}}
                                          onClick={() => followUser(post.author)}
                                      >
                                          Follow
                                      </button>
                                  )}

                                  {/* --- NEW: MINT BUTTON LOGIC (Day 2 Addition) --- */}
                                  {/* Only show this button if it IS my post */}
                                  {isMyPost && (
                                      !post.isMinted ? (
                                          <button 
                                              className="btn" 
                                              style={{
                                                  marginLeft: '5px', 
                                                  background: 'linear-gradient(45deg, #FFD700, #FFA500)', 
                                                  color: 'black', 
                                                  border: 'none',
                                                  padding: '2px 10px',
                                                  fontSize: '0.7rem',
                                                  fontWeight: 'bold',
                                                  cursor: 'pointer',
                                                  borderRadius: '20px'
                                              }}
                                              onClick={() => mintNft(post.id)}
                                          >
                                              💎 Mint NFT
                                          </button>
                                      ) : (
                                          <span style={{
                                              marginLeft: '5px', 
                                              fontSize: '0.7rem', 
                                              background: '#f0f0f0', 
                                              padding: '2px 8px', 
                                              borderRadius: '10px',
                                              color: '#555',
                                              border: '1px solid #ddd'
                                          }}>
                                              ✅ Verified NFT
                                          </span>
                                      )
                                  )}

                                </div>
                                <small>{new Date(post.timestamp).toLocaleString()}</small>
                            </div>
                        </div>
                    </div>
                    <div className="content">
                        <p>{post.content}</p>
                        {post.image && (
                            <div style={{marginTop: '10px', borderRadius: '10px', overflow: 'hidden'}}>
                                <img
                                    src={post.image}
                                    alt="Post content"
                                    style={{width: '100%', borderRadius: '10px'}}
                                />
                            </div>
                        )}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default Feed;