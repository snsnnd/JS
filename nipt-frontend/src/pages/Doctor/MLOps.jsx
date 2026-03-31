import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, FileText, RefreshCw, Loader2 } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../../config';

export default function MLOps({ token }) {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    // 真实拉取模型评估指标
    axios.get(`${BASE_URL}/api/doctor/model_metrics`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
    }).then(res => setMetrics(res.data))
      .catch(err => console.error("加载模型指标失败", err));
  }, [token]);

  if (!metrics) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 mt-20">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-purple-400" />
        <p>正在读取云端模型权重与评估报告...</p>
      </div>
    );
  }

  // 计算 iForest 进度条的百分比 (为了UI展示好看做的一个映射)
  const contaminationPercent = Math.min((metrics.iforest.contamination * 100) * 2, 100); 

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">MLOps 模型持续演进评估</h2>
      
      {/* 🚀 XGBoost 专家引擎真实指标 */}
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-gray-800 text-xl flex items-center">
              <FileText className="w-6 h-6 text-indigo-500 mr-2"/> XGBoost 有监督专家引擎
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              版本: {metrics.xgboost.version} | 最后重训: {metrics.xgboost.last_trained}
            </p>
          </div>
          <button className="px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm flex items-center hover:bg-indigo-100 transition-colors">
            <RefreshCw className="w-4 h-4 mr-2" /> 增量重训
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
          <div className="p-4 bg-gray-50 rounded-2xl">
            <p className="text-xs text-gray-500">Accuracy (准确率)</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.xgboost.accuracy}%</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-2xl">
            <p className="text-xs text-gray-500">Recall (敏感度)</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.xgboost.recall}%</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-2xl">
            <p className="text-xs text-gray-500">Precision (精确率)</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.xgboost.precision}%</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-2xl">
            <p className="text-xs text-gray-500">AUC-ROC 面积</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.xgboost.auc_roc}</p>
          </div>
        </div>
      </div>

      {/* 🚀 iForest 异常检测真实指标 */}
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="font-bold text-gray-800 text-xl flex items-center">
              <Activity className="w-6 h-6 text-purple-500 mr-2"/> iForest 隔离森林防线
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              版本: {metrics.iforest.version} | 专注于罕见染色体变异兜底
            </p>
          </div>
          <button className="px-5 py-2.5 bg-purple-50 text-purple-600 rounded-xl font-bold text-sm flex items-center hover:bg-purple-100 transition-colors">
            <RefreshCw className="w-4 h-4 mr-2" /> 触发全量重训
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span className="text-gray-700">正常样本决策边界</span>
              <span className="text-purple-600 font-bold">Threshold: {metrics.iforest.threshold}</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
               {/* 用 css 负值逻辑稍微模拟一下进度条位置 */}
              <motion.div initial={{ width: 0 }} animate={{ width: `85%` }} className="h-full bg-purple-400 rounded-full"></motion.div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">打分低于该阈值将被引擎判定为强阳性高危群体。</p>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span className="text-gray-700">特征空间分布散度</span>
              <span className="text-purple-600 font-bold">Contamination: {metrics.iforest.contamination}</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${contaminationPercent}%` }} className="h-full bg-purple-400 rounded-full"></motion.div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">模型容忍的异常点比例先验假设。</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
