"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { ethers } from "ethers";
import dynamic from "next/dynamic";

const Pie = dynamic(() => import("react-chartjs-2").then(m => m.Pie), { ssr: false });
const Line = dynamic(() => import("react-chartjs-2").then(m => m.Line), { ssr: false });

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Title);

import { AuroraVoteHubABI } from "@/abi/AuroraVoteHubABI";
import { AuroraVoteHubAddresses } from "@/abi/AuroraVoteHubAddresses";
import { decryptAggregate } from "@/fhevm/adapter";

interface TopicData {
  id: number;
  name: string;
  status: number;
  openAt: number;
  closeAt: number;
  options: string[];
}

interface AnalyticsData {
  totalTopics: number;
  activeTopics: number;
  completedTopics: number;
  pendingTopics: number;
  topicsOverTime: { date: string; count: number }[];
  statusDistribution: { status: string; count: number; color: string }[];
}

export default function AnalyticsPage() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | undefined>();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number>(0);
  const [topicResults, setTopicResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [decrypting, setDecrypting] = useState(false);
  const [message, setMessage] = useState("");

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
      if (!contract) return;
      setLoading(true);
      try {
        const count = Number(await (contract as any).countTopics());
        const topics: TopicData[] = [];
        
        for (let i = 1; i <= count; i++) {
          const [name, , options, openAt, closeAt] = await (contract as any).fetchTopic(i);
          const status = await (contract as any).topicStage(i);
          topics.push({
            id: i,
            name,
            status: Number(status),
            openAt: Number(openAt),
            closeAt: Number(closeAt),
            options
          });
        }

        // 计算分析数据
        const totalTopics = topics.length;
        const activeTopics = topics.filter(t => t.status === 1).length;
        const completedTopics = topics.filter(t => t.status >= 2).length;
        const pendingTopics = topics.filter(t => t.status === 0).length;

        // 状态分布
        const statusDistribution = [
          { status: '即将开始', count: pendingTopics, color: '#f59e0b' },
          { status: '进行中', count: activeTopics, color: '#10b981' },
          { status: '已结束', count: completedTopics, color: '#6b7280' }
        ].filter(item => item.count > 0);

        // 时间线数据（简化版本）
        const topicsOverTime = topics
          .sort((a, b) => a.openAt - b.openAt)
          .reduce((acc, topic, index) => {
            const date = new Date(topic.openAt * 1000).toLocaleDateString('zh-CN');
            const existing = acc.find(item => item.date === date);
            if (existing) {
              existing.count++;
            } else {
              acc.push({ date, count: index + 1 });
            }
            return acc;
          }, [] as { date: string; count: number }[]);

        setAnalytics({
          totalTopics,
          activeTopics,
          completedTopics,
          pendingTopics,
          topicsOverTime,
          statusDistribution
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [contract]);

  const loadTopicResults = useCallback(async (topicId: number) => {
    if (!contract || !signer || !provider || !chainId) return;
    
    setDecrypting(true);
    setMessage("正在加载议题数据...");
    
    try {
      const [name, , options] = await (contract as any).fetchTopic(topicId);
      const handles = await (contract as any).encryptedAggregateOf(topicId);
      
      setMessage("正在解密投票结果...");
      const addr = (AuroraVoteHubAddresses as any)[String(chainId)]?.address;
      const results = await decryptAggregate({
        contractAddress: addr,
        encHandles: handles,
        userAddress: await signer.getAddress(),
        chainId,
        provider
      });

      const data = handles.map((handle: string) => Number(results[handle] || 0));
      const total = data.reduce((sum: number, count: number) => sum + count, 0);

      setTopicResults({
        name,
        options,
        data,
        total,
        chartData: {
          labels: options,
          datasets: [{
            data,
            backgroundColor: [
              '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
              '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
            ].slice(0, options.length)
          }]
        }
      });
      
      setMessage("数据加载成功！");
    } catch (error: any) {
      setMessage(`加载失败: ${error?.message || '未知错误'}`);
    } finally {
      setDecrypting(false);
    }
  }, [contract, signer, provider, chainId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1 className="page-title">数据分析</h1>
          <p className="page-subtitle">深入了解平台投票数据和趋势</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card loading text-center py-6">
              <div className="h-8 bg-slate-700 rounded mb-2 mx-auto w-16"></div>
              <div className="h-4 bg-slate-700 rounded mx-auto w-20"></div>
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
        <h1 className="page-title">数据分析</h1>
        <p className="page-subtitle">深入了解平台投票数据和趋势</p>
      </div>

      {/* 核心指标 */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">{analytics.totalTopics}</div>
            <div className="text-slate-300 font-medium">总议题数</div>
            <div className="text-sm text-slate-500 mt-1">平台累计议题</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-emerald-400 mb-2">{analytics.activeTopics}</div>
            <div className="text-slate-300 font-medium">进行中</div>
            <div className="text-sm text-slate-500 mt-1">正在接受投票</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-amber-400 mb-2">{analytics.pendingTopics}</div>
            <div className="text-slate-300 font-medium">即将开始</div>
            <div className="text-sm text-slate-500 mt-1">等待投票开始</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-slate-400 mb-2">{analytics.completedTopics}</div>
            <div className="text-slate-300 font-medium">已完成</div>
            <div className="text-sm text-slate-500 mt-1">投票已结束</div>
          </div>
        </div>
      )}

      {/* 图表区域 */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 状态分布 */}
          <div className="card">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">议题状态分布</h3>
            {analytics.statusDistribution.length > 0 ? (
              <div className="h-64 flex items-center justify-center">
                <Pie
                  data={{
                    labels: analytics.statusDistribution.map(item => item.status),
                    datasets: [{
                      data: analytics.statusDistribution.map(item => item.count),
                      backgroundColor: analytics.statusDistribution.map(item => item.color)
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: { color: '#cbd5e1' }
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">
                暂无数据
              </div>
            )}
          </div>

          {/* 议题创建趋势 */}
          <div className="card">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">议题创建趋势</h3>
            {analytics.topicsOverTime.length > 0 ? (
              <div className="h-64">
                <Line
                  data={{
                    labels: analytics.topicsOverTime.map(item => item.date),
                    datasets: [{
                      label: '累计议题数',
                      data: analytics.topicsOverTime.map(item => item.count),
                      borderColor: '#3b82f6',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      tension: 0.4
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: { color: '#cbd5e1' }
                      }
                    },
                    scales: {
                      x: {
                        ticks: { color: '#cbd5e1' },
                        grid: { color: '#334155' }
                      },
                      y: {
                        ticks: { color: '#cbd5e1' },
                        grid: { color: '#334155' }
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">
                暂无数据
              </div>
            )}
          </div>
        </div>
      )}

      {/* 议题详细分析 */}
      <div className="card">
        <div className="section-header">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">议题详细分析</h3>
            <p className="text-slate-400 text-sm">选择议题查看详细投票结果</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="number"
            placeholder="输入议题ID"
            className="input flex-1"
            min="1"
            value={selectedTopicId || ''}
            onChange={(e) => setSelectedTopicId(Number(e.target.value) || 0)}
          />
          <button
            onClick={() => selectedTopicId && loadTopicResults(selectedTopicId)}
            disabled={!selectedTopicId || decrypting}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-6"
          >
            {decrypting ? (
              <>
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                分析中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                分析议题
              </>
            )}
          </button>
        </div>

        {topicResults && (
          <div className="space-y-6">
            <div className="card bg-slate-800/30">
              <h4 className="font-semibold text-slate-200 mb-3">议题: {topicResults.name}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-slate-400">总投票数</div>
                  <div className="text-lg font-semibold text-slate-200">{topicResults.total}</div>
                </div>
                <div>
                  <div className="text-slate-400">选项数量</div>
                  <div className="text-lg font-semibold text-slate-200">{topicResults.options.length}</div>
                </div>
                <div>
                  <div className="text-slate-400">最高票数</div>
                  <div className="text-lg font-semibold text-slate-200">
                    {Math.max(...topicResults.data)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">参与度</div>
                  <div className="text-lg font-semibold text-slate-200">
                    {topicResults.total > 0 ? '高' : '低'}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-80 flex items-center justify-center">
              <Pie
                data={topicResults.chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: '#cbd5e1' }
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const total = topicResults.total;
                          const value = context.parsed;
                          const percentage = total > 0 ? (value / total * 100).toFixed(1) : '0';
                          return `${context.label}: ${value} 票 (${percentage}%)`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

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

      {/* 平台统计 */}
      <div className="card bg-slate-800/30">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">📈 平台统计</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-slate-300 mb-2">技术特性</h4>
            <ul className="space-y-1 text-slate-400">
              <li>• 同态加密保护隐私</li>
              <li>• 链上透明可验证</li>
              <li>• 实时投票聚合</li>
              <li>• 去中心化治理</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-slate-300 mb-2">网络信息</h4>
            <ul className="space-y-1 text-slate-400">
              <li>• 网络: Ethereum Sepolia</li>
              <li>• 技术: FHEVM</li>
              <li>• 加密: 同态加密</li>
              <li>• 共识: PoS</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-slate-300 mb-2">合约信息</h4>
            <ul className="space-y-1 text-slate-400">
              <li>• 合约: AuroraVoteHub</li>
              <li>• 地址: 0xEb11...fAfc</li>
              <li>• 状态: 已验证</li>
              <li>• 版本: v1.0.0</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}