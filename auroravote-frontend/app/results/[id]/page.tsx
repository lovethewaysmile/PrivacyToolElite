"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import dynamic from "next/dynamic";

const Bar = dynamic(() => import("react-chartjs-2").then(m => m.Bar), { ssr: false });
const Pie = dynamic(() => import("react-chartjs-2").then(m => m.Pie), { ssr: false });

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);

import { AuroraVoteHubABI } from "@/abi/AuroraVoteHubABI";
import { AuroraVoteHubAddresses } from "@/abi/AuroraVoteHubAddresses";
import { decryptAggregate } from "@/fhevm/adapter";

interface TopicInfo {
  name: string;
  details: string;
  options: string[];
  status: number;
}

interface VoteResults {
  [handle: string]: bigint;
}

export default function ResultsPage() {
  const params = useParams<{ id: string }>();
  const topicId = Number(params?.id);

  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | undefined>();
  const [topic, setTopic] = useState<TopicInfo | null>(null);
  const [encryptedHandles, setEncryptedHandles] = useState<string[] | null>(null);
  const [decryptedResults, setDecryptedResults] = useState<VoteResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [decrypting, setDecrypting] = useState(false);
  const [message, setMessage] = useState("");
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

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
        const [name, details, options] = await (contract as any).fetchTopic(topicId);
        const status = await (contract as any).topicStage(topicId);
        
        setTopic({ name, details, options, status: Number(status) });

        try {
          const handles = await (contract as any).encryptedAggregateOf(topicId);
          setEncryptedHandles(handles);
        } catch {
          // 可能还没有投票数据
        }
      } catch (error) {
        setMessage("加载议题信息失败");
      } finally {
        setLoading(false);
      }
    })();
  }, [contract, topicId]);

  const decryptResults = useCallback(async () => {
    if (!provider || !chainId || !signer || !encryptedHandles) return;

    setDecrypting(true);
    setMessage("正在解密投票结果...");

    try {
      const addr = (AuroraVoteHubAddresses as any)[String(chainId)]?.address;
      if (!addr) throw new Error("无法获取合约地址");

      const results = await decryptAggregate({
        contractAddress: addr,
        encHandles: encryptedHandles,
        userAddress: await signer.getAddress(),
        chainId,
        provider
      });

      setDecryptedResults(results as VoteResults);
      setMessage("解密成功！");
    } catch (error: any) {
      setMessage(`解密失败: ${error?.message || '未知错误'}`);
    } finally {
      setDecrypting(false);
    }
  }, [provider, chainId, signer, encryptedHandles]);

  const chartData = useMemo(() => {
    if (!topic || !encryptedHandles || !decryptedResults) return null;

    const labels = topic.options;
    const data = encryptedHandles.map(handle => Number(decryptedResults[handle] || 0));
    const total = data.reduce((sum, count) => sum + count, 0);

    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
      '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
    ];

    return {
      labels,
      datasets: [{
        label: '票数',
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length),
        borderWidth: 1
      }],
      total
    };
  }, [topic, encryptedHandles, decryptedResults]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="card loading">
          <div className="h-8 bg-slate-700 rounded mb-4"></div>
          <div className="h-4 bg-slate-700 rounded mb-2"></div>
          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
        </div>
        <div className="card loading">
          <div className="h-80 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="max-w-6xl mx-auto">
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

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
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
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-100">{topic.name}</h1>
              <div className="card px-3 py-1 text-sm bg-blue-500/10 border-blue-500/20">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📊</span>
                  <span className="font-medium text-blue-400">投票结果</span>
                </div>
              </div>
            </div>
            {topic.details && (
              <p className="text-slate-300 leading-relaxed">{topic.details}</p>
            )}
          </div>
          <div className="text-right text-sm text-slate-500 ml-4">
            <div>议题 #{topicId}</div>
          </div>
        </div>
      </div>

      {/* 解密操作 */}
      {!decryptedResults && encryptedHandles && (
        <div className="card text-center py-8 bg-blue-500/10 border-blue-500/20">
          <div className="text-4xl mb-4">🔐</div>
          <h3 className="text-lg font-semibold text-blue-400 mb-2">投票结果已加密</h3>
          <p className="text-slate-300 mb-6">
            点击下方按钮解密查看投票结果。解密过程需要您的钱包签名确认。
          </p>
          <button
            onClick={decryptResults}
            disabled={decrypting}
            className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {decrypting ? (
              <>
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                解密中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                解密投票结果
              </>
            )}
          </button>
        </div>
      )}

      {/* 暂无数据 */}
      {!encryptedHandles && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-slate-300 mb-2">暂无投票数据</h3>
          <p className="text-slate-500 mb-6">
            {topic.status < 2 ? '投票还未结束，请等待投票结束后查看结果' : '该议题暂时没有收到任何投票'}
          </p>
          <Link href={`/topics/${topicId}`} className="btn-primary">
            查看议题详情
          </Link>
        </div>
      )}

      {/* 结果展示 */}
      {chartData && (
        <div className="space-y-8">
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">{chartData.total}</div>
              <div className="text-sm text-slate-400">总投票数</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-emerald-400 mb-1">{topic.options.length}</div>
              <div className="text-sm text-slate-400">投票选项</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">
                {chartData.total > 0 ? Math.max(...chartData.datasets[0].data) : 0}
              </div>
              <div className="text-sm text-slate-400">最高票数</div>
            </div>
        <div className="card text-center">
              <div className="text-2xl font-bold text-amber-400 mb-1">
                {chartData.total > 0 ? 
                  `${(Math.max(...chartData.datasets[0].data) / chartData.total * 100).toFixed(1)}%` : 
                  '0%'
                }
              </div>
              <div className="text-sm text-slate-400">最高占比</div>
            </div>
          </div>

          {/* 图表控制 */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-100">投票结果可视化</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    chartType === 'bar' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  柱状图
                </button>
                <button
                  onClick={() => setChartType('pie')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    chartType === 'pie' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  饼图
                </button>
              </div>
            </div>

            <div className="h-96 flex items-center justify-center">
              {chartType === 'bar' ? (
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const total = chartData.total;
                            const value = context.parsed.y;
                            const percentage = total > 0 ? (value / total * 100).toFixed(1) : '0';
                            return `${context.label}: ${value} 票 (${percentage}%)`;
                          }
                        }
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
              ) : (
                <Pie
                  data={chartData}
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
                            const total = chartData.total;
                            const value = context.parsed;
                            const percentage = total > 0 ? (value / total * 100).toFixed(1) : '0';
                            return `${context.label}: ${value} 票 (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* 详细结果表格 */}
          <div className="card">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">详细结果</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-300">选项</th>
                    <th className="text-left py-3 px-4 text-slate-300">票数</th>
                    <th className="text-left py-3 px-4 text-slate-300">占比</th>
                    <th className="text-left py-3 px-4 text-slate-300">进度条</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.labels.map((label, index) => {
                    const votes = chartData.datasets[0].data[index];
                    const percentage = chartData.total > 0 ? (votes / chartData.total * 100) : 0;
                    const isWinner = votes === Math.max(...chartData.datasets[0].data) && votes > 0;

                    return (
                      <tr key={index} className={`border-b border-slate-800 ${isWinner ? 'bg-emerald-500/5' : ''}`}>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              isWinner ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                            }`}>
                              {String.fromCharCode(65 + index)}
                            </div>
                            <span className={`font-medium ${isWinner ? 'text-emerald-400' : 'text-slate-200'}`}>
                              {label}
                              {isWinner && (
                                <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                                  胜出
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`font-semibold ${isWinner ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {votes.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`font-medium ${isWinner ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                isWinner ? 'bg-emerald-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
        <h3 className="text-lg font-semibold text-slate-200 mb-3">🔐 隐私保护说明</h3>
        <div className="space-y-2 text-sm text-slate-400">
          <p>• 所有投票数据在区块链上都是加密存储的</p>
          <p>• 只有聚合后的最终结果会被解密展示</p>
          <p>• 个人投票选择永远不会被暴露</p>
          <p>• 解密过程需要用户授权，确保数据安全</p>
        </div>
      </div>
    </div>
  );
}