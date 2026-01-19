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

// ⚠️ MAKE SURE THIS MATCHES YOUR LATEST DEPLOYMENT
const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

function App() {
  const [postContent, setPostContent] = useState('');
  const [posts, setPosts] = useState([]);
  const [account, setAccount] = useState(null); 
  const [status, setStatus] = useState('Not Connected');
  
  // Stores the mapping: Address -> Name
  const [usernames, setUsernames] = useState({}); 

  const [following, setFollowing] = useState([]); 

  useEffect(() => {
    checkIfWalletIsConnected();
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

  const switchHardhatNetwork = async () => {
    const chainId = "0x7A69"; 
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainId }],
      });
    } catch (error) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: chainId,
                chainName: "Hardhat Localhost Fix",
                rpcUrls: ["http://127.0.0.1:8545"],
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
              },
            ],
          });
        } catch (addError) {
          console.error("Ağ eklenemedi:", addError);
        }
      } else {
        console.error("Ağ değiştirilemedi:", error);
      }
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        await switchHardhatNetwork();
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        setAccount(address);
        setStatus('Wallet Connected');
        
        loadBlockchainPosts();
        loadFollowing(provider);

      } catch (error) {
        console.error("Wallet connection failed", error);
        setStatus("Connect Wallet Failed");
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

// --- UPDATED: LOAD POSTS (Fixes the "Name not showing" bug) ---
  const loadBlockchainPosts = async () => {
    try {
      const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
      
      const allPosts = await contract.getAllPosts();
      
      // --- FIX: ALWAYS FETCH MY OWN NAME ---
      const authorsToFetch = allPosts.map(p => p.author);
      
      // If wallet is connected, add MYSELF to the list
      // (This ensures my name loads even if I have 0 posts)
      if (window.ethereum) {
          try {
             const browserProvider = new ethers.BrowserProvider(window.ethereum);
             const signer = await browserProvider.getSigner();
             const myAddress = await signer.getAddress();
             authorsToFetch.push(myAddress);
          } catch (e) { 
             console.warn("Could not get local account for name fetch"); 
          }
      }
      
      const uniqueAuthors = [...new Set(authorsToFetch)];
      // -------------------------------------

      const names = {};
      
      // Fetch names in parallel
      await Promise.all(uniqueAuthors.map(async (addr) => {
          try {
              const name = await contract.usernames(addr);
              names[addr.toLowerCase()] = name || addr; 
          } catch (e) {
              names[addr.toLowerCase()] = addr;
          }
      }));
      setUsernames(names); // Update State

      // 2. Load Following
      let myFollowing = [];
      if (window.ethereum) {
          try {
             const browserProvider = new ethers.BrowserProvider(window.ethereum);
             const signer = await browserProvider.getSigner();
             const signedContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
             const rawFollowing = await signedContract.getMyFollowing();
             myFollowing = rawFollowing.map(addr => addr.toLowerCase());
          } catch (err) {
             console.warn("Following list error:", err);
          }
      }
      setFollowing(myFollowing);

      const loadedPosts = [];

      for (let i = allPosts.length - 1; i >= 0; i--) {
        const item = allPosts[i];
        
        try {
          const response = await fetch(`http://127.0.0.1:8080/ipfs/${item.cid}`);
          if (!response.ok) throw new Error("IPFS Fetch failed");
          const jsonContent = await response.json();

          // Get name for avatar generation
          const displayName = names[item.author.toLowerCase()] || item.author;

          loadedPosts.push({
            id: Number(item.id),
            cid: item.cid,
            author: item.author,
            owner: item.owner, 
            timestamp: new Date(Number(item.timestamp) * 1000).toISOString(),
            content: jsonContent.description || jsonContent.content || "No Text",
            image: jsonContent.image || null,
            userImage: "https://ui-avatars.com/api/?name=" + displayName + "&background=random",
            isMinted: item.isMinted,
            price: ethers.formatEther(item.price),
            forSale: item.forSale
          });
        } catch (error) {
          console.error("Error loading post:", item.cid, error);
        }
      }

      setPosts(loadedPosts);
      
    } catch (error) {
      console.error("Blockchain Load Error:", error);
    }
  };

  const loadFollowing = async (provider) => {
    try {
        const signer = await provider.getSigner(); 
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
        const followingList = await contract.getMyFollowing();
        const formattedList = followingList.map(addr => addr.toLowerCase());
        setFollowing(formattedList);
    } catch (error) {
        console.error("Error loading following:", error);
    }
  };

// --- UPDATED: ROBUST NAME UPDATE ---
  const updateProfileName = async (newName) => {
    try {
      setStatus("Updating Profile Name...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
      
      const tx = await contract.setUsername(newName);
      
      setStatus("Mining... Please wait ⏳");
      await tx.wait(); // Wait for block to be mined
      
      setStatus("Name Updated! 👤");

      // --- THE FIX: WAIT 2 SECONDS BEFORE RELOADING ---
      // This gives the node time to index the new data
      setTimeout(() => {
        loadBlockchainPosts(); 
      }, 2000);

    } catch (error) {
      console.error(error);
      // specific error handling for user rejection
      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
          setStatus("Transaction Cancelled ❌");
      } else {
          setStatus("Failed to update name");
      }
    }
  };

  const createPost = async (e, file) => {
    e.preventDefault();
    if (!account) return alert("Please connect wallet");
    if (!postContent && !file) return;

    try {
      setStatus("Uploading to IPFS...");
      let imageCid = null;
      if (file){
        const added = await ipfsClient.add(file);
        imageCid = `https://ipfs.io/ipfs/${added.path}`;
      }

      const metadata = {
        name: "FairNet Post",
        description: postContent,
        image: imageCid,
        attributes: [
          {trait_type: "Author", value: account},
          {trait_type: "Timestamp", value: new Date().toISOString()}
        ]
      };

      const metadataResult = await ipfsClient.add(JSON.stringify(metadata));
      const finalCid = metadataResult.path;

      setStatus("Waiting for Wallet Signature...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      const tx = await contract.createPost(finalCid);
      
      setStatus("Mining Transaction...");
      await tx.wait(); 

      setStatus("Post Published!");
      setPostContent(''); 
      loadBlockchainPosts();

    } catch (error) {
      console.error('Error creating post:', error);
      setStatus('Transaction Failed');
    }
  };

  const mintNft = async (postId) => {
    try {
      if (!account) return alert("Please connect wallet first");
      setStatus("Minting NFT... 🦊");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      const tx = await contract.mintPost(postId);
      setStatus("Waiting for confirmation... ⏳");
      await tx.wait();

      setStatus("NFT Minted Successfully! 💎");
      loadBlockchainPosts();
    } catch (error) {
      console.error("Minting failed:", error);
      setStatus("Minting Failed ❌");
    }
  };

  const listNft = async (postId, priceInEth) => {
    try {
      if (!priceInEth) return alert("Please enter a price");
      setStatus("Listing NFT for sale...");
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
      const priceInWei = ethers.parseEther(priceInEth);
      
      const tx = await contract.listNft(postId, priceInWei);
      await tx.wait();
      
      setStatus("NFT Listed for Sale! 💰");
      loadBlockchainPosts();
    } catch (error) {
      console.error("Listing failed", error);
      setStatus("Listing Failed");
    }
  };

  const buyNft = async (postId, priceInEth) => {
    try {
      setStatus("Buying NFT... 💳");
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
      const priceInWei = ethers.parseEther(priceInEth);

      const tx = await contract.buyNft(postId, { value: priceInWei });
      await tx.wait();
      
      setStatus("NFT Purchased! 🚀");
      loadBlockchainPosts();
    } catch (error) {
      console.error("Purchase failed", error);
      setStatus("Purchase Failed");
    }
  };

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
      
      setStatus(`Now following user!`);
      const providerRead = new ethers.BrowserProvider(window.ethereum);
      loadFollowing(providerRead);

    } catch (error) {
      console.error("Error following user:", error);
      setStatus("Transaction Failed");
    }
  };

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
                  {/* Display Name if exists, otherwise address */}
                  {usernames[account.toLowerCase()] 
                    ? usernames[account.toLowerCase()] 
                    : account.slice(0,6) + "..." + account.slice(-4)}
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
                {/* Updated Link to go to My Profile specifically */}
                <Link to={`/profile/${account}`} className="menu-item">
                  <span><i className="fa-solid fa-user"></i></span><h3>Profile</h3>
                </Link>
               </div>
            </div>

            <Routes>
              <Route path="/" element={
                <Feed 
                  posts={posts} 
                  createPost={createPost} 
                  postContent={postContent} 
                  setPostContent={setPostContent} 
                  followUser={followUser}
                  following={following} 
                  account={account}
                  mintNft={mintNft}
                  listNft={listNft}
                  buyNft={buyNft}
                  usernames={usernames} // <-- Passed here
                />
              } />
              
              {/* Dynamic Profile Route for Everyone (Including Me) */}
              <Route path="/profile/:address" element={
                <Profile 
                    posts={posts} 
                    account={account} 
                    following={following} 
                    usernames={usernames}           // <-- Passed here
                    updateProfileName={updateProfileName} // <-- Passed here
                />
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