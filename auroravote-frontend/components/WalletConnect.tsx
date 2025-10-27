"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";

// 扩展 Window 接口以包含 ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function WalletConnect() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkWalletConnection();
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const checkWalletConnection = async () => {
    if (!window.ethereum) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        setAccount(accounts[0].address);
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));
      }
    } catch (error) {
      console.error('检查钱包连接失败:', error);
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount(null);
      setChainId(null);
    } else {
      setAccount(accounts[0]);
      checkWalletConnection();
    }
  };

  const handleChainChanged = (chainId: string) => {
    setChainId(parseInt(chainId, 16));
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('请安装 MetaMask 钱包');
      return;
    }

    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      
      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));
    } catch (error: any) {
      console.error('连接钱包失败:', error);
      alert('连接钱包失败: ' + (error?.message || '未知错误'));
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToSepolia = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chainId
      });
    } catch (error: any) {
      // 如果网络不存在，尝试添加
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Testnet',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            }],
          });
        } catch (addError) {
          console.error('添加 Sepolia 网络失败:', addError);
        }
      }
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getChainName = (chainId: number) => {
    switch (chainId) {
      case 1:
        return 'Mainnet';
      case 11155111:
        return 'Sepolia';
      case 31337:
        return 'Localhost';
      default:
        return `Chain ${chainId}`;
    }
  };

  const isCorrectChain = chainId === 11155111 || chainId === 31337;

  if (!account) {
    return (
      <button
        onClick={connectWallet}
        disabled={isConnecting}
        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isConnecting ? (
          <>
            <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            连接中...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            连接钱包
          </>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      {/* 网络状态 */}
      <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-sm ${
        isCorrectChain 
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          isCorrectChain ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'
        }`}></div>
        <span>{chainId ? getChainName(chainId) : 'Unknown'}</span>
      </div>

      {/* 钱包地址 */}
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
        <span className="text-sm text-slate-300 font-mono">{formatAddress(account)}</span>
      </div>

      {/* 切换网络按钮 */}
      {!isCorrectChain && (
        <button
          onClick={switchToSepolia}
          className="btn-outline text-sm px-3 py-1.5"
        >
          切换到 Sepolia
        </button>
      )}
    </div>
  );
}
