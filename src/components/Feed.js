import React from 'react';
import '../style.css';
import { Link } from 'react-router-dom';

// Added 'following' to props
const Feed = ({ posts, createPost, postContent, setPostContent, followUser, following, account}) => {
  return (
    <div className="middle">
      <form className="create-post" onSubmit={createPost}>
        <div className="profile-photo">
           <img src="https://ui-avatars.com/api/?name=You&background=random" alt="profile"/>
        </div>
        <input 
            type="text" 
            placeholder="What's on your mind?" 
            id="create-post" 
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
        />
        <input type="submit" value="Post" className="btn btn-primary" />
      </form>

      <div className="feeds">
        {posts.map((post, index) => {
            // Check if we are already following this author
            // We use optional chaining (?.) and default to empty array [] just in case
            const isFollowing = following?.includes(post.author.toLowerCase());

            return (
                <div className="feed" key={index}>
                    <div className="head">
                        <div className="user">
                            <div className="profile-photo">
                                <img src={post.userImage} alt="profile" />
                            </div>
                            <div className="ingo">
                                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                                  {/* İsim Tıklanabilir Olsun */}
                                      <Link to={`/profile/${post.author}`} style={{textDecoration: 'none', color: 'inherit'}}>
                                          <h3 style={{cursor: 'pointer'}}>
                                              {post.author.slice(0,6)}...{post.author.slice(-4)}
                                          </h3>
                                      </Link>                                    
                                    {/* LOGIC: If following, show Gray button. If not, show Blue button. */}
                                    {post.author.toLowerCase() === account.toLowerCase() ? (
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
                                </div>
                                <small>{new Date(post.timestamp).toLocaleString()}</small>
                            </div>
                        </div>
                    </div>
                    <div className="content">
                        <p>{post.content}</p>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default Feed;