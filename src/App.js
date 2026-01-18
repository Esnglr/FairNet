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

  // MetaMask'i Zorla Doğru Ağa Geçirme Fonksiyonu
  const switchHardhatNetwork = async () => {
    const chainId = "0x7A69"; // 31337 (Hardhat Default Chain ID)
    
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainId }],
      });
    } catch (error) {
      // Eğer bu ağ ekli değilse, zorla ekletiyoruz:
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

  // 3. Connect to MetaMask
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

 // 4. Load Posts (MetaMask BYPASS EDİLMİŞ VERSİYON)
const loadBlockchainPosts = async () => {
    try {
      // BURASI KRİTİK: MetaMask yerine direkt Hardhat'e bağlanıyoruz
      // Böylece MetaMask'in cache/network saçmalıklarıyla uğraşmıyoruz.
      const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      
      // Signer'a gerek yok çünkü sadece okuma yapıyoruz
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
      
      // 1. Get all posts directly from the node
      const allPosts = await contract.getAllPosts();
      console.log("raw blockchain data (Direct Provider):", allPosts);
      
      // 2. Fetch the "My Following" list
      // BURADA DİKKAT: Takip verisi kişiye özeldir. 
      // Eğer cüzdan bağlı değilse bu kısım boş dönebilir veya hata verebilir.
      // O yüzden burayı try-catch ile yumuşatıyoruz.
      let myFollowing = [];
      if (window.ethereum) {
          try {
             // Sadece burası için browser provider kullanıyoruz ki "benim" takip ettiklerimi bulsun
             const browserProvider = new ethers.BrowserProvider(window.ethereum);
             const signer = await browserProvider.getSigner();
             const signedContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
             const rawFollowing = await signedContract.getMyFollowing();
             myFollowing = rawFollowing.map(addr => addr.toLowerCase());
          } catch (err) {
             console.warn("Following listesi çekilemedi (Cüzdan bağlı olmayabilir):", err);
          }
      }
      setFollowing(myFollowing);

      const loadedPosts = [];

      // 3. Loop through every post and fetch its data from IPFS
      for (let i = allPosts.length - 1; i >= 0; i--) {
        const item = allPosts[i];
        
        try {
          const response = await fetch(`http://127.0.0.1:8080/ipfs/${item.cid}`);
          if (!response.ok) throw new Error("IPFS Fetch failed");
          const jsonContent = await response.json();

          loadedPosts.push({
            id: i,
            cid: item.cid,
            author: item.author,
            owner: item.owner,
            timestamp: new Date(Number(item.timestamp) * 1000).toISOString(),
            content: jsonContent.description || jsonContent.content || "No Text",
            image: jsonContent.image || null,
            userImage: "https://ui-avatars.com/api/?name=" + item.author + "&background=random",
            isMinted: item.isMinted,
            price: ethers.formatEther(item.price), // Convert Wei to ETH string (e.g., "0.5")
            forSale: item.forSale
          });
        } catch (error) {
          console.error("Error loading post:", item.cid, error);
        }
      }

      setPosts(loadedPosts);
      
    } catch (error) {
      console.error("Blockchain Load Error (Direct Provider):", error);
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
  const createPost = async (e, file) => {
    e.preventDefault();
    
    if (!account){
      alert("Please connect to your wallet first");
      return;
    }

    if (!postContent && !file) return;

    try {
      setStatus("Uploading to IPFS...");
      let imageCid = null;
      if (file){
        try{
          const added = await ipfsClient.add(file);
          imageCid = `https://ipfs.io/ipfs/${added.path}`;
          console.log("image ipfs url:", imageCid);
        } catch (err) {
          console.error("image upload failed:", err);
          setStatus("Image Upload Failed");
          return;
        }
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
      
      console.log("final metadata cid:", finalCid);

      setStatus("Waiting for Wallet Signature...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      const tx = await contract.createPost(finalCid);
      
      setStatus("Mining Transaction...");
      await tx.wait(); 

      setStatus("Post Published!");
      setPostContent(''); // Clear text input
      
      // Reload posts immediately to see changes
      loadBlockchainPosts(provider);

    } catch (error) {
      console.error('Error creating post:', error);
      setStatus('Transaction Failed');
    }
  };

  // --- DAY 2: MINT FUNCTION ---
  const mintNft = async (postId) => {
    try {
      if (!account) return alert("Please connect wallet first");
      
      setStatus("Minting NFT... Please confirm in Wallet 🦊");
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      // 1. Call the Smart Contract
      const tx = await contract.mintPost(postId);
      
      setStatus("Waiting for block confirmation... ⏳");
      await tx.wait(); // Wait for the mining to finish

      setStatus("NFT Minted Successfully! 💎");
      
      // 2. Reload posts so the button changes to "Verified"
      loadBlockchainPosts(provider);
      
    } catch (error) {
      console.error("Minting failed:", error);
      setStatus("Minting Failed ❌ (Check console)");
    }
  };

// --- DAY 3: LIST FOR SALE ---
  const listNft = async (postId, priceInEth) => {
    try {
      if (!priceInEth) return alert("Please enter a price");
      setStatus("Listing NFT for sale...");
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      // Convert "0.1" ETH to Wei
      const priceInWei = ethers.parseEther(priceInEth);
      
      const tx = await contract.listNft(postId, priceInWei);
      await tx.wait();
      
      setStatus("NFT Listed for Sale! 💰");
      loadBlockchainPosts(provider);
    } catch (error) {
      console.error("Listing failed", error);
      setStatus("Listing Failed");
    }
  };

  // --- DAY 3: BUY NFT ---
  const buyNft = async (postId, priceInEth) => {
    try {
      setStatus("Buying NFT... Confirm Transaction 💳");
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      const priceInWei = ethers.parseEther(priceInEth);

      // Send the transaction with Value (Money) attached
      const tx = await contract.buyNft(postId, { value: priceInWei });
      await tx.wait();
      
      setStatus("NFT Purchased! Ownership Transferred 🚀");
      loadBlockchainPosts(provider);
    } catch (error) {
      console.error("Purchase failed", error);
      setStatus("Purchase Failed");
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
                  mintNft={mintNft}
                  listNft={listNft}
                  buyNft={buyNft}
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
