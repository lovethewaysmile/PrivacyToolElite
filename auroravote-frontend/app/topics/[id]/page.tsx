"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { AuroraVoteHubABI } from "@/abi/AuroraVoteHubABI";
import { AuroraVoteHubAddresses } from "@/abi/AuroraVoteHubAddresses";
import { encryptOneHot } from "@/fhevm/adapter";

interface TopicInfo {
  id: number;
  name: string;
  details: string;
  options: string[];
  openAt: number;
  closeAt: number;
  published: boolean;
  owner: string;
  status: number;
}

export default function TopicDetailPage() {
  const params = useParams<{ id: string }>();
  const topicId = Number(params?.id);

  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | undefined>();
  const [topic, setTopic] = useState<TopicInfo | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const contract = useMemo(() => {
    if (!provider || !chainId) return null;
    const addr = (AuroraVoteHubAddresses as any)[String(chainId)]?.address;
    if (!addr) return null;
    return new ethers.Contract(addr, AuroraVoteHubABI.abi, provider);
  }, [provider, chainId]);

  useEffect(() => {
    (async () => {
      if (!window?.ethereum) return;
      const bp = new ethers.BrowserProvider(window.ethereum);
      setProvider(bp);
      const net = await bp.getNetwork();
      setChainId(Number(net.chainId));
      try {
        setSigner(await bp.getSigner());
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!contract || !topicId) return;
      setLoading(true);
      try {
        const [name, details, options, openAt, closeAt, published, owner] = await (contract as any).fetchTopic(topicId);
        const status = await (contract as any).topicStage(topicId);
        
        setTopic({
          id: topicId,
          name,
          details,
          options,
          openAt: Number(openAt),
          closeAt: Number(closeAt),
          published,
          owner,
          status: Number(status)
        });
      } catch (error) {
        setMessage("加载议题信息失败");
      } finally {
        setLoading(false);
      }
    })();
  }, [contract, topicId]);

  const submitVote = useCallback(async () => {
    if (!provider || !chainId || !signer || !topic || selectedOption === null) return;

    setIsVoting(true);
    setMessage("正在准备投票...");

    try {
      const addr = (AuroraVoteHubAddresses as any)[String(chainId)]?.address;
      if (!addr) throw new Error("无法获取合约地址");

      // 创建 one-hot 编码
      const onehot = new Array(topic.options.length).fill(0);
      onehot[selectedOption] = 1;

      setMessage("正在加密投票选择...");
      const encrypted = await encryptOneHot({
        contractAddress: addr,
        userAddress: await signer.getAddress(),
        onehot,
        chainId,
        provider
      });

      setMessage("正在提交投票...");
      const contractWithSigner = new ethers.Contract(addr, AuroraVoteHubABI.abi, provider).connect(signer);
      const tx = await (contractWithSigner as any).pushCipherOneHot(topicId, encrypted.handles, encrypted.inputProof);

      setMessage("等待交易确认...");
      const receipt = await tx.wait();
      setMessage(`投票成功！交易哈希: ${receipt?.hash}`);
      setSelectedOption(null);
    } catch (error: any) {
      setMessage(`投票失败: ${error?.message || '未知错误'}`);
    } finally {
      setIsVoting(false);
    }
  }, [provider, chainId, signer, topic, selectedOption, topicId]);

  const getStatusInfo = (status: number) => {
    switch (status) {
      case 0:
        return { 
          text: '即将开始', 
          className: 'status-pending', 
          icon: '⏳',
          bgClass: 'bg-amber-500/10 border-amber-500/20',
          textClass: 'text-amber-400'
        };
      case 1:
        return { 
          text: '投票进行中', 
          className: 'status-active', 
          icon: '🔥',
          bgClass: 'bg-emerald-500/10 border-emerald-500/20',
          textClass: 'text-emerald-400'
        };
      case 2:
        return { 
          text: '投票已结束', 
          className: 'status-ended', 
          icon: '⏹️',
          bgClass: 'bg-slate-500/10 border-slate-500/20',
          textClass: 'text-slate-400'
        };
      case 3:
        return { 
          text: '结果已公布', 
          className: 'status-closed', 
          icon: '📊',
          bgClass: 'bg-blue-500/10 border-blue-500/20',
          textClass: 'text-blue-400'
        };
      default:
        return { 
          text: '未知状态', 
          className: 'text-slate-400', 
          icon: '❓',
          bgClass: 'bg-slate-500/10 border-slate-500/20',
          textClass: 'text-slate-400'
        };
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const getRemainingTime = () => {
    if (!topic) return null;
    const now = Math.floor(Date.now() / 1000);
    
    if (topic.status === 0) {
      const remaining = topic.openAt - now;
      if (remaining > 0) {
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        return `${hours}小时${minutes}分钟后开始`;
      }
    } else if (topic.status === 1) {
      const remaining = topic.closeAt - now;
      if (remaining > 0) {
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        return `还有${hours}小时${minutes}分钟结束`;
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card loading">
          <div className="h-8 bg-slate-700 rounded mb-4"></div>
          <div className="h-4 bg-slate-700 rounded mb-2"></div>
          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
        </div>
        <div className="card loading">
          <div className="h-40 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-slate-300 mb-2">议题不存在</h2>
          <p className="text-slate-500 mb-6">请检查议题ID是否正确</p>
          <Link href="/topics" className="btn-primary">
            返回议题列表
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(topic.status);
  const remainingTime = getRemainingTime();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* 返回按钮 */}
      <div>
        <Link href="/topics" className="inline-flex items-center text-slate-400 hover:text-white transition-colors">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回议题列表
        </Link>
      </div>

      {/* 议题信息 */}
      <div className="card">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-100">{topic.name}</h1>
              <div className={`card px-3 py-1 text-sm ${statusInfo.bgClass}`}>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{statusInfo.icon}</span>
                  <span className={`font-medium ${statusInfo.textClass}`}>
                    {statusInfo.text}
                  </span>
                </div>
              </div>
            </div>
            {topic.details && (
              <p className="text-slate-300 leading-relaxed mb-4">{topic.details}</p>
            )}
          </div>
          <div className="text-right text-sm text-slate-500 ml-4">
            <div>议题 #{topic.id}</div>
          </div>
        </div>

        {/* 时间和创建者信息 */}
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="card bg-slate-800/30 p-4">
            <div className="text-slate-400 mb-1">开始时间</div>
            <div className="text-slate-200 font-medium">{formatDate(topic.openAt)}</div>
          </div>
          <div className="card bg-slate-800/30 p-4">
            <div className="text-slate-400 mb-1">结束时间</div>
            <div className="text-slate-200 font-medium">{formatDate(topic.closeAt)}</div>
          </div>
          <div className="card bg-slate-800/30 p-4">
            <div className="text-slate-400 mb-1">创建者</div>
            <div className="text-slate-200 font-medium font-mono">{formatAddress(topic.owner)}</div>
          </div>
        </div>

        {/* 倒计时 */}
        {remainingTime && (
          <div className={`card mt-4 text-center ${statusInfo.bgClass}`}>
            <div className={`text-lg font-semibold ${statusInfo.textClass}`}>
              ⏰ {remainingTime}
            </div>
          </div>
        )}
      </div>

      {/* 投票区域 */}
      {topic.status === 1 && (
        <div className="card">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-100 mb-2">请选择您的投票</h2>
            <p className="text-slate-400">您的选择将被完全加密，任何人都无法知道您的具体投票内容</p>
          </div>

          <div className="space-y-4 mb-8">
            {topic.options.map((option, index) => (
              <div
                key={index}
                className={`card-hover p-6 cursor-pointer transition-all duration-200 ${
                  selectedOption === index 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'hover:border-slate-600'
                }`}
                onClick={() => setSelectedOption(index)}
              >
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <input
                      type="radio"
                      name="vote-option"
                      checked={selectedOption === index}
                      onChange={() => setSelectedOption(index)}
                      className="sr-only"
                    />
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedOption === index 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-slate-500'
                    }`}>
                      {selectedOption === index && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    selectedOption === index 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${
                      selectedOption === index ? 'text-white' : 'text-slate-200'
                    }`}>
                      {option}
                    </div>
                  </div>
                  {selectedOption === index && (
                    <div className="text-blue-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">
              {selectedOption !== null ? `已选择选项 ${String.fromCharCode(65 + selectedOption)}` : '请选择一个选项'}
            </div>
            <button
              onClick={submitVote}
              disabled={selectedOption === null || isVoting}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3"
            >
              {isVoting ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  投票中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  提交投票
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 非投票状态提示 */}
      {topic.status !== 1 && (
        <div className={`card text-center py-8 ${statusInfo.bgClass}`}>
          <div className="text-4xl mb-3">{statusInfo.icon}</div>
          <h3 className={`text-lg font-semibold mb-2 ${statusInfo.textClass}`}>
            {statusInfo.text}
          </h3>
          <p className="text-slate-400 mb-4">
            {topic.status === 0 && '投票尚未开始，请耐心等待'}
            {topic.status === 2 && '投票已经结束，您可以查看结果'}
            {topic.status === 3 && '投票结果已公布'}
          </p>
          {topic.status >= 2 && (
            <Link href={`/results/${topic.id}`} className="btn-primary">
              查看投票结果
            </Link>
          )}
        </div>
      )}

      {/* 消息提示 */}
      {message && (
        <div className={`card text-center ${
          message.includes('成功') ? 'bg-emerald-500/10 border-emerald-500/20' : 
          message.includes('失败') ? 'bg-red-500/10 border-red-500/20' : 
          'bg-blue-500/10 border-blue-500/20'
        }`}>
          <p className={`${
            message.includes('成功') ? 'text-emerald-400' : 
            message.includes('失败') ? 'text-red-400' : 
            'text-blue-400'
          }`}>
            {message}
          </p>
        </div>
      )}

      {/* 技术说明 */}
      <div className="card bg-slate-800/30">
        <h3 className="text-lg font-semibold text-slate-200 mb-3">🔒 隐私保护</h3>
        <div className="space-y-2 text-sm text-slate-400">
          <p>• 您的投票选择将通过同态加密技术完全保密</p>
          <p>• 投票内容只以密文形式存储在区块链上</p>
          <p>• 任何人（包括创建者）都无法知道您的具体选择</p>
          <p>• 只有最终的聚合结果会被解密和公布</p>
        </div>
      </div>
    </div>
  );
}