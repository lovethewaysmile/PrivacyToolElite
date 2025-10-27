"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import { AuroraVoteHubABI } from "@/abi/AuroraVoteHubABI";
import { AuroraVoteHubAddresses } from "@/abi/AuroraVoteHubAddresses";

interface Topic {
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

export default function TopicsPage() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [chainId, setChainId] = useState<number | undefined>();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'ended' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');

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
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!contract) return;
      setLoading(true);
      try {
        const count = Number(await (contract as any).countTopics());
        const topicsData: Topic[] = [];
        
        for (let i = 1; i <= count; i++) {
          const [name, details, options, openAt, closeAt, published, owner] = await (contract as any).fetchTopic(i);
          const status = await (contract as any).topicStage(i);
          topicsData.push({
            id: i,
            name,
            details,
            options,
            openAt: Number(openAt),
            closeAt: Number(closeAt),
            published,
            owner,
            status: Number(status)
          });
        }
        
        setTopics(topicsData.reverse());
      } finally {
        setLoading(false);
      }
    })();
  }, [contract]);

  const filteredTopics = useMemo(() => {
    let filtered = topics;

    // 按状态筛选
    if (filter !== 'all') {
      filtered = filtered.filter(topic => {
        switch (filter) {
          case 'active':
            return topic.status === 1;
          case 'ended':
            return topic.status >= 2;
          case 'pending':
            return topic.status === 0;
          default:
            return true;
        }
      });
    }

    // 按搜索词筛选
    if (searchTerm) {
      filtered = filtered.filter(topic =>
        topic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        topic.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [topics, filter, searchTerm]);

  const getStatusInfo = (status: number) => {
    switch (status) {
      case 0:
        return { text: '即将开始', className: 'status-pending', icon: '⏳' };
      case 1:
        return { text: '进行中', className: 'status-active', icon: '🔥' };
      case 2:
        return { text: '已结束', className: 'status-ended', icon: '⏹️' };
      case 3:
        return { text: '已公布', className: 'status-closed', icon: '📊' };
      default:
        return { text: '未知', className: 'text-slate-400', icon: '❓' };
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1 className="page-title">议题广场</h1>
          <p className="page-subtitle">浏览和参与各种投票议题</p>
        </div>
        
        <div className="grid-auto">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card loading">
              <div className="h-4 bg-slate-700 rounded mb-4"></div>
              <div className="h-3 bg-slate-700 rounded mb-2"></div>
              <div className="h-3 bg-slate-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 页面头部 */}
      <div className="page-header">
        <div>
          <h1 className="page-title">议题广场</h1>
          <p className="page-subtitle">发现并参与感兴趣的投票议题</p>
        </div>
        <Link href="/create" className="btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          创建议题
        </Link>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-slate-100 mb-1">{topics.length}</div>
          <div className="text-sm text-slate-400">总议题</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-emerald-400 mb-1">
            {topics.filter(t => t.status === 1).length}
          </div>
          <div className="text-sm text-slate-400">进行中</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-amber-400 mb-1">
            {topics.filter(t => t.status === 0).length}
          </div>
          <div className="text-sm text-slate-400">即将开始</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-slate-400 mb-1">
            {topics.filter(t => t.status >= 2).length}
          </div>
          <div className="text-sm text-slate-400">已结束</div>
        </div>
      </div>

      {/* 筛选和搜索 */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="搜索议题标题或描述..."
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* 状态筛选 */}
          <div className="flex space-x-2">
            {[
              { key: 'all', label: '全部' },
              { key: 'active', label: '进行中' },
              { key: 'pending', label: '即将开始' },
              { key: 'ended', label: '已结束' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 议题列表 */}
      {filteredTopics.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🗳️</div>
          <h3 className="text-xl font-semibold text-slate-300 mb-2">
            {searchTerm || filter !== 'all' ? '未找到匹配的议题' : '暂无议题'}
          </h3>
          <p className="text-slate-500 mb-6">
            {searchTerm || filter !== 'all' 
              ? '尝试调整筛选条件或搜索关键词'
              : '成为第一个创建议题的用户'
            }
          </p>
          {(!searchTerm && filter === 'all') && (
            <Link href="/create" className="btn-primary">
              创建第一个议题
            </Link>
          )}
        </div>
      ) : (
        <div className="grid-auto">
          {filteredTopics.map((topic, index) => {
            const statusInfo = getStatusInfo(topic.status);
            return (
              <div
                key={topic.id}
                className="card-hover animate-slide-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{statusInfo.icon}</span>
                    <span className={`text-sm font-medium ${statusInfo.className}`}>
                      {statusInfo.text}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    #{topic.id}
                  </div>
                </div>

                <Link href={`/topics/${topic.id}`} className="block group">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                    {topic.name}
                  </h3>
                  {topic.details && (
                    <p className="text-slate-400 text-sm mb-4 line-clamp-3">
                      {topic.details}
                    </p>
                  )}
                </Link>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>选项数: {topic.options.length}</span>
                    <span>创建者: {formatAddress(topic.owner)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>开始: {formatDate(topic.openAt)}</span>
                    <span>结束: {formatDate(topic.closeAt)}</span>
                  </div>

                  <div className="divider"></div>

                  <div className="flex items-center justify-between">
                    <Link
                      href={`/topics/${topic.id}`}
                      className="btn-outline btn text-sm px-4 py-2"
                    >
                      查看详情
                    </Link>
                    {topic.status >= 2 && (
                      <Link
                        href={`/results/${topic.id}`}
                        className="btn-secondary text-sm px-4 py-2"
                      >
                        查看结果
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}