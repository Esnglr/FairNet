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
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function App() {
  const [postContent, setPostContent] = useState('');
  const [posts, setPosts] = useState([]);
  const [account, setAccount] = useState(null); 
  const [status, setStatus] = useState('Not Connected');
  
  // NOTE: Removed 'isPremiumUser' state because subscription is now per-author, not global.

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
        
        // Removed global premium check here
        
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

// --- UPDATED: LOAD POSTS WITH SUBSCRIPTION LOGIC ---
  const loadBlockchainPosts = async () => {
    try {
      // 1. Generic Provider for reading public data (names, public posts)
      const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
      
      // 2. Signer Provider for Unlocking (We need this to prove who msg.sender is)
      let signerContract = null;
      if (window.ethereum) {
          try {
             const browserProvider = new ethers.BrowserProvider(window.ethereum);
             const signer = await browserProvider.getSigner();
             signerContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
          } catch (e) {
             console.warn("No signer available for unlocking content");
          }
      }

      const allPosts = await readOnlyContract.getAllPosts();
      
      // --- PART 1: SSI & AVATAR CONSISTENCY ---
      const authorsToFetch = allPosts.map(p => p.author);
      
      // Add myself to ensure my profile loads even if I have 0 posts
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
      const names = {};
      
      // Fetch names in parallel
      await Promise.all(uniqueAuthors.map(async (addr) => {
          try {
              const cid = await readOnlyContract.profiles(addr);
              if (cid) {
                  const res = await fetch(`http://127.0.0.1:8080/ipfs/${cid}`);
                  const data = await res.json();
                  names[addr.toLowerCase()] = {
                      name: data.name,
                      bio: data.bio,
                      avatar: data.avatar 
                  };
              }
          } catch (e) {
              names[addr.toLowerCase()] = { name: addr, bio: "", avatar: null };
          }
      }));
      setUsernames(names);

      // --- PART 2: LOAD FOLLOWING ---
      let myFollowing = [];
      if (signerContract) {
          try {
             const rawFollowing = await signerContract.getMyFollowing();
             myFollowing = rawFollowing.map(addr => addr.toLowerCase());
          } catch (err) {
             console.warn("Following list error:", err);
          }
      }
      setFollowing(myFollowing);


      // --- PART 3: PROCESS POSTS (With Subscription Unlock Logic) ---
      const loadedPosts = [];

      for (let i = allPosts.length - 1; i >= 0; i--) {
          const item = allPosts[i];
          let finalCid = item.cid;
          let isLocked = false;

          // === UNLOCK CHECK ===
          // If the post is marked Premium AND the content is hidden
          if (item.isPremium && item.cid === "LOCKED") {
              if (signerContract) {
                  try {
                      // Try to fetch real CID. 
                      // This will REVERT if user is NOT a subscriber of the author
                      const unlockedCid = await signerContract.unlockPost(item.id);
                      finalCid = unlockedCid;
                      console.log(`🔓 Unlocked Post ${item.id} from ${item.author}`);
                  } catch (err) {
                      isLocked = true; // User is not a subscriber
                  }
              } else {
                  isLocked = true; // No wallet connected
              }
          }

          // === HANDLING LOCKED POSTS ===
          if (isLocked) {
              const authorData = names[item.author.toLowerCase()];
              const authorName = authorData?.name || item.author;
              const authorAvatar = authorData?.avatar;

              loadedPosts.push({
                  id: Number(item.id),
                  cid: "LOCKED",
                  author: item.author,
                  owner: item.owner,
                  timestamp: new Date(Number(item.timestamp) * 1000).toISOString(),
                  content: "🔒 Premium Content. Subscribe to Author to Unlock.", // Placeholder text
                  image: null,
                  userImage: authorAvatar ? authorAvatar : `https://ui-avatars.com/api/?name=${authorName}&background=random`,
                  isMinted: item.isMinted,
                  price: ethers.formatEther(item.price),
                  forSale: item.forSale,
                  tipAmount: ethers.formatEther(item.tipAmount),
                  isPremium: true,
                  isLocked: true // Frontend flag to show the "Subscribe" card
              });
              continue; // Skip the rest of the loop for this item
          }

          // === HANDLING STANDARD / UNLOCKED POSTS ===
          try {
            const response = await fetch(`http://127.0.0.1:8080/ipfs/${finalCid}`);
            if (!response.ok) throw new Error("IPFS Fetch failed");
            const jsonContent = await response.json();
            
            // Cooperatively Pin Content
            try {
              await ipfsClient.pin.add(finalCid);
              if (jsonContent.image) {
                  const imageCid = jsonContent.image.split('/').pop();
                  await ipfsClient.pin.add(imageCid);
              }
            } catch (pinError) {
              console.warn(`Already pinned or pin error: ${finalCid}`);
            }
            
            const authorData = names[item.author.toLowerCase()];
            const authorName = authorData?.name 
                ? authorData.name 
                : (typeof authorData === 'string' ? authorData : item.author);
            const authorAvatar = authorData?.avatar;

            loadedPosts.push({
              id: Number(item.id),
              cid: finalCid, 
              author: item.author,
              owner: item.owner, 
              timestamp: new Date(Number(item.timestamp) * 1000).toISOString(),
              content: jsonContent.description || jsonContent.content || "No Text",
              image: jsonContent.image || null,
              userImage: authorAvatar ? authorAvatar : `https://ui-avatars.com/api/?name=${authorName}&background=random`,
              isMinted: item.isMinted,
              price: ethers.formatEther(item.price),
              forSale: item.forSale,
              tipAmount: ethers.formatEther(item.tipAmount),
              isPinnedByMe: true,
              isPremium: item.isPremium, 
              isLocked: false
            });

          } catch (error) {
            console.error("Error loading post:", finalCid, error);
          }
      }

      setPosts(loadedPosts);
      
    } catch (error) {
      console.error("Blockchain Load Error:", error);
    }
  };

  const tipPost = async (postId) => {
    try {
      const fixedTip = "0.01";
      setStatus(`Sending ${fixedTip} ETH Tip... 💸`);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
      const tipAmountWei = ethers.parseEther(fixedTip);

      const tx = await contract.tipPost(postId, { value: tipAmountWei });
      await tx.wait();

      setStatus("Tip Sent! You are awesome ❤️");
      loadBlockchainPosts(); 
    } catch (error) {
      console.error("Tip failed:", error);
      setStatus("Tip Failed ❌");
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

  const updateProfileName = async (newName) => {
    try {
      setStatus("Updating Profile Name...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
      
      const tx = await contract.setUsername(newName); // Note: Make sure contract supports this or use setProfile
      
      setStatus("Mining... Please wait ⏳");
      await tx.wait(); 
      setStatus("Name Updated! 👤");

      setTimeout(() => {
        loadBlockchainPosts(); 
      }, 2000);

    } catch (error) {
      console.error(error);
      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
          setStatus("Transaction Cancelled ❌");
      } else {
          setStatus("Failed to update name");
      }
    }
  };

  // --- NEW: SUBSCRIBE TO AUTHOR (Replaces joinPremium) ---
  const subscribeToAuthor = async (authorAddress) => {
    try {
      setStatus(`Subscribing to author... 💎`);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      // Call the new Solidity function
      const tx = await contract.subscribeToAuthor(authorAddress, { value: ethers.parseEther("0.01") });
      await tx.wait();

      setStatus("Subscribed! Unlocking content... 🔓");
      setTimeout(() => loadBlockchainPosts(), 1000); // Reload to unlock
    } catch (error) {
      console.error("Subscription Error:", error);
      setStatus("Transaction Failed ❌");
    }
  };

  const createPost = async (e, file, isPremium) => {
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
          {trait_type: "Timestamp", value: new Date().toISOString()},
          {trait_type: "Type", value: isPremium ? "Premium" : "Public"} 
        ]
      };

      const metadataResult = await ipfsClient.add(JSON.stringify(metadata));
      const finalCid = metadataResult.path;

      setStatus("Waiting for Wallet Signature...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      const tx = await contract.createPost(finalCid, isPremium);
      
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

  const updateProfile = async (name, bio, avatarFile) => {
      if (!account) return;
      setStatus("Uploading Profile to IPFS...");

      try {
          let avatarCid = null;
          if (avatarFile) {
              const added = await ipfsClient.add(avatarFile);
              avatarCid = `https://ipfs.io/ipfs/${added.path}`;
          }

          const identityData = {
              name: name,
              bio: bio,
              avatar: avatarCid 
          };

          const result = await ipfsClient.add(JSON.stringify(identityData));
          const profileCid = result.path;

          setStatus("Confirming Identity on Blockchain...");
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

          const tx = await contract.setProfile(profileCid); 
          await tx.wait();
          
          setStatus("Identity Updated! 🆔");
          
          setTimeout(() => window.location.reload(), 1000);

      } catch (error) {
          console.error("Profile Update Error:", error);
          setStatus("Update Failed ❌");
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
                  {usernames[account.toLowerCase()]?.name 
                      ? usernames[account.toLowerCase()].name   
                      : (typeof usernames[account.toLowerCase()] === 'string' 
                          ? usernames[account.toLowerCase()]    
                          : account.slice(0,6) + "..." + account.slice(-4)) 
                  }
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
                
                <Link to={`/profile/${account}`} className="menu-item">
                  <span><i className="fa-solid fa-user"></i></span><h3>Profile</h3>
                </Link>
                
                {/* Note: Global Premium button removed as subscriptions are now per-user */}
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
                  usernames={usernames}
                  tipPost={tipPost}
                  // --- CHANGED: PASS SUBSCRIBE FUNCTION ---
                  subscribeToAuthor={subscribeToAuthor}
                />
              } />
              
              <Route path="/profile/:address" element={
                <Profile 
                    posts={posts} 
                    account={account} 
                    following={following} 
                    usernames={usernames} 
                    updateProfile={updateProfile}
                    subscribeToAuthor={subscribeToAuthor}
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