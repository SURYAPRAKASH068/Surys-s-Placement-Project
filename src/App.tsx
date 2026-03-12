import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { LayoutDashboard, Users, Building2, BarChart3, FileText, LogOut, Menu, X, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import StudentManagement from './components/StudentManagement';
import CompanyManagement from './components/CompanyManagement';
import Analytics from './components/Analytics';
import AIPrediction from './components/AIPrediction';
import Profile from './components/Profile';

const App: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Login />;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'faculty', 'student'] },
    { id: 'students', label: 'Students', icon: Users, roles: ['admin', 'faculty'] },
    { id: 'companies', label: 'Companies', icon: Building2, roles: ['admin', 'faculty', 'student'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'faculty'] },
    { id: 'ai-prediction', label: 'AI Prediction', icon: BrainCircuit, roles: ['admin', 'faculty', 'student'] },
    { id: 'profile', label: 'My Profile', icon: FileText, roles: ['student'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="bg-[#151619] text-white flex flex-col border-r border-white/10"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && <h1 className="text-xl font-bold tracking-tight text-emerald-400">SPAS AI</h1>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-white/10 rounded">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {filteredMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center p-3 rounded-xl transition-all ${
                activeTab === item.id ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-white/5 text-gray-400'
              }`}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={logout}
            className="w-full flex items-center p-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="ml-3 font-medium">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 capitalize">{activeTab.replace('-', ' ')}</h2>
            <p className="text-gray-500">Welcome back, {user.name} ({user.role})</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
              {user.name[0]}
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'students' && <StudentManagement />}
            {activeTab === 'companies' && <CompanyManagement />}
            {activeTab === 'analytics' && <Analytics />}
            {activeTab === 'ai-prediction' && <AIPrediction />}
            {activeTab === 'profile' && <Profile />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
