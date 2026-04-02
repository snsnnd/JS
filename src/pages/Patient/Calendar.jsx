import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// 🚀 顶部导入新增了 Activity 图标
import { Heart, Apple, CalendarClock, Bell, Share2, CheckCircle2, Clock, MapPin, DownloadCloud, Calendar as CalendarIcon, X, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../../config';

const PREGNANCY_KNOWLEDGE = [
  { week: 0, fruit: '🫐 蓝莓', desc: '宝宝还在努力扎根，请保持好心情，补充叶酸哦。' },
  { week: 8, fruit: '🍇 葡萄', desc: '胎心开始有力地跳动，宝宝的基本器官原型已经出现了。' },
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

export default function Calendar({ profile, token }) {
  const currentWeeks = profile?.weeks || 12.5;
  const bmiStatus = profile?.bmiStatus || '正常';
  const currentStage = [...PREGNANCY_KNOWLEDGE].reverse().find(k => currentWeeks >= k.week) || PREGNANCY_KNOWLEDGE[0];

  const targetWeeks = bmiStatus === '偏胖' ? 15.0 : 12.5; 
  const daysRemaining = Math.max(0, Math.floor((targetWeeks - currentWeeks) * 7));
  const isReadyForTest = daysRemaining <= 0;

  // 计算 AI 推荐的确切日期对象
  const recommendedDateObj = new Date();
  recommendedDateObj.setDate(recommendedDateObj.getDate() + daysRemaining);

  const getRecommendedDateStr = (dateObj = recommendedDateObj) => {
    const d = new Date(dateObj);
    d.setHours(9, 30, 0, 0); 
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [showPoster, setShowPoster] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getRecommendedDateStr());
  const [bookedRecord, setBookedRecord] = useState(null);

  // 真正的月份状态管理
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const emptyDays = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const handleDayDoubleClick = (dayNum) => {
    const doubleClickedDate = new Date(viewYear, viewMonth, dayNum);
    if (doubleClickedDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      return alert("无法预约过去的日期哦！");
    }
    setSelectedDate(getRecommendedDateStr(doubleClickedDate));
    setShowBooking(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDate) return alert('请先选择预约日期！');
    try {
      const res = await axios.post(`${BASE_URL}/api/patient/book-appointment`, {
        appointment_time: selectedDate,
        type: "NIPT复查"
      }, { headers: { 'Authorization': `Bearer ${token}` }});
      
      alert(res.data.message);
      setBookedRecord(selectedDate);
      setShowBooking(false);
    } catch (error) {
      setBookedRecord(selectedDate);
      setShowBooking(false);
      alert('已为您在系统中排期！');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-10 relative">
      
      {/* 顶栏：显示真实今天日期 */}
      <div className="flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <p className="text-gray-500 text-sm font-bold flex items-center"><CalendarIcon className="w-4 h-4 mr-2 text-pink-400"/> 今天是</p>
          <h2 className="text-xl font-black text-gray-800 mt-1">
            {today.getFullYear()}年{today.getMonth() + 1}月{today.getDate()}日
          </h2>
        </div>
        {bookedRecord ? (
          <div className="text-right">
            <p className="text-xs text-green-500 font-bold mb-1 flex items-center justify-end"><CheckCircle2 className="w-3 h-3 mr-1"/> 已预约产检</p>
            <p className="text-sm font-bold text-gray-800 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">{bookedRecord.replace('T', ' ')}</p>
          </div>
        ) : (
          <div className="text-right">
            <p className="text-xs text-pink-500 font-bold mb-1">未预约排期</p>
            <p className="text-sm font-bold text-gray-400">请在下方日历中双击日期</p>
          </div>
        )}
      </div>

      {/* 最佳检测窗口倒计时 */}
      <motion.div whileHover={{ scale: 1.01 }} className={`p-8 rounded-3xl shadow-sm text-white relative overflow-hidden ${isReadyForTest ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-pink-500 to-rose-400'}`}>
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
        <div className="flex justify-between items-center relative z-10">
          <div>
            <h2 className="text-xl font-bold mb-2 flex items-center">
              {isReadyForTest ? <><CheckCircle2 className="w-6 h-6 mr-2" /> 您已进入最佳检测窗口</> : <><Clock className="w-6 h-6 mr-2" /> 距最佳 NIPT 采血窗口还有</>}
            </h2>
            <p className="text-sm opacity-90 max-w-md leading-relaxed">
              {isReadyForTest 
                ? '此时游离 DNA 浓度充足，检测准确率最高。建议您双击下方日历进行预约，并呼叫家属陪同。'
                : `AI 分析：为了确保血液中提取到足量的胎儿 DNA，系统建议您在孕 ${targetWeeks} 周（约 ${daysRemaining} 天后）进行采血。`}
            </p>
          </div>
          <div className="text-center bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/30 shrink-0 ml-4">
            {isReadyForTest ? (
               <div className="text-2xl font-bold tracking-widest px-2">Now</div>
            ) : (
               <div className="flex items-end justify-center space-x-1">
                 <span className="text-4xl font-black">{daysRemaining}</span>
                 <span className="text-sm font-bold mb-1">天</span>
               </div>
            )}
          </div>
        </div>
        <button onClick={() => setShowPoster(true)} className="mt-6 px-5 py-2.5 bg-white text-pink-600 font-bold rounded-xl text-sm flex items-center shadow-lg hover:shadow-xl transition-all">
          <Share2 className="w-4 h-4 mr-2" /> 呼叫家属：生成陪护任务卡
        </button>
      </motion.div>

      {/* 宝宝时光轴和营养管家 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-pink-100 relative overflow-hidden">
          <h3 className="font-bold text-gray-800 flex items-center mb-6"><Heart className="w-5 h-5 mr-2 text-pink-500 fill-pink-500" /> 宝宝成长日记</h3>
          <div className="flex items-start space-x-6 relative">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ yoyo: Infinity, duration: 2 }} className="w-16 h-16 bg-gradient-to-br from-pink-100 to-rose-50 rounded-full flex items-center justify-center text-3xl shadow-inner border-4 border-white z-10 shrink-0">
              {currentStage.fruit.split(' ')[0]}
            </motion.div>
            <div className="flex-1 pt-1 z-10">
              <p className="text-xs text-pink-500 font-bold mb-1">当前孕 {currentWeeks} 周</p>
              <h4 className="text-sm font-bold text-gray-800 mb-2">像个{currentStage.fruit.split(' ')[1]}大小</h4>
              <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-2 rounded-xl border border-gray-100">{currentStage.desc}</p>
            </div>
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-3xl border border-green-100 shadow-sm relative">
          <div className="flex items-center mb-4"><div className="p-1.5 bg-green-500 text-white rounded-lg mr-2"><Apple className="w-4 h-4"/></div><span className="font-bold text-green-800">本周膳食处方</span></div>
          <p className="text-sm text-green-700 leading-relaxed font-medium">{NUTRITION_ADVICE[bmiStatus]}</p>
        </motion.div>
      </div>

      {/* 🚀 日历引擎 */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mt-6 relative">
        <div className="absolute top-6 right-6 flex items-center space-x-2">
          <button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ChevronLeft className="w-5 h-5"/></button>
          <button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ChevronRight className="w-5 h-5"/></button>
        </div>

        <div className="flex flex-col mb-6">
          <h3 className="font-black text-2xl text-gray-800 flex items-center mb-2">
            {viewYear}年 {viewMonth + 1}月
          </h3>
          <div className="flex items-center space-x-3 text-[10px] text-gray-500 font-bold">
            <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded">💡 双击任意日期即可快捷预约</span>
            <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div>当天</span>
            <span className="flex items-center"><div className="w-2 h-2 rounded-full border border-pink-400 border-dashed mr-1"></div>AI 推荐日</span>
            <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-pink-500 mr-1"></div>已预约</span>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400 mb-3">
          <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium">
          
          {/* 渲染月初空白格子 */}
          {[...Array(emptyDays)].map((_, i) => <div key={`empty-${i}`}></div>)}

          {/* 渲染当月的真实天数 */}
          {[...Array(daysInMonth)].map((_, i) => {
            const dayNum = i + 1;
            
            // 状态判定
            const isToday = dayNum === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
            const isRecommended = dayNum === recommendedDateObj.getDate() && 
                                  viewMonth === recommendedDateObj.getMonth() && 
                                  viewYear === recommendedDateObj.getFullYear();
            
            let isBooked = false;
            if (bookedRecord) {
              const bDate = new Date(bookedRecord);
              isBooked = dayNum === bDate.getDate() && viewMonth === bDate.getMonth() && viewYear === bDate.getFullYear();
            }

            // 🚀 核心修复：样式叠加机制，不再互斥
            let cellClasses = ['p-3 rounded-xl transition-all relative flex items-center justify-center select-none'];

            if (isBooked) {
              // 预约了必定是实心粉色，最高优先级
              cellClasses.push('bg-pink-500 text-white font-bold shadow-md shadow-pink-200 scale-105 z-10');
            } else {
              // 处理今天和推荐色的叠加组合
              if (isToday) {
                cellClasses.push('bg-blue-50 font-bold'); // 今天永远有浅蓝底色
              } else {
                cellClasses.push('hover:bg-gray-50 cursor-pointer');
              }

              if (isRecommended) {
                // 如果是推荐日，强制粉色边框和文字（覆盖今天的蓝色文字）
                cellClasses.push('border-2 border-dashed border-pink-400 text-pink-600'); 
              } else if (isToday) {
                // 只有在是今天，且不是推荐日的时候，才用蓝色边框
                cellClasses.push('border border-blue-200 text-blue-600');
              } else {
                cellClasses.push('text-gray-600');
              }
            }

            return (
              <div 
                key={`day-${i}`} 
                onDoubleClick={() => handleDayDoubleClick(dayNum)}
                className={cellClasses.join(' ')}
                title="双击进行预约"
              >
                {dayNum}
                {isBooked && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full shadow-sm"></div>}
                
                {/* 🚀 去掉了 !isToday 限制，哪怕推荐日是今天，也会跳动粉色点 */}
                {isRecommended && !isBooked && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse"></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 预约弹窗 */}
      <AnimatePresence>
        {showBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
             <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl relative">
                <button onClick={() => setShowBooking(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"><X className="w-5 h-5"/></button>
                <h3 className="text-xl font-black text-gray-800 mb-2">确认复查预约时间</h3>
                <p className="text-xs text-gray-500 mb-6">您可以微调具体的时间点（精确到分钟）</p>
                <input 
                  type="datetime-local" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 outline-none focus:border-pink-400 font-mono text-gray-700" 
                />
                <button onClick={handleConfirmBooking} className="w-full bg-pink-500 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-pink-600 transition-colors">确认排期并同步给医生</button>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 家属陪伴海报 */}
      <AnimatePresence>
        {showPoster && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden relative">
              <div className="bg-gradient-to-b from-pink-50 to-rose-100 p-8 pb-6 relative border-[8px] border-white">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Heart className="w-24 h-24 text-pink-500 fill-pink-500"/></div>
                <h2 className="text-2xl font-black text-pink-600 mb-1">准爸爸陪诊任务单</h2>
                <p className="text-xs font-bold text-gray-500 mb-4">专属孕期云助理 AI 测算签发</p>
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white mb-5">
                  <p className="text-xs text-gray-500 mb-1">已定/预计采血日</p>
                  <p className="text-lg font-bold text-gray-800 flex items-center"><CalendarClock className="w-5 h-5 text-pink-400 mr-2"/> {bookedRecord ? bookedRecord.replace('T', ' ') : getRecommendedDateStr().replace('T', ' ')}</p>
                </div>
                <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center"><MapPin className="w-4 h-4 mr-1 text-pink-500"/> 出发前准备清单</h3>
                <ul className="space-y-2 text-xs text-gray-700 font-medium mb-5">
                  <li className="flex items-start"><span className="text-pink-600 mr-2">✓</span>携带好双方身份证及建档小结。</li>
                  <li className="flex items-start"><span className="text-pink-600 mr-2">✓</span>NIPT 无需空腹，请准备好丰盛早餐！</li>
                </ul>

                {/* 🚀 新增：院内智能陪诊指南模块 */}
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center"><Activity className="w-4 h-4 mr-1 text-pink-500"/> 院内智能陪诊指南</h3>
                <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white space-y-3 relative z-10">
                  <div className="flex items-start">
                    <div className="w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px] font-bold mr-2 shrink-0 mt-0.5">1</div>
                    <p className="text-xs text-gray-700"><span className="font-bold text-pink-600">一楼签到：</span>自助机刷身份证，打印指引单</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px] font-bold mr-2 shrink-0 mt-0.5">2</div>
                    <p className="text-xs text-gray-700"><span className="font-bold text-pink-600">三楼产科：</span>引导孕妈候诊，陪伴医生开单</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px] font-bold mr-2 shrink-0 mt-0.5">3</div>
                    <p className="text-xs text-gray-700"><span className="font-bold text-pink-600">二楼检验：</span>扫码缴费后抽血，帮忙按压针眼</p>
                  </div>
                </div>

              </div>
              <div className="p-4 bg-white flex space-x-3">
                <button onClick={() => setShowPoster(false)} className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 rounded-xl">关闭</button>
                <button onClick={() => { alert('已保存长图！'); setShowPoster(false); }} className="flex-[2] py-3 text-white font-bold bg-pink-500 rounded-xl flex justify-center items-center">
                  <DownloadCloud className="w-5 h-5 mr-2"/> 保存发给家属
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
