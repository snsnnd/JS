import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Activity, TrendingUp, AlertCircle, Users } from 'lucide-react';
import { BASE_URL } from '../../config';

export default function Dashboard({ token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/doctor/dashboard_stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (error) {
        console.error("大屏数据加载失败", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <Activity className="w-10 h-10 animate-spin mb-4 text-blue-500" />
        <p>正在同步全院真实检测数据...</p>
      </div>
    );
  }

  const { 
    total_records = 0, 
    high_risk_rate = 0, 
    months_labels = ['1', '2', '3', '4', '5', '6'],
    monthly_trends = [0, 0, 0, 0, 0, 0], 
    z21_distribution = [],
    risk_distribution = { high: 0, low: 0, critical: 0, unanalyzed: 0 }
  } = stats || {};

  // 🥧 计算饼图百分比
  const totalPie = risk_distribution.high + risk_distribution.low + risk_distribution.critical + risk_distribution.unanalyzed || 1;
  const pHigh = (risk_distribution.high / totalPie) * 100;
  const pCrit = (risk_distribution.critical / totalPie) * 100;
  const pLow = (risk_distribution.low / totalPie) * 100;

  const pieGradient = `conic-gradient(
    #ef4444 0% ${pHigh}%, 
    #f59e0b ${pHigh}% ${pHigh + pCrit}%, 
    #10b981 ${pHigh + pCrit}% ${pHigh + pCrit + pLow}%, 
    #f3f4f6 ${pHigh + pCrit + pLow}% 100%
  )`;

  // 📈 折线图 SVG 渲染计算
  const maxVal = Math.max(...monthly_trends, 10); // 至少给 10 的高度防止变成直线
  const svgWidth = 600;
  const svgHeight = 160;
  const padding = 20;
  
  // 计算每个数据点的坐标
  const points = monthly_trends.map((val, i) => {
    const x = padding + (i * (svgWidth - 2 * padding) / 5);
    const y = svgHeight - padding - (val / maxVal) * (svgHeight - 2 * padding);
    return `${x},${y}`;
  }).join(" ");
  
  // 底部渐变区域闭合坐标
  const areaPoints = `${padding},${svgHeight - padding} ${points} ${svgWidth - padding},${svgHeight - padding}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-gray-900">院区数据全景大屏</h2>
        <div className="text-xs text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
          实时大盘同步
        </div>
      </div>
      
      {/* 顶部 KPI 卡片 */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute right-[-10%] top-[-10%] p-8 bg-blue-50 rounded-full group-hover:scale-110 transition-transform">
            <Users className="w-12 h-12 text-blue-100" />
          </div>
          <p className="text-sm text-gray-500 mb-1">真实总测序档案</p>
          <h3 className="text-4xl font-bold text-gray-900">{total_records} <span className="text-lg text-gray-400 font-normal">例</span></h3>
          <p className="text-xs text-green-500 mt-2 flex items-center font-medium"><TrendingUp className="w-3 h-3 mr-1"/> 数据接口正常</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-3xl border border-red-100 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">AI 高风险检出率</p>
          <h3 className="text-4xl font-bold text-red-500">{high_risk_rate}%</h3>
          <p className="text-xs text-gray-400 mt-2">基于双引擎判断结果</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">AI 覆盖率</p>
            <h3 className="text-4xl font-bold text-blue-600">
              {totalPie > 0 ? Math.round(((totalPie - risk_distribution.unanalyzed) / totalPie) * 100) : 0}%
            </h3>
            <p className="text-xs text-gray-400 mt-2">已完成推演比例</p>
          </div>
          <Activity className="w-12 h-12 text-blue-100" />
        </div>
      </div>

      {/* 底部三大图表 */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        
        {/* 📈 图表 1：动态 SVG 折线图 */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">近六个月真实建档走势</h3>
          </div>
          
          <div className="flex-1 w-full relative">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* 面积渐变 */}
              <polygon points={areaPoints} fill="url(#lineGradient)" />
              
              {/* 主折线 */}
              <polyline 
                points={points} 
                fill="none" stroke="#3b82f6" strokeWidth="4" 
                strokeLinecap="round" strokeLinejoin="round" 
              />
              
              {/* 拐点数值与圆点 */}
              {monthly_trends.map((val, i) => {
                const x = padding + (i * (svgWidth - 2 * padding) / 5);
                const y = svgHeight - padding - (val / maxVal) * (svgHeight - 2 * padding);
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="5" fill="#fff" stroke="#3b82f6" strokeWidth="3" />
                    <text x={x} y={y - 15} textAnchor="middle" fill="#6b7280" fontSize="14" fontWeight="bold">{val}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* X轴标签 */}
          <div className="flex justify-between text-xs text-gray-400 font-medium px-2 mt-2">
            {months_labels.map((m, i) => <span key={i}>{m}</span>)}
          </div>
        </div>

        {/* 🥧 图表 2：全新饼图 */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center relative">
          <h3 className="font-bold text-gray-800 absolute top-6 left-6">人群风险分布</h3>
          
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="w-36 h-36 rounded-full shadow-inner mt-8" style={{ background: pieGradient }}></motion.div>
          
          <div className="w-full grid grid-cols-2 gap-3 mt-8 px-4">
            <div className="flex items-center text-xs"><span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>高风险 ({risk_distribution.high})</div>
            <div className="flex items-center text-xs"><span className="w-3 h-3 rounded-full bg-amber-500 mr-2"></span>临界 ({risk_distribution.critical})</div>
            <div className="flex items-center text-xs"><span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>低风险 ({risk_distribution.low})</div>
            <div className="flex items-center text-xs"><span className="w-3 h-3 rounded-full bg-gray-200 mr-2"></span>待分析 ({risk_distribution.unanalyzed})</div>
          </div>
        </div>

        {/* 📉 图表 3：散点图 */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-gray-800">Chr21 Z-Score 分布</h3>
            <AlertCircle className="w-4 h-4 text-gray-300" />
          </div>
          <p className="text-[10px] text-gray-400 mb-4">散点展示所有样本 Z 值 (Z {'>'} 3 提示高危)</p>
          
          <div className="flex-1 border-b-2 border-l-2 border-gray-200 relative min-h-[150px]">
             <div className="absolute top-[20%] w-full border-t border-red-300 border-dashed z-0"><span className="text-[9px] text-red-400 absolute right-0 -top-4 font-bold">Z = 3.0</span></div>
             <div className="absolute top-[50%] w-full border-t border-gray-200 z-0"><span className="text-[9px] text-gray-400 absolute right-0 -top-4">Z = 0.0</span></div>
             
             {z21_distribution.map((z, idx) => {
                let topPos = 50 - (z * 10); 
                if (topPos < 5) topPos = 5; if (topPos > 95) topPos = 95;
                const leftPos = (idx * (90 / (z21_distribution.length || 1))) + 5; 
                const isDanger = z > 3;

                return (
                  <motion.div 
                    key={idx} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (idx % 20) * 0.02 }}
                    className={`absolute w-2 h-2 rounded-full cursor-help hover:scale-150 ${isDanger ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] z-10' : 'bg-blue-400/50 z-0'}`}
                    style={{ top: `${topPos}%`, left: `${leftPos}%` }}
                    title={`Z-Value: ${z}`}
                  />
                );
             })}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
