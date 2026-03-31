import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Apple, Info, CalendarClock, Bell } from 'lucide-react';

const PREGNANCY_KNOWLEDGE = [
  { week: 12, fruit: '🍋 柠檬', desc: '胎儿器官基本成型，开始有了轻微的小动作，但您可能还感觉不到哦。' },
  { week: 16, fruit: '🥑 牛油果', desc: '宝宝听力正在形成，可以开始播放轻柔的音乐进行胎教啦！' },
  { week: 20, fruit: '🍌 香蕉', desc: '胎动变得明显，宝宝正在快速长肉，吞咽功能也逐渐完善。' },
  { week: 24, fruit: '🌽 玉米', desc: '宝宝的大脑快速发育，味蕾开始工作，对外界光线也有了反应。' }
];

const NUTRITION_ADVICE = {
  '偏瘦': '医生叮嘱：您当前处于【偏瘦】状态，建议本周适当增加优质脂肪和高蛋白食物的摄入，少量多餐。',
  '正常': '医生叮嘱：体重控制得很棒！保持营养均衡，可适当增加钙质（牛奶）和铁元素（瘦肉）摄入。',
  '偏胖': '医生叮嘱：孕期需严控体重异常增长。建议本周减少快碳（白米面、甜点）摄入，增加粗粮比例。'
};

export default function Calendar() {
  const [profile] = useState({ current_weeks: 16.5, bmi_group: '正常' });
  const currentStage = PREGNANCY_KNOWLEDGE.reverse().find(k => profile.current_weeks >= k.week) || PREGNANCY_KNOWLEDGE[0];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-10">
      
      {/* 动态孕周时光轴 */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-pink-100 overflow-hidden relative">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-pink-50 rounded-full blur-3xl opacity-60"></div>
        <h3 className="font-bold text-gray-800 flex items-center mb-6"><Heart className="w-5 h-5 mr-2 text-pink-500 fill-pink-500" /> 宝宝成长日记</h3>
        <div className="flex items-start space-x-6 relative">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ yoyo: Infinity, duration: 2 }} className="w-20 h-20 bg-gradient-to-br from-pink-100 to-rose-50 rounded-full flex items-center justify-center text-4xl shadow-inner border-4 border-white z-10 shrink-0">
            {currentStage.fruit.split(' ')[0]}
          </motion.div>
          <div className="flex-1 pt-1 z-10">
            <p className="text-xs text-pink-500 font-bold mb-1">孕 {profile.current_weeks} 周</p>
            <h4 className="text-base font-bold text-gray-800 mb-2">宝宝像个{currentStage.fruit.split(' ')[1]}大小</h4>
            <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">{currentStage.desc}</p>
          </div>
        </div>
      </div>

      {/* AI 智能营养管家 */}
      <h3 className="font-bold text-gray-800 text-lg ml-2 flex items-center mt-8"><Apple className="w-5 h-5 mr-2 text-green-500" /> 专属营养与管家</h3>
      <div className="grid grid-cols-1 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-2xl border border-green-100 shadow-sm relative">
          <div className="flex items-center mb-2"><div className="p-1.5 bg-green-500 text-white rounded-lg mr-2"><Apple className="w-3 h-3"/></div><span className="font-bold text-green-800 text-sm">本周膳食处方</span></div>
          <p className="text-xs text-green-700 leading-relaxed font-medium">{NUTRITION_ADVICE[profile.bmi_group]}</p>
        </motion.div>
      </div>

      {/* 还原：30天原版大日历与提醒 */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mt-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-800 flex items-center"><CalendarClock className="w-5 h-5 text-blue-500 mr-2"/> 本月产检日历</h3>
          <div className="flex space-x-2 text-[10px] text-gray-500"><span className="flex items-center"><div className="w-2 h-2 rounded-full bg-pink-400 mr-1"></div>复查</span><span className="flex items-center"><div className="w-2 h-2 rounded-full bg-blue-400 mr-1"></div>常规</span></div>
        </div>
        
        {/* 日历网格 */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-gray-400 mb-3">
          <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-sm">
          {[...Array(30)].map((_, i) => (
            <div key={i} className={`p-3 rounded-xl transition-all ${i===14 ? 'bg-pink-500 text-white font-bold shadow-md shadow-pink-200 scale-110' : i===22 ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100' : 'text-gray-700 hover:bg-gray-50 cursor-pointer'}`}>
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* 日历下方的提醒助手 */}
      <div className="space-y-3 mt-6">
        <h4 className="font-bold text-sm text-gray-800 ml-1">日程智能提醒</h4>
        <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100 flex items-start space-x-3">
          <div className="p-2 bg-pink-500 text-white rounded-xl shadow-sm"><Bell className="w-4 h-4"/></div>
          <div><p className="font-bold text-sm text-gray-800">采血与羊穿复查提醒</p><p className="text-xs text-gray-500 mt-1">15日 (明天) | 建议带好建档手册，放宽心配合医生。</p></div>
        </div>
      </div>
    </motion.div>
  );
}
