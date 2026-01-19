import React, {useState} from 'react';
import '../style.css';
import { Link } from 'react-router-dom';

// 1. UPDATED PROPS: Added 'tipPost' to the list
const Feed = ({ posts, createPost, postContent, setPostContent, followUser, following, account, mintNft, listNft, buyNft, usernames, tipPost}) => {
    const [file, setFile] = useState(null);
    const [sellPrice, setSellPrice] = useState({});
    
    return (
    <div className="middle">
      <form className="create-post" onSubmit={(e) => {
        e.preventDefault(); // Prevent page refresh
        createPost(e, file);
        setFile(null)
      }}>
        <div className="profile-photo">
           {/* Update "You" avatar to use your own name if set */}
           <img src={`https://ui-avatars.com/api/?name=${usernames && account && usernames[account.toLowerCase()] ? usernames[account.toLowerCase()] : "You"}&background=random`} alt="profile"/>
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

            // --- NAME LOOKUP LOGIC ---
            // If name exists in dictionary, use it. Otherwise, truncate address.
            const authorName = usernames && usernames[post.author.toLowerCase()] 
                ? usernames[post.author.toLowerCase()] 
                : `${post.author.slice(0,6)}...${post.author.slice(-4)}`;

            return (
                <div className="feed" key={index}>
                    <div className="head">
                        <div className="user">
                            <div className="profile-photo">
                                <img src={post.userImage} alt="profile" />
                            </div>
                            <div className="ingo">
                                {/* Added flexWrap to prevent buttons from squishing on small screens */}
                                <div style={{display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'}}>
                                  
                                  {/* 1. NAME LINK */}
                                  <Link to={`/profile/${post.author}`} style={{textDecoration: 'none', color: 'inherit'}}>
                                      <h3 style={{cursor: 'pointer'}}>
                                          {authorName}
                                      </h3>
                                  </Link>                      
                                    
                                  {/* 2. FOLLOW BUTTON */}
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

                                  {/* 3. MARKETPLACE BUTTONS (Mint/Sell/Buy) */}
                                  {isMyPost && (
                                      !post.isMinted ? (
                                          // Not Minted -> Show Mint Button
                                          <button className="btn" style={{background: 'gold', color:'black', marginLeft:'5px', border:'none', fontSize:'0.7rem', padding:'3px 10px', borderRadius:'15px', cursor:'pointer'}} 
                                              onClick={() => mintNft(post.id)}>
                                              💎 Mint NFT
                                          </button>
                                      ) : (
                                          // Minted -> Check if For Sale
                                          !post.forSale ? (
                                              <div style={{display:'inline-flex', marginLeft:'5px', gap:'5px', alignItems:'center'}}>
                                                  <input 
                                                      type="number" 
                                                      placeholder="ETH" 
                                                      style={{width:'50px', padding:'2px', fontSize:'0.7rem', border:'1px solid #ccc', borderRadius:'5px'}}
                                                      onChange={(e) => setSellPrice({...sellPrice, [post.id]: e.target.value})}
                                                  />
                                                  <button className="btn btn-primary" style={{fontSize:'0.7rem', padding:'2px 8px', height:'fit-content'}}
                                                      onClick={() => listNft(post.id, sellPrice[post.id])}>
                                                      Sell
                                                  </button>
                                              </div>
                                          ) : (
                                              <span style={{marginLeft:'5px', background:'#eee', padding:'2px 8px', borderRadius:'10px', fontSize:'0.7rem', border:'1px solid #ddd'}}>
                                                  🏷️ For Sale: {post.price} ETH
                                              </span>
                                          )
                                      )
                                  )}

                                  {/* CASE 2: I am NOT the owner */}
                                  {!isMyPost && post.forSale && (
                                      <button className="btn btn-primary" 
                                          style={{marginLeft:'5px', background:'green', border:'none', fontSize:'0.7rem', padding:'3px 10px'}}
                                          onClick={() => buyNft(post.id, post.price)}>
                                          Buy for {post.price} ETH
                                      </button>
                                  )}
                                  
                                  {/* 4. NEW: LIKE / TIP BUTTON (Added Here) */}
                                  <button 
                                      className="btn"
                                      style={{
                                          marginLeft: '5px',
                                          background: 'transparent', 
                                          color: '#ff4b4b', 
                                          border: '1px solid #ff4b4b',
                                          padding: '2px 10px',
                                          borderRadius: '20px',
                                          cursor: 'pointer',
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: '5px',
                                          fontSize: '0.7rem'
                                      }}
                                      onClick={() => tipPost(post.id)}
                                  >
                                      ❤️ Like (0.01)
                                      {/* Show Total Earnings if > 0 */}
                                      {post.tipAmount && parseFloat(post.tipAmount) > 0 && (
                                          <span style={{background: '#ff4b4b', color: 'white', padding: '0px 4px', borderRadius: '50%', fontSize: '0.6rem'}}>
                                              {/* Divide by 0.01 to get the count of clicks */}
                                              {Math.round(parseFloat(post.tipAmount) / 0.01)} 
                                          </span>
                                      )}
                                  </button>

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