import React from 'react';
import '../style.css';

const Login = ({ connectWallet }) => {
  return (
    <div className="login-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--color-light)',
        textAlign: 'center'
    }}>
        <div className="login-card" style={{
            background: 'var(--color-white)',
            padding: '4rem',
            borderRadius: 'var(--card-border-radius)',
            boxShadow: '0 0 2rem var(--color-primary-light)'
        }}>
            <h1 style={{fontSize: '3rem', marginBottom: '1rem'}}>FairNet</h1>
            <h3 className="text-muted" style={{marginBottom: '3rem'}}>
                The Decentralized Social Network
            </h3>
            
            <button 
                onClick={connectWallet} 
                className="btn btn-primary"
                style={{
                    fontSize: '1.2rem',
                    padding: '1rem 3rem',
                    borderRadius: '2rem'
                }}
            >
                Connect Wallet to Enter
            </button>
            
            <p style={{marginTop: '2rem', fontSize: '0.9rem'}} className="text-muted">
                No email needed. Login with MetaMask.
            </p>
        </div>
    </div>
  );
};

export default Login;