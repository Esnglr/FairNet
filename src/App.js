import React, { useState, useEffect } from 'react';
import { create } from 'ipfs-http-client';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ethers } from 'ethers'; 
import './style.css';
import contractABI from './contractABI.json'; 
import Login from './components/Login'; 

// Components
import Feed from './components/Feed';
import Profile from './components/Profile';

// 1. IPFS Configuration
const ipfsClient = create({ url: 'http://127.0.0.1:5001/api/v0' });

// 2. Blockchain Configuration
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 

function App() {
  const [postContent, setPostContent] = useState('');
  const [posts, setPosts] = useState([]);
  const [account, setAccount] = useState(null); 
  const [status, setStatus] = useState('Not Connected');
  
  // NEW: State to hold the list of people I follow
  const [following, setFollowing] = useState([]); 

  useEffect(() => {
    checkIfWalletIsConnected();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        window.location.reload();
      });
    }
  }, []);

  const checkIfWalletIsConnected = async () => {
    if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            connectWallet();
        }
    }
  }

  // 3. Connect to MetaMask
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        setAccount(address);
        setStatus('Wallet Connected');
        
        loadBlockchainPosts(provider);
        // NEW: Load following list immediately upon connection
        loadFollowing(provider);

      } catch (error) {
        console.error("Wallet connection failed", error);
        setStatus("Connect Wallet Failed");
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  // 4. Load Posts
  const loadBlockchainPosts = async (provider) => {
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
      const data = await contract.getAllPosts();
      const loadedPosts = [];

      for (const item of data) {
        const cid = item.cid;
        try {
            const stream = ipfsClient.cat(cid);
            let contentData = '';
            for await (const chunk of stream) {
                contentData += new TextDecoder().decode(chunk);
            }
            const jsonContent = JSON.parse(contentData);

            loadedPosts.push({
                cid: cid,
                author: item.author,
                timestamp: new Date(Number(item.timestamp) * 1000).toISOString(),
                content: jsonContent.content,
                userImage: "https://ui-avatars.com/api/?name=" + item.author + "&background=random"
            });
        } catch (e) {
            console.error("Error fetching IPFS content for CID:", cid);
        }
      }
      setPosts(loadedPosts.reverse());
    } catch (error) {
      console.error("Error loading blockchain posts:", error);
    }
  };

  // NEW FUNCTION: Load Following List
  const loadFollowing = async (provider) => {
try {
        // HATA BURADAYDI: Provider yerine Signer kullanmalıyız
        // Çünkü 'getMyFollowing' fonksiyonu 'msg.sender'ı kullanıyor.
        const signer = await provider.getSigner(); 
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
        
        const followingList = await contract.getMyFollowing();
        
        // Adresleri küçük harfe çevir
        const formattedList = followingList.map(addr => addr.toLowerCase());
        setFollowing(formattedList);
        
        console.log("BLOCKCHAIN'DEN GELEN TAKİP LİSTESİ:", formattedList);
    } catch (error) {
        console.error("Takip listesi yüklenirken hata:", error);
    }
  };

  // 5. Create Post
  const createPost = async (e) => {
    e.preventDefault();
    if (!postContent || !account) return;

    try {
      setStatus("Uploading to IPFS...");
      const newPostJson = { content: postContent };
      const { cid } = await ipfsClient.add(JSON.stringify(newPostJson));
      const cidString = cid.toString();
      
      setStatus("Waiting for Wallet Signature...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      const tx = await contract.createPost(cidString);
      setStatus("Mining Transaction...");
      await tx.wait(); 

      setStatus("Post Published!");
      setPostContent('');
      loadBlockchainPosts(provider);

    } catch (error) {
      console.error('Error creating post:', error);
      setStatus('Transaction Failed');
    }
  };

  // 6. Follow User
  const followUser = async (authorAddress) => {
    if (!account) return;
    try {
      setStatus("Following user...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      const tx = await contract.followUser(authorAddress);
      setStatus("Mining Transaction...");
      await tx.wait();
      
      setStatus(`Now following ${authorAddress.slice(0,6)}!`);
      
      // NEW: Reload the list so the UI updates immediately
      loadFollowing(provider);

    } catch (error) {
      console.error("Error following user:", error);
      setStatus("Transaction Failed (Already following?)");
    }
  };

  // Login Gate
  if (!account) {
    return <Login connectWallet={connectWallet} />;
  }

  return (
    <Router>
      <div className="App">
        <nav>
          <div className="container nav-container">
            <h2 className="logo">FairNet</h2>
            <div className="create">
              <button className="btn btn-primary">
                  {account ? account.slice(0,6) + "..." + account.slice(-4) : "Connect Wallet"}
              </button>
            </div>
          </div>
        </nav>

        <main>
          <div className="container">
            <div className="left">
               <div className="sidebar">
                <Link to="/" className="menu-item">
                  <span><i className="fa-solid fa-house"></i></span><h3>Home</h3>
                </Link>
                <Link to="/profile" className="menu-item">
                  <span><i className="fa-solid fa-user"></i></span><h3>Profile</h3>
                </Link>
               </div>
            </div>

            <Routes>
              {/* NEW: Passing 'following' prop to Feed */}
              <Route path="/" element={
                <Feed 
                  posts={posts} 
                  createPost={createPost} 
                  postContent={postContent} 
                  setPostContent={setPostContent} 
                  followUser={followUser}
                  following={following} 
                  account={account}
                />
              } />
              
              {/* NEW: Passing 'following' prop to Profile */}
              <Route path="/profile" element={
                <Profile 
                    posts={posts} 
                    account={account} 
                    following={following} 
                />
              } />

              {/* 2. /profile/0x... ise -> Başkasının profili */}
              <Route path="/profile/:userAddress" element={
                <Profile posts={posts} account={account} following={following} />
              } />
            </Routes>

            <div className="right">
                <div className="messages">
                    <div className="heading"><h4>Status</h4></div>
                    <p className="text-muted">{status}</p>
                </div>
            </div>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;