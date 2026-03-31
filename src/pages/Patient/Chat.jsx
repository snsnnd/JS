import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, User, Bot } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../../config';

const DOCTOR_USERNAME = 'admin'; // 真实医生账号

export default function Chat({ token }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  // AI 智能助理模式开关
  const [isAiMode, setIsAiMode] = useState(true); 

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/chat/history/${DOCTOR_USERNAME}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMessages(res.data);
      scrollToBottom();
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    // 如果是真人模式，定期轮询消息
    if (!isAiMode) {
      fetchHistory();
      const interval = setInterval(fetchHistory, 3000);
      return () => clearInterval(interval);
    }
  }, [token, isAiMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 模拟本地 AI 知识库智能回复
  const generateAiReply = (text) => {
    const q = text.toLowerCase();
    if (q.includes('胖') || q.includes('bmi')) return '系统检测到您的体型特征，建议您近期适当控制快碳水摄入。较高的 BMI 会轻微稀释血液中的胎儿游离 DNA，可能导致我们的复查时间往后顺延哦。';
    if (q.includes('高风险') || q.includes('异常')) return '请您先不要惊慌。AI 给出的高风险提示并非最终确诊，建议您前往【产检日程表】双击日历进行预约，来院进行羊水穿刺复核，确诊率才是金标准。';
    if (q.includes('几周') || q.includes('时间')) return '根据您的个人档案，系统为您计算的最佳 NIPT 采血窗口期是孕 15 周左右。过早检测可能会因为游离 DNA 浓度不足（< 4%）导致假阴性。';
    return '您好，我是您的专属 AI 孕期助理。我正在不断学习中，如果您的问题比较复杂，请关闭顶部的 [AI 助手] 开关，直接与您的主治医师连线。';
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const msgToSend = inputText.trim();
    setInputText('');

    // 1. AI 智能助理模式拦截
    if (isAiMode) {
      const newHistory = [...messages, { sender_id: 'me', content: msgToSend, timestamp: new Date().toISOString() }];
      setMessages(newHistory);
      setLoading(true);
      scrollToBottom();
      
      setTimeout(() => {
        setLoading(false);
        setMessages([...newHistory, { 
          sender_id: 'AI_BOT', 
          content: generateAiReply(msgToSend), 
          timestamp: new Date().toISOString() 
        }]);
        scrollToBottom();
      }, 800);
      return;
    }

    // 2. 真实医生发送模式
    try {
      await axios.post(`${BASE_URL}/api/chat/send`, {
        receiver_username: DOCTOR_USERNAME,
        content: msgToSend
      }, { headers: { 'Authorization': `Bearer ${token}` }});
      fetchHistory();
    } catch (e) {
      alert("发送失败，请检查网络");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden">
      
      {/* 头部：仅包含 AI 切换器 */}
      <div className="p-4 border-b border-pink-50 bg-pink-50/30 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-pink-400 to-rose-400 rounded-full flex items-center justify-center text-white shadow-sm">
            {isAiMode ? <Bot className="w-5 h-5"/> : <User className="w-5 h-5"/>}
          </div>
          <div>
            <h3 className="font-bold text-gray-800">{isAiMode ? '云端 AI 助理 (智能秒回)' : '张主任 (主治医师)'}</h3>
            <p className="text-[10px] text-gray-500 flex items-center">
              <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isAiMode ? 'bg-purple-500' : 'bg-green-500'}`}></span>
              {isAiMode ? '全天候在线解答百科' : '在线，沟通可能存在延迟'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* AI 模式切换开关 */}
          <button 
            onClick={() => setIsAiMode(!isAiMode)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${isAiMode ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-white text-gray-500 border-gray-200'}`}
          >
            {isAiMode ? '关闭 AI 助手' : '开启 AI 助手'}
          </button>
        </div>
      </div>

      {/* 聊天消息流 */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50/30">
        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === 'me' || (!msg.sender_id && msg.sender !== DOCTOR_USERNAME);
          const isAi = msg.sender_id === 'AI_BOT';

          return (
            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                isMe ? 'bg-pink-500 text-white rounded-br-none' : 
                isAi ? 'bg-purple-50 text-purple-800 border border-purple-100 rounded-bl-none' :
                'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
              }`}>
                {isAi && <div className="text-[10px] text-purple-400 font-bold mb-1 flex items-center"><Bot className="w-3 h-3 mr-1"/> AI 自动回复</div>}
                {msg.content}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-purple-50 border border-purple-100 text-purple-400 p-3 rounded-2xl rounded-bl-none text-sm flex items-center">
              <span className="flex space-x-1">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 底部输入框 */}
      <div className="p-4 bg-white border-t border-gray-100 flex items-center space-x-3">
        <input 
          type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isAiMode ? "向 AI 助理提问，例如：什么是高风险？" : "输入消息发送给医生..."}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-pink-400 transition-colors text-sm"
        />
        <button onClick={handleSend} disabled={loading} className="w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-pink-200 hover:bg-pink-600 transition-colors disabled:opacity-50">
          <Send className="w-5 h-5 ml-1" />
        </button>
      </div>
    </motion.div>
  );
}
