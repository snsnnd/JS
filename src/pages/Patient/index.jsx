import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, FileText, CalendarDays, MessageSquare, Activity, ArrowRight, HeartPulse, CalendarCheck, Smile, Frown, Meh, Edit3 } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../../config';

import Report from './Report';
import Calendar from './Calendar';
import Chat from './Chat';

export default function PatientPortal({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('calendar'); 
  const [unreadCount, setUnreadCount] = useState(0); 
  
  // 判定是否是首次建档
  const alreadyOnboarded = !!(user?.lmp && user?.bmi);
  const [hasOnboarded, setHasOnboarded] = useState(alreadyOnboarded);
  const isFirstTime = !alreadyOnboarded;

  const [computedProfile, setComputedProfile] = useState(() => {
    if (alreadyOnboarded) {
      const lmpDate = new Date(user.lmp);
      const today = new Date();
      const diffTime = Math.max(0, today - lmpDate);
      const currentWeeks = (diffTime / (1000 * 60 * 60 * 24 * 7)).toFixed(1);

      return {
        bmi: parseFloat(user.bmi),
        weeks: parseFloat(currentWeeks),
        bmiStatus: user.bmi > 24 ? '偏胖' : user.bmi < 18.5 ? '偏瘦' : '正常',
        psychStatus: user.psych_status || '良好'
      };
    }
    return null;
  });

  const [onboardStep, setOnboardStep] = useState(1);
  
  // 状态永远初始化为空，依靠后期的 fallback 逻辑来继承旧数据
  const [profileData, setProfileData] = useState({ 
    height: '', weight: '', lmp: '', mood: '' 
  });

  // 呼出修改档案
  const handleEditProfile = () => {
    setProfileData({ height: '', weight: '', lmp: '', mood: '' });
    setOnboardStep(1);
    setHasOnboarded(false);
  };

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/chat/unread`, { headers: { 'Authorization': `Bearer ${user.token}` }});
        setUnreadCount(res.data.total);
      } catch(e) {}
    };
    if (hasOnboarded) {
      fetchUnread();
      const interval = setInterval(fetchUnread, 3000); 
      return () => clearInterval(interval);
    }
  }, [user.token, hasOnboarded]);

  const handleFinishOnboard = async (selectedMood) => {
    // 🚀 核心逻辑：如果是空值，完美回退(Fallback)到 user 对象里的旧数据
    const finalMood = selectedMood || profileData.mood || user?.psych_status || '良好';
    const finalLmp = profileData.lmp || user?.lmp;
    const finalHeight = profileData.height || user?.height;
    const finalWeight = profileData.weight || user?.weight;
    
    const h = parseFloat(finalHeight) / 100;
    const w = parseFloat(finalWeight);
    const bmi = (w / (h * h)).toFixed(1);
    
    const lmpDate = new Date(finalLmp);
    const today = new Date();
    const diffTime = Math.max(0, today - lmpDate);
    const weeks = parseFloat((diffTime / (1000 * 60 * 60 * 24 * 7)).toFixed(1));

    if (weeks < 2.0) {
      alert("末次月经通常在几个月前哦，请检查您的日期是否正确！");
      setOnboardStep(1);
      return;
    }

    let moodScore = '良好';
    if (finalMood === '焦虑') moodScore = '轻度焦虑';
    if (finalMood === '抑郁') moodScore = '需要关注';

    const computed = { 
      bmi: parseFloat(bmi), 
      weeks: weeks,
      bmiStatus: bmi > 24 ? '偏胖' : bmi < 18.5 ? '偏瘦' : '正常',
      psychStatus: moodScore
    };

    try {
      await axios.post(`${BASE_URL}/api/patient/onboard`, {
        height: parseFloat(finalHeight),
        weight: parseFloat(finalWeight),
        bmi: computed.bmi,
        lmp: finalLmp,
        weeks: computed.weeks,
        psych_status: computed.psychStatus
      }, { headers: { 'Authorization': `Bearer ${user.token}` }});
      
      setComputedProfile(computed);
      setHasOnboarded(true);

      // 更新本地缓存，保证刷新不丢数据
      const updatedUser = { 
        ...user, 
        bmi: computed.bmi, 
        lmp: finalLmp, 
        height: finalHeight, 
        weight: finalWeight,
        psych_status: moodScore 
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

    } catch (error) {
      console.error("建档同步失败", error);
      setComputedProfile(computed);
      setHasOnboarded(true);
    }
  };

  if (!hasOnboarded) {
    return (
      <div className="w-full max-w-7xl h-[85vh] bg-white/90 backdrop-blur-3xl shadow-2xl rounded-[3rem] border border-white/50 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-pink-100 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-rose-100 rounded-full blur-3xl opacity-50"></div>
        
        <div className="z-10 w-full max-w-md bg-white/80 p-10 rounded-3xl shadow-xl border border-pink-50 text-center">
          <HeartPulse className="w-12 h-12 text-pink-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{isFirstTime ? '建立专属孕期档案' : '更新您的健康参数'}</h2>
          <p className="text-sm text-gray-500 mb-8">精准的参数能让 AI 模型给出最科学的建议</p>

          <AnimatePresence mode="wait">
            {onboardStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-4">
                <label className="block text-sm font-bold text-gray-700 text-left">您的末次月经时间是？</label>
                <div className="relative">
                  <CalendarCheck className="absolute left-3 top-3.5 w-5 h-5 text-pink-400" />
                  <input 
                    type="date" 
                    max={new Date().toISOString().split('T')[0]} 
                    value={profileData.lmp} 
                    onChange={e => setProfileData({...profileData, lmp: e.target.value})} 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-pink-400 text-gray-700" 
                  />
                </div>
                
                {/* 🚀 如果老用户没填，给予温柔的提示 */}
                {!isFirstTime && !profileData.lmp && (
                  <div className="text-xs text-pink-500 text-left mt-2 pl-1 bg-pink-50 p-2 rounded-lg border border-pink-100">
                    ✨ 当前留空，系统将自动沿用上次填写的日期 ({user.lmp})
                  </div>
                )}

                <button 
                  onClick={() => setOnboardStep(2)} 
                  // 🚀 核心：只有【第一次建档】且【没填】时才禁用！老用户随便点！
                  disabled={isFirstTime && !profileData.lmp} 
                  className="w-full bg-pink-500 text-white font-bold py-3.5 rounded-xl mt-6 flex justify-center items-center shadow-md shadow-pink-200 hover:bg-pink-600 disabled:opacity-50 transition-all"
                >
                  {isFirstTime || profileData.lmp ? '下一步' : '直接下一步 (保留原日期)'} <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </motion.div>
            )}

            {onboardStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-4">
                <label className="block text-sm font-bold text-gray-700 text-left">您的身高和孕前体重？</label>
                <div className="flex space-x-4">
                  <div className="relative flex-1">
                    <input 
                      type="number" 
                      // 🚀 核心：利用 placeholder 提示老用户原数据
                      placeholder={isFirstTime ? "身高" : `原数据: ${user.height}`} 
                      value={profileData.height} 
                      onChange={e => setProfileData({...profileData, height: e.target.value})} 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-pink-400 text-gray-700 text-center placeholder-gray-400" 
                    />
                    <span className="absolute right-3 top-3.5 text-gray-400 text-sm">cm</span>
                  </div>
                  <div className="relative flex-1">
                    <input 
                      type="number" 
                      placeholder={isFirstTime ? "体重" : `原数据: ${user.weight}`} 
                      value={profileData.weight} 
                      onChange={e => setProfileData({...profileData, weight: e.target.value})} 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-pink-400 text-gray-700 text-center placeholder-gray-400" 
                    />
                    <span className="absolute right-3 top-3.5 text-gray-400 text-sm">kg</span>
                  </div>
                </div>

                {!isFirstTime && (!profileData.height || !profileData.weight) && (
                  <div className="text-xs text-pink-500 text-left mt-2 pl-1 bg-pink-50 p-2 rounded-lg border border-pink-100">
                    ✨ 留空的项，系统将自动沿用您上次的记录
                  </div>
                )}

                <button 
                  onClick={() => setOnboardStep(3)} 
                  // 🚀 老用户直接放行！
                  disabled={isFirstTime && (!profileData.height || !profileData.weight)} 
                  className="w-full bg-pink-500 text-white font-bold py-3.5 rounded-xl mt-6 flex justify-center items-center shadow-md shadow-pink-200 hover:bg-pink-600 disabled:opacity-50 transition-all"
                >
                  {isFirstTime || (profileData.height && profileData.weight) ? '下一步' : '直接下一步 (保留原数据)'} <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </motion.div>
            )}

            {onboardStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-4">
                <label className="block text-sm font-bold text-gray-700 text-left">最近一周的情绪状态是？</label>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => handleFinishOnboard('轻松')} className="flex items-center p-4 bg-gray-50 hover:bg-pink-50 border border-gray-100 hover:border-pink-200 rounded-xl transition-all">
                    <Smile className="w-6 h-6 text-green-500 mr-3" /> <span className="text-sm font-bold text-gray-700">平和开心，充满期待</span>
                  </button>
                  <button onClick={() => handleFinishOnboard('焦虑')} className="flex items-center p-4 bg-gray-50 hover:bg-pink-50 border border-gray-100 hover:border-pink-200 rounded-xl transition-all">
                    <Meh className="w-6 h-6 text-amber-500 mr-3" /> <span className="text-sm font-bold text-gray-700">偶尔焦虑，容易疲惫</span>
                  </button>
                  <button onClick={() => handleFinishOnboard('抑郁')} className="flex items-center p-4 bg-gray-50 hover:bg-pink-50 border border-gray-100 hover:border-pink-200 rounded-xl transition-all">
                    <Frown className="w-6 h-6 text-red-400 mr-3" /> <span className="text-sm font-bold text-gray-700">经常失眠，情绪低落</span>
                  </button>
                </div>
                
                {/* 🚀 如果老用户不想测心理，直接点这行字秒进系统 */}
                {!isFirstTime && (
                  <button 
                    onClick={() => handleFinishOnboard(user.psych_status)} 
                    className="mt-5 w-full py-2 text-sm text-gray-400 hover:text-pink-500 underline transition-colors"
                  >
                    跳过评估，沿用上次的状态 ({user?.psych_status || '良好'})
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex justify-center mt-8 space-x-2">
            {[1, 2, 3].map(step => (
              <div key={step} className={`h-1.5 rounded-full transition-all duration-300 ${onboardStep >= step ? 'w-6 bg-pink-500' : 'w-2 bg-pink-200'}`}></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 主界面
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-7xl h-[85vh] bg-white/80 backdrop-blur-3xl shadow-2xl rounded-[3rem] border border-white/50 flex overflow-hidden z-10">
      
      <div className="w-64 bg-pink-50/50 backdrop-blur-xl border-r border-pink-100 flex flex-col py-8 px-6 relative">
        <div className="flex items-center space-x-3 mb-12">
          <div className="p-3 bg-pink-500 rounded-2xl shadow-lg shadow-pink-200"><Activity className="w-6 h-6 text-white"/></div>
          <div><h2 className="font-bold text-gray-800 text-lg">孕期云助理</h2><p className="text-[10px] text-pink-500 font-medium">专属健康档案</p></div>
        </div>

        <div className="flex-1 flex flex-col space-y-3">
          {[ 
            { id: 'report', icon: FileText, label: '我的检测报告' }, 
            { id: 'calendar', icon: CalendarDays, label: '产检日程表' }, 
            { id: 'chat', icon: MessageSquare, label: '医生在线咨询', badge: unreadCount }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex items-center px-4 py-3.5 rounded-2xl transition-all font-medium text-sm ${activeTab === tab.id ? 'bg-white text-pink-600 shadow-sm border border-pink-100' : 'text-gray-500 hover:bg-white/50 hover:text-gray-800'}`}>
              <tab.icon className={`w-5 h-5 mr-3 ${activeTab === tab.id ? 'text-pink-500' : 'text-gray-400'}`} />
              {tab.label}
              {tab.badge > 0 && (
                <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-bounce shadow-md">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto bg-white/60 p-4 rounded-2xl border border-white shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-tr from-pink-300 to-rose-300 rounded-full flex items-center justify-center text-white font-bold">{user.username.charAt(0).toUpperCase()}</div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-800">{user.username}</p>
              <p className="text-[10px] text-green-500 font-mono">孕 {computedProfile?.weeks} 周</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-2">
             <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${computedProfile?.psychStatus === '良好' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
               心理: {computedProfile?.psychStatus}
             </span>
             <div className="flex space-x-2">
               {/* 左下角修改档案按钮 */}
               <button onClick={handleEditProfile} className="p-1.5 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-md transition-colors" title="修改健康档案">
                 <Edit3 className="w-4 h-4" />
               </button>
               <button onClick={onLogout} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="退出账号">
                 <LogOut className="w-4 h-4" />
               </button>
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-10 overflow-y-auto bg-white/40">
        <AnimatePresence mode="wait">
          {activeTab === 'report' && <Report key="report" token={user.token} />}
          {activeTab === 'calendar' && <Calendar key="calendar" profile={computedProfile} token={user.token} />}
          {activeTab === 'chat' && <Chat key="chat" token={user.token} />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
