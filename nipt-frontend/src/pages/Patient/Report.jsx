import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, RefreshCw, CheckCircle2, ShieldAlert, Activity, FileText } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../../config';

export default function Report({ token }) {
  const [latestReport, setLatestReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMyReports = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/patient/my-reports`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.data?.length > 0) setLatestReport(response.data[0]);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMyReports(); }, []);

  if (loading) return <div className="flex justify-center py-20"><Activity className="w-8 h-8 animate-spin text-pink-400" /></div>;

  if (!latestReport) {
    return (
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-pink-50/50 p-8 rounded-3xl text-center border border-pink-100/50 mt-10">
        <Clock className="w-12 h-12 text-pink-300 mx-auto mb-4" />
        <h3 className="font-bold text-gray-800 text-lg">暂无检测报告</h3>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">您的测序数据可能还未出具，或医生正在进行 AI 综合研判，请耐心等待。</p>
        <button onClick={fetchMyReports} className="mt-6 px-5 py-2.5 bg-white text-pink-600 rounded-xl shadow-sm border border-pink-100 text-xs font-bold flex items-center mx-auto"><RefreshCw className="w-3 h-3 mr-2"/> 手动刷新</button>
      </motion.div>
    );
  }

  const isHighRisk = latestReport.analysis_result?.risk_level === '高风险';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">
      
      {/* 头部大卡片：AI 诊断结论 */}
      <div className={`p-8 rounded-3xl text-white relative overflow-hidden shadow-lg ${isHighRisk ? 'bg-gradient-to-br from-red-400 to-rose-600 shadow-red-200' : 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-green-200'}`}>
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
        <div className="flex items-center space-x-4 mb-4 relative z-10">
          {isHighRisk ? <ShieldAlert className="w-12 h-12 text-white" /> : <CheckCircle2 className="w-12 h-12 text-white" />}
          <div>
            <h3 className="font-bold text-2xl">综合诊断：{latestReport.analysis_result?.risk_level}</h3>
            <p className="text-sm opacity-90 mt-1">NIPT 检测流水号: 100{latestReport.id}XF</p>
          </div>
        </div>
      </div>

      {/* 模块 1：医生嘱托 */}
      <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-sm relative">
        <div className="absolute top-0 left-6 w-8 h-1 bg-pink-400 rounded-b-md"></div>
        <h4 className="font-bold text-gray-800 mb-4 flex items-center mt-2"><FileText className="w-5 h-5 text-pink-400 mr-2"/> 临床医师建议</h4>
        <div className="p-4 bg-gray-50 rounded-2xl text-sm text-gray-700 leading-relaxed border border-gray-100">
          经双引擎 AI 计算，系统建议您在 <span className="text-pink-600 font-bold text-base px-1">{latestReport.analysis_result?.recommended_weeks}</span> 周回院进行采血复查或羊水穿刺。请保持良好心态，谨遵医嘱。
        </div>
      </div>

      {/* 模块 2：生物标记物解读 (让页面显得丰满、硬核) */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h4 className="font-bold text-gray-800 mb-4 flex items-center"><Activity className="w-5 h-5 text-blue-400 mr-2"/> 核心生物学标记物分析</h4>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-600">AI 综合异常得分</span>
            <span className="font-mono font-bold text-gray-800">{latestReport.analysis_result?.anomaly_score}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-600">分析模型测序成功率</span>
            <span className="font-mono font-bold text-gray-800">{(latestReport.analysis_result?.expected_success_rate * 100).toFixed(1)}%</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 px-1 leading-relaxed">
            * 报告中的得分由 XGBoost 与 iForest 双重模型交叉推演得出。具体染色体（如 Chr13, Chr18, Chr21）的游离 DNA 浓度截断值已同步至主治医师系统。
          </p>
        </div>
      </div>
    </motion.div>
  );
}
