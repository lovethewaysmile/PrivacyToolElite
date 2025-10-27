import "./globals.css";
import { Metadata } from "next";
import WalletConnect from "@/components/WalletConnect";

export const metadata: Metadata = {
  title: "AuroraVote - 去中心化私密投票平台",
  description: "基于FHEVM的端到端加密投票系统",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-slate-900">
        {/* 背景装饰 */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        </div>

        {/* 主导航 */}
        <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center space-x-4">
                <a href="/" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xl font-bold text-gradient">AuroraVote</span>
                </a>
              </div>

              {/* 导航菜单 */}
              <div className="hidden md:flex items-center space-x-1">
                <a href="/topics" className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200">
                  议题广场
                </a>
                <a href="/create" className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200">
                  创建议题
                </a>
                <a href="/analytics" className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200">
                  数据分析
                </a>
              </div>

              {/* 钱包连接状态 */}
              <div className="flex items-center space-x-3">
                <WalletConnect />
              </div>
            </div>
          </div>

          {/* 移动端菜单 */}
          <div className="md:hidden border-t border-slate-800">
            <div className="px-4 py-2 space-y-1">
              <a href="/topics" className="block px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200">
                议题广场
              </a>
              <a href="/create" className="block px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200">
                创建议题
              </a>
              <a href="/analytics" className="block px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200">
                数据分析
              </a>
            </div>
          </div>
        </nav>

        {/* 主内容区 */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>

        {/* 页脚 */}
        <footer className="border-t border-slate-800 bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-slate-500">
              <p className="mb-2">AuroraVote - 去中心化私密投票平台</p>
              <p className="text-sm">
                基于 FHEVM 同态加密技术 · 部署于 Sepolia 测试网
              </p>
              <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
                <span>合约地址: 0xEb11827A83c1cA8b1E24cEB7C5ee505468BafAfc</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}