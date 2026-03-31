import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, UserCheck, PieChart, Database, LogOut, Search, MessageSquare, Loader2, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../../config';

import Diagnosis from './Diagnosis';
import Dashboard from './Dashboard';
import MLOps from './MLOps';
import Messages from './Messages';

export default function DoctorWorkspace({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('diagnosis'); 
  const [patientsList, setPatientsList] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadData, setUnreadData] = useState({ total: 0, details: {} });

  const fetchPatients = async () => {
    setLoadingList(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/doctor/patients`, { headers: { 'Authorization': `Bearer ${user.token}` }});
      setPatientsList(response.data);
    } catch (error) { 
      if (error.response?.status === 401) onLogout(); 
    } finally { setLoadingList(false); }
  };

  useEffect(() => {
    fetchPatients();
    const fetchUnread = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/chat/unread`, { headers: { 'Authorization': `Bearer ${user.token}` }});
        setUnreadData(res.data);
      } catch(e) {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 3000); 
    return () => clearInterval(interval);
  }, [user.token]);

  const filteredPatients = patientsList.filter(p => p.username.toLowerCase().includes(searchQuery.toLowerCase()) || (p.name && p.name.includes(searchQuery)));

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-7xl h-[85vh] bg-white/80 backdrop-blur-3xl shadow-2xl rounded-[3rem] border border-white/50 flex overflow-hidden z-10">
      
      {/* 侧边导航栏 */}
      <div className="w-24 bg-gray-900 flex flex-col items-center py-8 space-y-8">
        <div className="p-3 bg-blue-500 rounded-2xl shadow-lg shadow-blue-500/20"><Activity className="w-6 h-6 text-white"/></div>
        <div className="flex-1 flex flex-col space-y-4">
          {[ { id: 'diagnosis', icon: UserCheck, title: '门诊' }, { id: 'dashboard', icon: PieChart, title: '大屏' }, { id: 'messages', icon: MessageSquare, title: '私信', badge: unreadData.total }, { id: 'system', icon: Database, title: 'MLOps' } ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative p-4 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-white/10 text-white shadow-inner' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
              <tab.icon className="w-6 h-6" />
              {tab.badge > 0 && <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-bounce shadow-md">{tab.badge}</span>}
            </button>
          ))}
        </div>
        <button onClick={onLogout} className="p-4 text-gray-500 hover:text-red-400"><LogOut className="w-6 h-6" /></button>
      </div>

      {/* 患者队列栏 (已移除高危报警模块) */}
      {(activeTab === 'diagnosis' || activeTab === 'messages') && (
        <div className="w-80 bg-gray-50/50 border-r border-gray-200 p-6 flex flex-col overflow-y-auto scrollbar-hide">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center"><UserCheck className="w-5 h-5 mr-2 text-blue-600"/> 队列</h2>
            <button onClick={fetchPatients} className="p-1.5 text-gray-400 hover:text-blue-500"><RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} /></button>
          </div>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-blue-500" placeholder="搜索ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          
          {/* 常规队列 */}
          <div className="space-y-3">
            {loadingList ? <div className="py-20 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" />同步中</div> :
              filteredPatients.map(p => {
                const unread = unreadData.details[p.username] || 0; 
                return (
                  <div key={p.id} onClick={() => setSelectedPatient(p)} className={`p-4 rounded-2xl cursor-pointer border transition-all ${selectedPatient?.id === p.id ? 'bg-blue-50 border-blue-200 shadow-sm scale-[1.02]' : 'bg-white border-transparent hover:border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-bold text-gray-800">{p.name || p.username}</h3>
                      <div className="flex items-center space-x-2">
                        {unread > 0 ? (
                          <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm animate-pulse">{unread} 新消息</span>
                        ) : (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.reportData?.risk_level === '高风险' ? 'bg-red-100 text-red-700' : p.hasReport ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {p.reportData?.risk_level === '高风险' ? '高危' : p.hasReport ? '已建档' : '待分析'}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono">ID: {p.username} | 孕 {p.weeks || '--'}周</p>
                  </div>
                )
              })
            }
          </div>
        </div>
      )}

      {/* 工作区 */}
      <div className="flex-1 p-8 overflow-y-auto bg-white/40">
        <AnimatePresence mode="wait">
          {activeTab === 'diagnosis' && <Diagnosis key="diagnosis" token={user.token} selectedPatient={selectedPatient} onReportGenerated={fetchPatients} onJumpToChat={() => setActiveTab('messages')} />}
          {activeTab === 'dashboard' && <Dashboard key="dashboard" token={user.token} />}
          {activeTab === 'messages' && <Messages key="messages" selectedPatient={selectedPatient} token={user.token} />}
          {activeTab === 'system' && <MLOps key="system" token={user.token} />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
