import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom'; // Link ve useParams ekledik
import { ethers } from 'ethers'; 
import '../style.css';

const Profile = ({ posts, account, following }) => {
  const { userAddress } = useParams(); // URL'deki adresi yakala (varsa)
  
  // EĞER URL'de adres varsa onu kullan, YOKSA giriş yapmış kişiyi (account) kullan
  // Büyük/küçük harf duyarlılığı olmasın diye lowercase yapıyoruz
  const targetAddress = userAddress ? userAddress.toLowerCase() : (account ? account.toLowerCase() : null);

  const [balance, setBalance] = useState('Loading...');

  // Bakiye Çekme (Hedefteki kişinin bakiyesi)
  useEffect(() => {
    const getBalance = async () => {
      if (targetAddress && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const balanceWei = await provider.getBalance(targetAddress);
          const balanceEth = ethers.formatEther(balanceWei); 
          setBalance(parseFloat(balanceEth).toFixed(4)); 
        } catch (err) {
          console.error("Bakiye hatası:", err);
          setBalance("Hidden");
        }
      }
    };
    getBalance();
  }, [targetAddress]);

  if (!targetAddress) return <div className="middle"><h3>Lütfen cüzdan bağlayın.</h3></div>;

  // Sadece HEDEF KİŞİNİN postlarını filtrele
  const profilePosts = posts.filter(post => 
    post.author && post.author.toLowerCase() === targetAddress
  );

  // Bu profil benim mi?
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
                <p className="text-muted">
                    {targetAddress}
                </p>
                
                <div style={{marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '40px'}}>
                    <div style={{textAlign: 'center'}}>
                        <h5 className="text-muted">Posts</h5>
                        <h4 style={{color: 'var(--color-dark)'}}>{profilePosts.length}</h4>
                    </div>
                    <div style={{textAlign: 'center'}}>
                        <h5 className="text-muted">Balance</h5>
                        <h4 style={{color: 'var(--color-primary)'}}>{balance} ETH</h4> 
                    </div>
                </div>
            </div>
        </div>

        {/* --- POST LIST --- */}
        <h3 style={{marginTop: '20px', marginBottom: '10px', color: 'var(--color-dark)'}}>
            {isMyProfile ? "My Activity" : "User Activity"}
        </h3>
        
        <div className="feeds">
            {profilePosts.length === 0 ? (
                <div className="feed">
                    <div className="content" style={{textAlign: 'center', padding: '30px'}}>
                        <p className="text-muted">No posts yet.</p>
                    </div>
                </div>
            ) : (
                profilePosts.map((post, index) => (
                    <div className="feed" key={index}>
                        <div className="head">
                            <div className="user">
                                <div className="profile-photo">
                                    <img src={post.userImage} alt="profile" />
                                </div>
                                <div className="ingo">
                                    <h3>{isMyProfile ? "You" : "User"}</h3>
                                    <small>{new Date(post.timestamp).toLocaleString()}</small>
                                </div>
                            </div>
                        </div>
                        <div className="content">
                            <p>{post.content}</p>
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* --- FOLLOWING LIST --- */}
        {/* Bu listeyi SADECE kendi profilindeyken gösterelim. 
            Çünkü 'following' verisi şu an sadece SENİN takip ettiklerini içeriyor. 
            Başkasına bakarken senin listeni görmek saçma olur. */}
        
        {isMyProfile && (
            <>
                <h3 style={{marginTop: '30px', marginBottom: '10px', color: 'var(--color-dark)'}}>
                    Following ({following ? [...new Set(following)].length : 0})
                </h3>

                <div className="feeds">
                    {following && following.length > 0 ? (
                        [...new Set(following)].map((userAddr, index) => (
                            // TIKLANABİLİR YAPMAK İÇİN LINK KULLANIYORUZ
                            <Link to={`/profile/${userAddr}`} key={index} style={{textDecoration: 'none', color: 'inherit'}}>
                                <div className="feed" style={{padding: '10px', cursor: 'pointer', transition: 'all 300ms ease'}}>
                                    <div className="user" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <div className="profile-photo" style={{width: '40px', height: '40px'}}>
                                            <img src={`https://ui-avatars.com/api/?name=${userAddr}&background=random`} alt="user" />
                                        </div>
                                        <div>
                                            {/* Adresi biraz kısaltıp gösterelim */}
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