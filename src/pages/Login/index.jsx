import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, User, Lock, Activity } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../../config';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);
      
      // 1. 登录并获取 Token
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, params, { 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' } 
      });
      
      const token = loginResponse.data.access_token;
      const role = loginResponse.data.role || 'doctor';

      // 2. 🚀 核心修复：用刚拿到的 Token 去拉取用户的完整档案 (包含 bmi, lmp, psych_status 等)
      const meResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // 3. 将所有信息（身份认证信息 + 个人生理档案）一起发给全局状态
      onLoginSuccess({ 
        username, 
        role, 
        token,
        ...meResponse.data // 展开后端传来的完整数据
      });

    } catch (error) {
      alert("登录拒绝：账号或密码错误！");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-md bg-white/70 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-[2rem] p-8 z-10">
      <div className="text-center mb-8">
        <div className="inline-block p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4 shadow-lg shadow-blue-500/30">
          <ShieldCheck className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">NIPT 智能协同生态</h2>
      </div>
      <form onSubmit={handleLogin} className="space-y-5">
        <div className="relative">
          <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
          <input required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-white/50 border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="账号" />
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/50 border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="密码" />
        </div>
        <motion.button disabled={loading} className="w-full bg-gray-900 text-white font-medium py-4 rounded-2xl shadow-xl flex justify-center items-center hover:bg-gray-800 transition-colors">
          {loading ? <Activity className="w-5 h-5 animate-spin" /> : '安全登入'}
        </motion.button>
      </form>
    </motion.div>
  );
}
