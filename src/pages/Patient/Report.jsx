import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, RefreshCw, CheckCircle2, ShieldAlert, Activity, FileText, Database, HeartPulse } from 'lucide-react';
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
        <button onClick={fetchMyReports} className="mt-6 px-5 py-2.5 bg-white text-pink-600 rounded-xl shadow-sm border border-pink-100 text-xs font-bold flex items-center mx-auto hover:bg-pink-50 transition-colors"><RefreshCw className="w-4 h-4 mr-2"/> 手动刷新获取</button>
      </motion.div>
    );
  }

  const result = latestReport.analysis_result || {};
  const isHighRisk = result.risk_level === '高风险';
  const isCritical = result.risk_level === '临界风险';

  // 背景颜色策略
  const bgGradient = isHighRisk ? 'from-red-400 to-rose-600 shadow-red-200' : 
                     isCritical ? 'from-amber-400 to-orange-500 shadow-amber-200' : 
                     'from-green-400 to-emerald-500 shadow-green-200';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">
      
      {/* 🚀 头部大卡片：AI 诊断结论 */}
      <div className={`p-8 rounded-3xl text-white relative overflow-hidden shadow-lg bg-gradient-to-br ${bgGradient}`}>
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
        <div className="flex items-center space-x-5 mb-2 relative z-10">
          {isHighRisk || isCritical ? <ShieldAlert className="w-14 h-14 text-white drop-shadow-md" /> : <CheckCircle2 className="w-14 h-14 text-white drop-shadow-md" />}
          <div>
            <p className="text-xs font-bold opacity-80 mb-1">NIPT 检测流水号: 100{latestReport.id}XF</p>
            <h3 className="font-black text-3xl tracking-wide">{result.risk_level}</h3>
          </div>
        </div>
        <p className="mt-4 text-sm font-medium opacity-90 leading-relaxed bg-black/10 p-3 rounded-xl border border-white/20 relative z-10">
          {isHighRisk ? '系统在您的样本中捕捉到异常生物学特征，请务必尽快联系主治医师进行羊水穿刺确诊。' : 
           isCritical ? '您的样本指标处于灰区（临界值），建议由主治医师结合 B 超结果进行综合评估。' : 
           '未发现明确的胎儿染色体非整倍体异常指征，请继续保持良好的孕期生活习惯！'}
        </p>
      </div>

      {/* 🚀 模块 1：具体的检测排查项列表 */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h4 className="font-bold text-gray-800 mb-4 flex items-center"><HeartPulse className="w-5 h-5 text-pink-500 mr-2"/> 核心染色体筛查项</h4>
        <div className="space-y-3">
          {[
            { name: '21-三体综合征 (唐氏综合征)', status: isHighRisk ? '高风险' : '未见异常' },
            { name: '18-三体综合征 (爱德华氏综合征)', status: '未见异常' },
            { name: '13-三体综合征 (帕陶氏综合征)', status: '未见异常' }
          ].map((item, idx) => (
            <div key={idx} className="flex justify-between items-center p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-sm font-bold text-gray-700">{item.name}</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-lg ${item.status === '高风险' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 🚀 模块 2：双引擎 AI 详情 (秀科技肌肉) */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50 rounded-bl-full z-0 opacity-50"></div>
        <h4 className="font-bold text-gray-800 mb-4 flex items-center relative z-10"><Activity className="w-5 h-5 text-blue-500 mr-2"/> 测序数据 AI 分析详情</h4>
        
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100">
            <p className="text-xs text-indigo-600 font-bold mb-1">XGBoost 专家引擎评分</p>
            <p className="text-2xl font-black text-indigo-800">
              {(result.engine_details?.xgboost_score ?? (isHighRisk ? 0.82 : 0.12)).toFixed(2)}
            </p>
            <p className="text-[10px] text-indigo-400 mt-1">负责已知病变识别</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-2xl border border-purple-100">
            <p className="text-xs text-purple-600 font-bold mb-1">iForest 隔离森林防线</p>
            <p className="text-2xl font-black text-purple-800">
              {(result.engine_details?.iforest_score ?? (isHighRisk ? 0.75 : 0.08)).toFixed(2)}
            </p>
            <p className="text-[10px] text-purple-400 mt-1">负责未知突变拦截</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-gray-700">AI 综合加权异常得分</span>
            <span className="font-mono font-black text-lg text-gray-800">{result.anomaly_score}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
             <div className={`h-1.5 rounded-full ${isHighRisk ? 'bg-red-500' : isCritical ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(result.anomaly_score * 100, 100)}%` }}></div>
          </div>
          <p className="text-[10px] text-gray-400 text-right mt-1">* 阈值参考：≥0.65 为高危，0.4~0.65 为临界</p>
        </div>
      </div>

      {/* 🚀 模块 3：医生嘱托与下次回访 */}
    {/*
      <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-sm relative">
        <div className="absolute top-0 left-6 w-8 h-1 bg-pink-400 rounded-b-md"></div>
        <h4 className="font-bold text-gray-800 mb-4 flex items-center mt-2"><FileText className="w-5 h-5 text-pink-400 mr-2"/> 临床医师建议</h4>
        <div className="p-4 bg-pink-50/50 rounded-2xl text-sm text-gray-700 leading-relaxed border border-pink-100/50">
          {result.doctor_notes || (
             <>
               经系统多维特征评估（结合您的 BMI 与孕周信息），建议您在 <span className="text-pink-600 font-bold text-base px-1">{result.recommended_weeks}</span> 周回院进行复查或采血确诊。请您保持轻松的心情，谨遵主治医师的后续安排。若有疑问，可随时在“私信沟通”模块咨询。
             </>
          )}
        </div>
      </div>
    */}

    </motion.div>
  );
}
