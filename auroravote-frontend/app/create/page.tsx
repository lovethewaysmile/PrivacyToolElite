"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { AuroraVoteHubABI } from "@/abi/AuroraVoteHubABI";
import { AuroraVoteHubAddresses } from "@/abi/AuroraVoteHubAddresses";

interface FormData {
  name: string;
  details: string;
  options: string[];
  startTime: number | null;
  endTime: number | null;
}

export default function CreateTopicPage() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | undefined>();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FormData>({
    name: "",
    details: "",
    options: ["", ""],
    startTime: null,
    endTime: null
  });

  const contract = useMemo(() => {
    if (!provider || !chainId || !signer) return null;
    const addr = (AuroraVoteHubAddresses as any)[String(chainId)]?.address;
    if (!addr) return null;
    return new ethers.Contract(addr, AuroraVoteHubABI.abi, signer);
  }, [provider, chainId, signer]);

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

      // 设置默认时间
      const now = Math.floor(Date.now() / 1000);
      setFormData(prev => ({
        ...prev,
        startTime: now + 300, // 5分钟后开始
        endTime: now + 86400  // 24小时后结束
      }));
    })();
  }, []);

  const steps = [
    { number: 1, title: "基本信息", description: "设置议题标题和描述" },
    { number: 2, title: "投票选项", description: "添加投票选项" },
    { number: 3, title: "时间设置", description: "设置投票时间窗口" },
    { number: 4, title: "确认创建", description: "检查并提交议题" }
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          newErrors.name = "请输入议题标题";
        }
        break;
      case 2:
        if (formData.options.length < 2) {
          newErrors.options = "至少需要2个选项";
        }
        if (formData.options.some(opt => !opt.trim())) {
          newErrors.options = "所有选项都不能为空";
        }
        break;
      case 3:
        if (!formData.startTime || !formData.endTime) {
          newErrors.time = "请设置开始和结束时间";
        } else if (formData.endTime <= formData.startTime) {
          newErrors.time = "结束时间必须晚于开始时间";
        } else if (formData.startTime <= Math.floor(Date.now() / 1000)) {
          newErrors.time = "开始时间必须晚于当前时间";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const addOption = () => {
    if (formData.options.length < 10) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, ""]
      }));
    }
  };

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      setFormData(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const updateOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const formatDateForInput = (timestamp: number | null): string => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    // 使用本地时区，避免UTC转换问题
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const parseInputDate = (value: string): number => {
    // 直接解析本地时间，不进行UTC转换
    const date = new Date(value);
    return Math.floor(date.getTime() / 1000);
  };

  const submitTopic = useCallback(async () => {
    if (!contract || !validateStep(currentStep)) return;

    setIsSubmitting(true);
    setMessage("正在创建议题...");

    try {
      const tx = await (contract as any).launchTopic(
        formData.name.trim(),
        formData.details.trim(),
        formData.options.map(opt => opt.trim()),
        BigInt(formData.startTime!),
        BigInt(formData.endTime!),
        1
      );

      setMessage("交易已提交，等待确认...");
      const receipt = await tx.wait();
      setMessage(`议题创建成功！交易哈希: ${receipt?.hash}`);
    } catch (error: any) {
      setMessage(`创建失败: ${error?.message || '未知错误'}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [contract, formData, currentStep]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="input-group">
              <label className="label">议题标题 *</label>
              <input
                type="text"
                className={`input ${errors.name ? 'border-red-500' : ''}`}
                placeholder="请输入简洁明了的议题标题"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>
            <div className="input-group">
              <label className="label">议题描述</label>
              <textarea
                className="input"
                rows={4}
                placeholder="详细描述投票议题的背景和目的（可选）"
                value={formData.details}
                onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">投票选项</h3>
                <p className="text-slate-400 text-sm">添加用户可以选择的选项</p>
              </div>
              <button
                onClick={addOption}
                disabled={formData.options.length >= 10}
                className="btn-outline text-sm"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加选项
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                  />
                  {formData.options.length > 2 && (
                    <button
                      onClick={() => removeOption(index)}
                      className="btn-danger p-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {errors.options && <p className="text-red-400 text-sm">{errors.options}</p>}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="input-group">
                <label className="label">开始时间 *</label>
                <input
                  type="datetime-local"
                  className={`input ${errors.time ? 'border-red-500' : ''}`}
                  value={formatDateForInput(formData.startTime)}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: parseInputDate(e.target.value) }))}
                />
              </div>
              <div className="input-group">
                <label className="label">结束时间 *</label>
                <input
                  type="datetime-local"
                  className={`input ${errors.time ? 'border-red-500' : ''}`}
                  value={formatDateForInput(formData.endTime)}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: parseInputDate(e.target.value) }))}
                />
              </div>
            </div>
            
            {errors.time && <p className="text-red-400 text-sm">{errors.time}</p>}
            
            <div className="card bg-blue-500/10 border-blue-500/20">
              <h4 className="text-blue-400 font-semibold mb-2">⏰ 时间设置说明</h4>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• 开始时间必须晚于当前时间</li>
                <li>• 结束时间必须晚于开始时间</li>
                <li>• 建议给用户足够的投票时间</li>
                <li>• 时间一旦设定无法修改</li>
              </ul>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="card bg-slate-800/30">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">议题预览</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-200 mb-1">标题</h4>
                  <p className="text-slate-300">{formData.name}</p>
                </div>
                {formData.details && (
                  <div>
                    <h4 className="font-medium text-slate-200 mb-1">描述</h4>
                    <p className="text-slate-300">{formData.details}</p>
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-slate-200 mb-2">选项 ({formData.options.length})</h4>
                  <div className="space-y-2">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="text-slate-300">{option}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-slate-200 mb-1">开始时间</h4>
                    <p className="text-slate-300">
                      {formData.startTime ? new Date(formData.startTime * 1000).toLocaleString('zh-CN') : ''}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-200 mb-1">结束时间</h4>
                    <p className="text-slate-300">
                      {formData.endTime ? new Date(formData.endTime * 1000).toLocaleString('zh-CN') : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>

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
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* 页面头部 */}
      <div className="page-header">
        <h1 className="page-title">创建投票议题</h1>
        <p className="page-subtitle">通过简单的步骤创建一个新的投票议题</p>
      </div>

      {/* 步骤指示器 */}
      <div className="card">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className={`flex items-center space-x-3 ${
                currentStep >= step.number ? 'text-blue-400' : 'text-slate-500'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  currentStep > step.number ? 'bg-blue-600 text-white' :
                  currentStep === step.number ? 'bg-blue-600 text-white' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {currentStep > step.number ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <div className="hidden sm:block">
                  <div className="font-medium">{step.title}</div>
                  <div className="text-xs text-slate-500">{step.description}</div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`hidden sm:block w-16 h-px mx-4 ${
                  currentStep > step.number ? 'bg-blue-600' : 'bg-slate-700'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 步骤内容 */}
      <div className="card min-h-[400px]">
        {renderStepContent()}
      </div>

      {/* 导航按钮 */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          上一步
        </button>

        {currentStep < 4 ? (
          <button onClick={nextStep} className="btn-primary">
            下一步
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <button
            onClick={submitTopic}
            disabled={isSubmitting}
            className="btn-success disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                创建中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                创建议题
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}