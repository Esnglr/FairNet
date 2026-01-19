# 🌐 FairNet: Decentralized Social Media Platform

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Ethereum](https://img.shields.io/badge/Blockchain-Ethereum-3C3C3D.svg) ![IPFS](https://img.shields.io/badge/Storage-IPFS-65C2CB.svg) ![React](https://img.shields.io/badge/Frontend-React-61DAFB.svg)

**FairNet** is a censorship-resistant, decentralized social media application developed for the *Decentralized Systems* course. Unlike traditional platforms where a central server controls data, FairNet uses a hybrid architecture of **Ethereum Blockchain** (for logic and economy) and **IPFS** (for content storage) to ensure that data remains persistent, user-owned, and unstoppable.

---

## 🚀 Key Features

### 1. 🔗 Fully Decentralized Feed
- **No Central Database:** All posts, images, and metadata are stored on the InterPlanetary File System (IPFS).
- **Immutable Registry:** The "Table of Contents" for the feed is stored on the Ethereum Blockchain (Smart Contract). Once a post is made, it cannot be altered or deleted by a third party.

### 2. 📌 Cooperative Pinning (Content Persistency)
- **The Problem:** In standard IPFS, if the original uploader goes offline, the content disappears.
- **Our Solution:** We implemented a **"View-to-Host"** protocol. When a user views a post, their local node automatically *pins* that content.
- **Result:** The network becomes stronger as it grows. Even if the original creator vanishes, the community keeps the content alive.

### 3. 💎 Built-in NFT Economy
- **Minting:** Users can turn their posts into NFTs with a single click.
- **Marketplace:** Users can list their posts for sale in ETH.
- **Ownership Transfer:** Buying a post transfers the NFT ownership on the blockchain, updating the UI for all users instantly.

### 4. ❤️ Social Tipping
- Directly tip content creators with ETH.
- Tips are processed via Smart Contracts, ensuring 100% of the value goes to the author with no platform fees.

---

## 🛠️ System Architecture

FairNet operates on a **Host-Client** model designed for local network demonstration (via Tailscale or LAN).

- **Frontend:** React.js (Web Interface)
- **Blockchain Layer:** Hardhat (Local Ethereum Network)
- **Storage Layer:** IPFS Desktop (P2P File Storage)
- **Networking:** Tailscale (Secure Mesh VPN for node interconnection)

---

## 💻 Installation & Setup

### 1. Prerequisites
Ensure you have the following installed globally on your machine:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [IPFS Desktop](https://docs.ipfs.tech/install/ipfs-desktop/)
- [MetaMask Extension](https://metamask.io/)
- [Tailscale](https://tailscale.com/) (For multi-node demo)

### 2. Clone and Install Dependencies
Clone the repository and install all required npm packages:

```bash
git clone [https://github.com/your-username/FairNet.git](https://github.com/your-username/FairNet.git)
cd FairNet

# Install Core Dependencies (React, Hardhat, Ethers, IPFS Client, OpenZeppelin)
npm install ethers hardhat @openzeppelin/contracts ipfs-http-client react-router-dom dotenv
```

Initialize Hardhat (If starting fresh):

```bash
npx hardhat compile
```

Configure the IPFS to allow the browser to talk to our local IPFS and bypass the CORS:
```bash
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET"]'
```

Start the IPFS daemon:

```bash
# If you have installed the installation media in windows, run this
.\ipfs.exe daemon

# And if you are running ipfs as a service (or linux), run this
ipfs daemon
```


## 🦊 MetaMask Configuration

Whether you are running the app locally or connecting as a client, you must configure MetaMask to talk to the local Hardhat blockchain.

### Option A: For Local Testing (localhost)
*If you are running the blockchain on your own machine.*

1. Open MetaMask -> Click the **Network Dropdown** -> **Add Network**.
2. Click **"Add a network manually"** at the bottom.
3. Enter these details:
   - **Network Name:** Localhost 8545
   - **New RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH`
4. Click **Save**.

### Option B: For Client Mode (Connecting to Host)
*If you are the "Guest" connecting to a partner's machine.*

1. Open MetaMask -> Click the **Network Dropdown** -> **Add Network**.
2. Click **"Add a network manually"**.
3. Enter these details:
   - **Network Name:** FairNet Host
   - **New RPC URL:** `http://<HOST_TAILSCALE_IP>:8545`
     *(Replace `<HOST_TAILSCALE_IP>` with the Host's IP, e.g., `100.x.y.z`)*
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH`
4. Click **Save**.

---

### If you want to run the app locally follow these steps:

Run the npx node,
```bash
npx hardhat node
```

Locally deploy the smart contract,
```bash
npx hardhat run scripts/deploy.js --network localhost
```

Start the npm app,
```bash
npm start
```

### If you want to run the app with host-client structure follow these steps:

Firstly if the two end device is not under the same LAN then establish a connection via Tailscale, for further information checkout their website. 
And once you have a connection between two end devices, note the ip address of the host device that you got from tailscale. 
If you are not sure which ip is yours run this command to clarify:

```bash
tailscale ip -4
```

Then in the host device you should get the IPFS id of it so that two device can establish a connection with IPFS. To learn the host devices IPFS id run this:

```bash
ipfs id

# if you are on windows and installed ipfs with installation media then run this
.\ipfs.exe  id
```

Note that id and in the client device we should connect to the host using that IPFS id. Run this:

```bash
# if the two device is in the same LAN the <IP_ADRESS> is what comes after you run "ip -a"
ipfs swarm connect /ip4/<IP_ADRESS>/tcp/4001/p2p/<IPFS_ID>
```

On the host machine start the blockchain and deploy the smart contract and finally start the app:

```bash
npx hardhat node --hostname 0.0.0.0

# run this at a different terminal tab
npx hardhat run scripts/deploy.js --network localhost

npm start
```

On the client machine:

Configure App.js: Update the provider URL in src/App.js to point the host machines tailscale ip (if in the same LAN then the public ip). Find those lines and update accordingly:

```javascript
const provider = new ethers.providers.JsonRpcProvider("http://100.x.y.x:8545")

rpcUrls: ["http://100.x.y.x:8545"],
```

And then start the app:

```bash
HOST=0.0.0.0 npm start
```

---

## 🧪 Testing the "Unplug" Feature (Proof of Concept)

To verify the **Cooperative Pinning** (our "Second Feature") works as intended, follow this procedure:

1. **User A (Host)** creates a post with an image.
2. **User B (Client)** loads the feed.
   - *Observation:* User B's node automatically pins the image locally.
   - *Indicator:* A "📌 Hosting" badge will appear next to the post timestamp.
3. **User A** disconnects from the internet (The Kill Switch).
4. **User B** refreshes the page or opens it in a new tab.
   - *Result:* The image **remains visible and loads instantly**, proving that the data successfully migrated to the second node and is no longer dependent on the original creator.


## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

## 👥 Contributors

* **[Tuna Guven]**
* **[Esin Guler]** 

---

### 🌟 Acknowledgements
* Built using [Hardhat](https://hardhat.org/)
* Storage provided by [IPFS](https://ipfs.tech/)
* Smart Contracts via [OpenZeppelin](https://openzeppelin.com/)