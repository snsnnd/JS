import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Search, Activity } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../../config';

export default function Messages({ selectedPatient, token }) {
  const [msg, setMsg] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const fetchHistory = async () => {
    if(!selectedPatient) return;
    try {
      const res = await axios.get(`${BASE_URL}/api/chat/history/${selectedPatient.username}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setHistory(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    setLoading(true);
    fetchHistory();
    const interval = setInterval(fetchHistory, 5000); // 5秒轮询
    return () => clearInterval(interval);
  }, [selectedPatient, token]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

  if (!selectedPatient) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <Search className="w-16 h-16 mb-4 opacity-20" />
        <p>请先从左侧就诊队列中选择一位孕妇进行沟通</p>
      </div>
    );
  }

  const handleSend = async () => {
    if(!msg.trim()) return;
    const contentToSend = msg;
    setMsg('');
    setHistory(prev => [...prev, { id: Date.now(), sender_username: 'doctor', content: contentToSend }]);

    try {
      await axios.post(`${BASE_URL}/api/chat/send`, {
        receiver_username: selectedPatient.username,
        content: contentToSend
      }, { headers: { 'Authorization': `Bearer ${token}` } });
      fetchHistory();
    } catch (e) { alert("发送失败！"); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div><h2 className="font-bold text-gray-800 text-lg">与 {selectedPatient.name || selectedPatient.username} 沟通</h2></div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {loading ? <div className="text-center"><Activity className="animate-spin w-6 h-6 mx-auto text-blue-500" /></div> : 
          history.length === 0 ? <p className="text-center text-gray-400 text-sm">暂无聊天记录</p> :
          history.map(item => {
            const isMe = item.sender_username !== selectedPatient.username;
            return (
              <div key={item.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[60%] p-4 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-sm shadow-md' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                  {item.content}
                </div>
              </div>
            );
          })
        }
        <div ref={endRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100 flex items-center space-x-4">
        <input value={msg} onChange={(e)=>setMsg(e.target.value)} onKeyPress={(e)=>e.key==='Enter'&&handleSend()} className="flex-1 bg-gray-50 border border-gray-200 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="回复患者消息..." />
        <button onClick={handleSend} className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200"><Send className="w-5 h-5"/></button>
      </div>
    </motion.div>
  );
}
