import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, LayoutDashboard, Users, HardHat, Settings, LogOut, 
  ReceiptText, Wrench, BookOpen, Bell, Check
} from 'lucide-react';
import { LogoIcon } from './LogoIcon';
import { User, UserRole, Notification } from '../types';
import { cn } from '../lib/utils';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications?: Notification[];
  markNotificationAsRead?: (id: string) => void;
}

export default function Layout({ 
  user, 
  onLogout, 
  children, 
  activeTab, 
  setActiveTab,
  notifications = [],
  markNotificationAsRead
}: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['OWNER', 'ASSISTANT'] },
    { id: 'customers', label: 'Customer Billing', icon: ReceiptText, roles: ['OWNER', 'ASSISTANT'] },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, roles: ['OWNER', 'ASSISTANT'] },
    { id: 'salaries', label: 'Salaries', icon: HardHat, roles: ['OWNER'] },
    { id: 'staff', label: 'Assistants', icon: Users, roles: ['OWNER', 'ASSISTANT'] },
    { id: 'khata', label: 'Rate Master (Khata)', icon: BookOpen, roles: ['OWNER', 'ASSISTANT'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['OWNER', 'ASSISTANT'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-bg-surface flex overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 bg-[#0F172A] text-white overflow-hidden shadow-2xl border-r border-white/5">
        <div className="flex-1 flex flex-col pt-5 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-6 space-x-3 h-20 border-b border-white/10 mb-4 bg-gradient-to-b from-white/5 to-transparent">
            <div className="relative group">
              <div className="bg-[#F59E0B] p-1.5 rounded-xl border-2 border-[#EF4444] shadow-lg transform group-hover:rotate-6 transition-transform">
                <LogoIcon className="h-8 w-8 rounded-lg object-cover" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tighter text-[#F59E0B] leading-none">SHRI MAULI</span>
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mt-1 italic">Stone Crusher</span>
            </div>
          </div>
          <nav className="mt-4 flex-1 space-y-1 px-3">
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full group flex items-center px-4 py-3 text-sm font-bold uppercase tracking-widest transition-all duration-200 rounded-lg",
                  activeTab === item.id
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn(
                  "mr-3.5 h-4 w-4 flex-shrink-0 transition-colors",
                  activeTab === item.id ? "text-white" : "text-white/30 group-hover:text-white/60"
                )} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t border-white/10 p-6 bg-black/10">
          <div className="flex-shrink-0 w-full">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Logged in as</p>
            <p className="text-sm font-bold text-white truncate">{user.name}</p>
            <p className="text-xs font-medium text-white/50 truncate uppercase mb-4">{user.role}</p>
            <button
              onClick={onLogout}
              className="flex items-center text-xs font-bold text-danger hover:text-danger/80 transition-colors uppercase tracking-widest"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1 h-screen overflow-y-auto relative">
        {/* Top Navbar */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white border-b border-border-subtle shadow-sm px-4 md:px-8 items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-text-muted hover:text-text-main lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 flex justify-between items-center px-4">
            <h2 className="text-lg font-bold text-text-main capitalize">
              {activeTab === 'dashboard' ? `${user.role.toLowerCase()} Control Center` : activeTab}
            </h2>
            
            <div className="flex items-center space-x-6">
              {/* Notifications Center */}
              <div className="relative">
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-2 text-text-muted hover:text-primary transition-colors relative"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-danger rounded-full ring-2 ring-white" />
                  )}
                </button>

                <AnimatePresence>
                  {isNotificationsOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-0" 
                        onClick={() => setIsNotificationsOpen(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-border-subtle z-10 overflow-hidden"
                      >
                        <div className="p-4 border-b border-border-subtle bg-bg-surface flex items-center justify-between">
                          <h3 className="text-xs font-black uppercase tracking-widest text-text-main">Notifications</h3>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 bg-danger/10 text-danger text-[10px] font-bold rounded-full">
                              {unreadCount} NEW
                            </span>
                          )}
                        </div>
                        <div className="max-h-[350px] overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                              <Bell className="h-8 w-8 text-text-muted/20 mx-auto mb-2" />
                              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">No new alerts</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-border-subtle">
                              {notifications.map((n) => (
                                <div 
                                  key={n.id} 
                                  className={cn(
                                    "p-4 transition-colors cursor-default",
                                    !n.isRead ? "bg-primary/5" : "bg-white"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                      <p className={cn(
                                        "text-[10px] font-black uppercase tracking-tighter mb-1",
                                        n.type === 'DANGER' ? "text-danger" : "text-warning"
                                      )}>
                                        {n.title}
                                      </p>
                                      <p className="text-xs font-medium text-text-main leading-relaxed">
                                        {n.message}
                                      </p>
                                    </div>
                                    {!n.isRead && (
                                      <button 
                                        onClick={() => markNotificationAsRead?.(n.id)}
                                        className="p-1 text-primary hover:bg-primary/10 rounded-full transition-colors"
                                      >
                                        <Check className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {notifications.length > 0 && (
                          <div className="p-3 bg-bg-surface border-t border-border-subtle text-center">
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest italic">
                              Real-time billing enforcement active
                            </p>
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <span className={cn(
                "hidden md:inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                user.role === 'OWNER' ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"
              )}>
                {user.role} Access
              </span>
              <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm">
                {(user.name || '').split(' ').map(n => n[0]).join('')}
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 pb-12">
          <div className="px-4 md:px-8 py-8 xl:py-10 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-600/75 z-40 lg:hidden backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 flex flex-col w-full max-w-xs bg-white z-50 lg:hidden"
            >
              <div className="flex items-center justify-between h-20 px-6 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="bg-[#F59E0B] p-1.5 rounded-xl border-2 border-[#EF4444] shadow-md">
                    <LogoIcon className="h-7 w-7 rounded-lg object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-black text-[#EF4444] leading-none uppercase">SHRI MAULI</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Stone Crusher</span>
                  </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="h-6 w-6 text-slate-400" />
                </button>
              </div>
              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {filteredMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "group flex items-center px-4 py-4 text-base font-bold rounded-xl w-full",
                      activeTab === item.id
                        ? "bg-primary/10 text-primary"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <item.icon className="mr-4 h-6 w-6" />
                    {item.label}
                  </button>
                ))}
              </nav>
              <div className="p-4 border-t border-slate-100 mb-6">
                <div className="flex items-center p-4 bg-slate-50 rounded-2xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                    <p className="text-xs font-medium text-slate-500 truncate uppercase">{user.role}</p>
                  </div>
                  <button onClick={onLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-xl">
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
