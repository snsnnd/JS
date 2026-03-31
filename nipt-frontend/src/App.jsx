import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import Login from './pages/Login';
import PatientPortal from './pages/Patient';
import DoctorWorkspace from './pages/Doctor';

export default function App() {
  const [currentView, setCurrentView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null); 

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#f5f5f7] font-sans">
      <div className="absolute top-0 -left-4 w-[40rem] h-[40rem] bg-purple-300 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-[40rem] h-[40rem] bg-blue-300 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-[40rem] h-[40rem] bg-pink-300 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-blob animation-delay-4000"></div>

      <AnimatePresence mode="wait">
        {currentView === 'login' && <Login key="login" onLoginSuccess={(u) => { setCurrentUser(u); setCurrentView(u.role); }} />}
        {currentView === 'patient' && <PatientPortal key="patient" user={currentUser} onLogout={handleLogout} />}
        {currentView === 'doctor' && <DoctorWorkspace key="doctor" user={currentUser} onLogout={handleLogout} />}
      </AnimatePresence>
    </div>
  );
}
