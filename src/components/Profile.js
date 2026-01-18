import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ethers } from 'ethers'; 
import '../style.css';

const Profile = ({ posts, account, following }) => {
  const { userAddress } = useParams(); // URL params
  
  // Determine target address
  const targetAddress = userAddress ? userAddress.toLowerCase() : (account ? account.toLowerCase() : null);

  const [balance, setBalance] = useState('Loading...');
  const [activeTab, setActiveTab] = useState('created'); // 'created' or 'collected'

  // Fetch Balance
  useEffect(() => {
    const getBalance = async () => {
      if (targetAddress && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const balanceWei = await provider.getBalance(targetAddress);
          const balanceEth = ethers.formatEther(balanceWei); 
          setBalance(parseFloat(balanceEth).toFixed(4)); 
        } catch (err) {
          console.error("Balance Error:", err);
          setBalance("Hidden");
        }
      }
    };
    getBalance();
  }, [targetAddress]);

  if (!targetAddress) return <div className="middle"><h3>Please connect wallet.</h3></div>;

  // --- DAY 3 FILTERS ---
  
  // 1. CREATED: Author is target (regardless of who owns it now)
  const createdPosts = posts.filter(post => 
    post.author && post.author.toLowerCase() === targetAddress
  );

  // 2. COLLECTED: Owner is target, BUT Author is NOT target (Bought items)
  // (We check post.owner exists first to be safe)
  const collectedPosts = posts.filter(post => 
    post.owner && 
    post.owner.toLowerCase() === targetAddress && 
    post.author.toLowerCase() !== targetAddress
  );

  // Decide which list to show based on Tab
  const displayPosts = activeTab === 'created' ? createdPosts : collectedPosts;
  const isMyProfile = account && targetAddress === account.toLowerCase();

  return (
    <div className="middle">
        {/* --- PROFILE HEADER --- */}
        <div className="feeds">
            <div className="feed" style={{textAlign: 'center', padding: '30px'}}>
                <div className="profile-photo" style={{width: '100px', height: '100px', margin: '0 auto'}}>
                    <img 
                        src={`https://ui-avatars.com/api/?name=${targetAddress}&background=random&length=1&bold=true`} 
                        alt="Profile" 
                        style={{width: '100%', height: '100%', borderRadius: '50%'}}
                    />
                </div>
                
                <h2 style={{marginTop: '15px', color: 'var(--color-dark)'}}>
                    {isMyProfile ? "My Profile" : "User Profile"}
                </h2>
                <p className="text-muted" style={{wordBreak: 'break-all', fontSize: '0.8rem'}}>
                    {targetAddress}
                </p>
                
                {/* Stats Row */}
                <div style={{marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '30px'}}>
                    <div style={{textAlign: 'center'}}>
                        <h5 className="text-muted">Created</h5>
                        <h4 style={{color: 'var(--color-dark)'}}>{createdPosts.length}</h4>
                    </div>
                    <div style={{textAlign: 'center'}}>
                        <h5 className="text-muted">Collected</h5>
                        <h4 style={{color: 'var(--color-dark)'}}>{collectedPosts.length}</h4>
                    </div>
                    <div style={{textAlign: 'center'}}>
                        <h5 className="text-muted">Balance</h5>
                        <h4 style={{color: 'var(--color-primary)'}}>{balance} ETH</h4> 
                    </div>
                </div>
            </div>
        </div>

        {/* --- TABS SECTION (New) --- */}
        <div style={{display: 'flex', justifyContent: 'space-around', margin: '20px 0', background: 'var(--color-white)', padding: '10px', borderRadius: 'var(--card-border-radius)'}}>
            <button 
                onClick={() => setActiveTab('created')}
                className="btn"
                style={{
                    background: activeTab === 'created' ? 'var(--color-primary)' : 'transparent',
                    color: activeTab === 'created' ? 'white' : 'var(--color-gray)',
                    width: '45%'
                }}
            >
                🎨 Created
            </button>
            <button 
                onClick={() => setActiveTab('collected')}
                className="btn"
                style={{
                    background: activeTab === 'collected' ? 'var(--color-primary)' : 'transparent',
                    color: activeTab === 'collected' ? 'white' : 'var(--color-gray)',
                    width: '45%'
                }}
            >
                💼 Collected
            </button>
        </div>
        
        {/* --- POST LIST (Based on Active Tab) --- */}
        <div className="feeds">
            {displayPosts.length === 0 ? (
                <div className="feed">
                    <div className="content" style={{textAlign: 'center', padding: '30px'}}>
                        <p className="text-muted">No {activeTab} items found.</p>
                    </div>
                </div>
            ) : (
                displayPosts.map((post, index) => (
                    <div className="feed" key={index}>
                        <div className="head">
                            <div className="user">
                                <div className="profile-photo">
                                    {/* If Collected, show Original Artist's photo. If Created, show Mine. */}
                                    <img src={post.userImage} alt="profile" />
                                </div>
                                <div className="ingo">
                                    <h3 style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                        {post.author.toLowerCase() === targetAddress ? "You" : 
                                         (post.author.slice(0,6) + "...")} 
                                        
                                        {/* BADGES */}
                                        {post.isMinted && <span style={{fontSize:'0.6rem', background:'#eee', padding:'2px 6px', borderRadius:'10px'}}>💎 Minted</span>}
                                        {post.forSale && <span style={{fontSize:'0.6rem', background:'green', color:'white', padding:'2px 6px', borderRadius:'10px'}}>🏷️ {post.price} ETH</span>}
                                    </h3>
                                    
                                    {/* Subtitle logic */}
                                    <small>
                                        {activeTab === 'collected' 
                                            ? <span>✍️ Original Artist: <Link to={`/profile/${post.author}`}>{post.author.substring(0,6)}...</Link></span> 
                                            : new Date(post.timestamp).toLocaleString()
                                        }
                                    </small>
                                </div>
                            </div>
                        </div>

                        <div className="content">
                            <p>{post.content}</p>
                            {post.image && (
                                <div style={{marginTop: '10px', borderRadius: '10px', overflow: 'hidden'}}>
                                    <img src={post.image} alt="content" style={{width: '100%', borderRadius: '10px'}}/>
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* --- FOLLOWING LIST (Only for My Profile) --- */}
        {isMyProfile && (
            <>
                <h3 style={{marginTop: '30px', marginBottom: '10px', color: 'var(--color-dark)'}}>
                    Following ({following ? [...new Set(following)].length : 0})
                </h3>

                <div className="feeds">
                    {following && following.length > 0 ? (
                        [...new Set(following)].map((userAddr, index) => (
                            <Link to={`/profile/${userAddr}`} key={index} style={{textDecoration: 'none', color: 'inherit'}}>
                                <div className="feed" style={{padding: '10px', cursor: 'pointer', transition: 'all 300ms ease'}}>
                                    <div className="user" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <div className="profile-photo" style={{width: '40px', height: '40px'}}>
                                            <img src={`https://ui-avatars.com/api/?name=${userAddr}&background=random`} alt="user" />
                                        </div>
                                        <div>
                                            <h5 style={{color: 'var(--color-dark)'}}>
                                                {userAddr.substring(0, 20)}...
                                            </h5>
                                            <small className="text-muted">View Profile</small>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="feed"><p className="text-muted" style={{padding:'15px'}}>Not following anyone.</p></div>
                    )}
                </div>
            </>
        )}
    </div>
  );
};

export default Profile;