import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Bell, FileText, CalendarDays, MessageSquare, Activity } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../../config';

import Report from './Report';
import Calendar from './Calendar';
import Chat from './Chat';

export default function PatientPortal({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('report'); 
  const [unreadCount, setUnreadCount] = useState(0); // 🚀 保存未读消息总数

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/chat/unread`, { headers: { 'Authorization': `Bearer ${user.token}` }});
        setUnreadCount(res.data.total);
      } catch(e) {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 3000); // 3秒刷新一次
    return () => clearInterval(interval);
  }, [user.token]);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-7xl h-[85vh] bg-white/80 backdrop-blur-3xl shadow-2xl rounded-[3rem] border border-white/50 flex overflow-hidden z-10">
      
      {/* 宽屏左侧导航栏 */}
      <div className="w-64 bg-pink-50/50 backdrop-blur-xl border-r border-pink-100 flex flex-col py-8 px-6 relative">
        <div className="flex items-center space-x-3 mb-12">
          <div className="p-3 bg-pink-500 rounded-2xl shadow-lg shadow-pink-200"><Activity className="w-6 h-6 text-white"/></div>
          <div><h2 className="font-bold text-gray-800 text-lg">孕期云助理</h2><p className="text-[10px] text-pink-500 font-medium">专属健康档案</p></div>
        </div>

        <div className="flex-1 flex flex-col space-y-3">
          {[ 
            { id: 'report', icon: FileText, label: '我的检测报告' }, 
            { id: 'calendar', icon: CalendarDays, label: '产检日程表' }, 
            { id: 'chat', icon: MessageSquare, label: '医生在线咨询', badge: unreadCount } // 👈 绑定未读数
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex items-center px-4 py-3.5 rounded-2xl transition-all font-medium text-sm ${activeTab === tab.id ? 'bg-white text-pink-600 shadow-sm border border-pink-100' : 'text-gray-500 hover:bg-white/50 hover:text-gray-800'}`}>
              <tab.icon className={`w-5 h-5 mr-3 ${activeTab === tab.id ? 'text-pink-500' : 'text-gray-400'}`} />
              {tab.label}
              
              {/* 🚀 渲染未读小红点 */}
              {tab.badge > 0 && (
                <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-bounce shadow-md">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto bg-white/60 p-4 rounded-2xl border border-white shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-pink-300 to-rose-300 rounded-full flex items-center justify-center text-white font-bold">{user.username.charAt(0).toUpperCase()}</div>
            <div className="text-left"><p className="text-sm font-bold text-gray-800">{user.username}</p><p className="text-[10px] text-green-500 flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>已登录</p></div>
          </div>
          <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-white rounded-xl shadow-sm"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex-1 p-10 overflow-y-auto bg-white/40">
        <AnimatePresence mode="wait">
          {activeTab === 'report' && <Report key="report" token={user.token} />}
          {activeTab === 'calendar' && <Calendar key="calendar" />}
          {activeTab === 'chat' && <Chat key="chat" token={user.token} />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
