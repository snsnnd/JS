import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, PhoneCall, Video, Activity } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../../config';

export default function Chat({ token }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  // 真实拉取聊天记录：假设医生账号叫 admin
  const DOCTOR_USERNAME = 'admin'; 

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/chat/history/${DOCTOR_USERNAME}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (error) {
      console.error("拉取聊天记录失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // 开启一个简易的轮询，每5秒获取一次新消息
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = async () => {
    if(!newMessage.trim()) return;
    const contentToSend = newMessage;
    setNewMessage(''); // 先清空输入框

    // 乐观更新 UI
    setMessages(prev => [...prev, { id: Date.now(), sender_username: 'patient', content: contentToSend, time: '发送中...' }]);

    try {
      await axios.post(`${BASE_URL}/api/chat/send`, {
        receiver_username: DOCTOR_USERNAME,
        content: contentToSend
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchHistory(); // 发送成功后重新拉取真实记录
    } catch (error) {
      alert("发送失败，请检查网络！");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
        <div><h3 className="font-bold text-gray-800">遗传咨询中心</h3><p className="text-xs text-green-500">主治医生在线</p></div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fafafa]">
        {loading ? (
           <div className="flex justify-center mt-10"><Activity className="w-6 h-6 animate-spin text-pink-400" /></div>
        ) : messages.length === 0 ? (
           <p className="text-center text-gray-400 text-sm mt-10">暂无咨询记录，在下方输入问题发送给医生。</p>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_username !== DOCTOR_USERNAME;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[60%] p-4 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-pink-500 text-white rounded-tr-sm shadow-md shadow-pink-200' : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm shadow-sm'}`}>
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100 flex items-center space-x-4">
        <input value={newMessage} onChange={(e)=>setNewMessage(e.target.value)} onKeyPress={(e)=>e.key==='Enter'&&handleSendMessage()} className="flex-1 bg-gray-50 border border-gray-200 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-pink-500/50" placeholder="输入您想咨询的问题..." />
        <button onClick={handleSendMessage} className="p-4 bg-pink-500 text-white rounded-2xl hover:bg-pink-600 shadow-lg"><Send className="w-5 h-5"/></button>
      </div>
    </motion.div>
  );
}
