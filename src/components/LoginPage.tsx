import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { LogoIcon } from './LogoIcon';
import { UserRole } from '../types';

interface LoginPageProps {
  onLogin: (name: string, role: UserRole, password?: string) => boolean;
  assistants: any[];
  ownerProfile: any;
}

export default function LoginPage({ onLogin, assistants, ownerProfile }: LoginPageProps) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Owner check (checking against profile from DB)
    const ownerName = ownerProfile?.name || 'Nilesh Karande';
    if (name.toLowerCase() === ownerName.toLowerCase()) {
      const success = onLogin(name, 'OWNER', password);
      if (success) return;
    }

    // Assistant check from DB
    const success = onLogin(name, 'ASSISTANT', password);
    if (success) return;

    setError('Invalid credentials. Please contact administration if you cannot log in.');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="flex justify-center">
          <div className="bg-[#F1F5F9] p-3 rounded-[2.5rem] shadow-2xl border-4 border-white relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#F59E0B]/20 to-transparent"></div>
            <div className="bg-[#F59E0B] p-1.5 rounded-3xl shadow-lg border-2 border-[#EF4444] relative z-10 transform group-hover:rotate-6 transition-transform duration-500">
              <LogoIcon className="h-20 w-20 rounded-2xl object-cover" />
            </div>
          </div>
        </div>
        <div className="mt-8 text-center">
          <h2 className="text-4xl font-black text-[#EF4444] tracking-tighter uppercase leading-none">
            SHRI MAULI
          </h2>
          <div className="flex items-center justify-center space-x-2 mt-1">
            <div className="h-[2px] w-8 bg-[#F59E0B]"></div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] italic">
              Stone Crusher
            </p>
            <div className="h-[2px] w-8 bg-[#F59E0B]"></div>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-3xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                Full Name
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 bg-slate-50 rounded-xl leading-5 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 border border-slate-200 bg-slate-50 rounded-xl leading-5 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm font-medium animate-pulse">{error}</p>
            )}

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.98]"
              >
                Sign in to Dashboard
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500 italic">
                  Secure Industrial Access
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-center text-xs text-slate-400">
          © 2026 Shri Mauli Stone Crusher. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
