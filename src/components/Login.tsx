import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { LogIn, UserPlus, GraduationCap } from 'lucide-react';
import { fetchApi } from '../lib/utils';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [branch, setBranch] = useState('CSE');
  const { login } = useAuth();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password } : { name, email, password, role, branch };

    try {
      const data = await fetchApi(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      
      if (isLogin) {
        login(data.token, data.user);
      } else {
        setIsLogin(true);
        alert('Registration successful! Please login.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8"
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <GraduationCap size={32} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-center text-gray-500 mb-8">
          {isLogin ? 'Sign in to access your placement dashboard' : 'Join SPAS to track your placement journey'}
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm flex items-center gap-2">
            <LogIn size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" required 
                  value={name} onChange={e => setName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select 
                    value={role} onChange={e => setRole(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <select 
                    value={branch} onChange={e => setBranch(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                  </select>
                </div>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input 
              type="email" required 
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" required 
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
            {isLogin ? 'Sign In' : 'Register'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-emerald-600 font-medium hover:underline"
          >
            {isLogin ? "Don't have an account? Register" : "Already have an account? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
