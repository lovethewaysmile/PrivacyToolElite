"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function HomePage() {
  const [stats, setStats] = useState({
    totalTopics: 0,
    activeTopics: 0,
    totalVotes: 0,
    isLoading: true
  });

  useEffect(() => {
    // 模拟加载统计数据
    const timer = setTimeout(() => {
      setStats({
        totalTopics: 12,
        activeTopics: 3,
        totalVotes: 847,
        isLoading: false
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const features = [
    {
      icon: "🔒",
      title: "端到端加密",
      description: "基于FHEVM同态加密技术，投票内容完全保密，任何人无法窥探您的选择"
    },
    {
      icon: "⚡",
      title: "实时计票",
      description: "链上同态聚合计票，结果实时更新，无需等待投票结束即可看到趋势"
    },
    {
      icon: "🌐",
      title: "去中心化",
      description: "完全运行在区块链上，无中心化服务器，抗审查且永久可用"
    },
    {
      icon: "🔍",
      title: "公开透明",
      description: "所有投票过程链上可查，结果可验证，确保选举公正性"
    }
  ];

  const quickActions = [
    {
      title: "创建投票",
      description: "发起新的投票议题",
      href: "/create",
      icon: "➕",
      className: "btn-primary"
    },
    {
      title: "参与投票",
      description: "浏览并参与活跃议题",
      href: "/topics",
      icon: "🗳️",
      className: "btn-secondary"
    },
    {
      title: "查看分析",
      description: "深入了解投票数据",
      href: "/analytics",
      icon: "📊",
      className: "btn-outline"
    }
  ];

  return (
    <div className="space-y-12 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold">
            <span className="text-gradient">Aurora</span>
            <span className="text-slate-100">Vote</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            下一代去中心化私密投票平台
          </p>
          <p className="text-slate-500 max-w-2xl mx-auto">
            利用前沿的同态加密技术，在保护隐私的同时实现透明可信的投票系统
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/create" className="btn-primary px-8 py-3 text-lg">
            立即创建投票
          </Link>
          <Link href="/topics" className="btn-outline px-8 py-3 text-lg">
            浏览投票议题
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-400 mb-2">
            {stats.isLoading ? (
              <div className="animate-pulse bg-slate-700 h-8 w-16 mx-auto rounded"></div>
            ) : (
              stats.totalTopics
            )}
          </div>
          <div className="text-slate-300 font-medium">总议题数</div>
          <div className="text-sm text-slate-500 mt-1">累计创建的投票议题</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-emerald-400 mb-2">
            {stats.isLoading ? (
              <div className="animate-pulse bg-slate-700 h-8 w-16 mx-auto rounded"></div>
            ) : (
              stats.activeTopics
            )}
          </div>
          <div className="text-slate-300 font-medium">进行中</div>
          <div className="text-sm text-slate-500 mt-1">正在接受投票的议题</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-purple-400 mb-2">
            {stats.isLoading ? (
              <div className="animate-pulse bg-slate-700 h-8 w-16 mx-auto rounded"></div>
            ) : (
              stats.totalVotes.toLocaleString()
            )}
          </div>
          <div className="text-slate-300 font-medium">总投票数</div>
          <div className="text-sm text-slate-500 mt-1">平台累计投票次数</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">快速开始</h2>
          <p className="text-slate-400">选择您要执行的操作</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="card-hover group text-center p-8 animate-slide-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200">
                {action.icon}
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">
                {action.title}
              </h3>
              <p className="text-slate-400 mb-4">
                {action.description}
              </p>
              <div className="inline-flex items-center text-blue-400 group-hover:text-blue-300 transition-colors">
                <span className="mr-2">开始使用</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100 mb-4">核心特性</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            AuroraVote 结合了最新的区块链技术和密码学创新，为您提供安全、透明、高效的投票体验
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex space-x-4 p-6 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-all duration-200 animate-slide-in"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="text-3xl flex-shrink-0">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Technology Section */}
      <div className="card text-center space-y-4">
        <h3 className="text-xl font-semibold text-slate-100">技术架构</h3>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-700/50 rounded-full">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span className="text-slate-300">FHEVM</span>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-700/50 rounded-full">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <span className="text-slate-300">Ethereum</span>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-700/50 rounded-full">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <span className="text-slate-300">Sepolia</span>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-700/50 rounded-full">
            <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
            <span className="text-slate-300">Next.js</span>
          </div>
        </div>
        <p className="text-slate-500 text-sm">
          合约地址: 0xEb11827A83c1cA8b1E24cEB7C5ee505468BafAfc
        </p>
      </div>
    </div>
  );
}