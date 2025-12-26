import React, { useState, useEffect, useRef } from 'react';
import { Scanner } from './components/Scanner';
import { CheckScanner } from './components/CheckScanner';
import { Dashboard } from './components/Dashboard';
import { CheckDashboard } from './components/CheckDashboard';
import { Statistics } from './components/Statistics';
import { CheckStatistics } from './components/CheckStatistics';
import { Settings } from './components/Settings';
import { ScreenName, DocumentData, RejectedCheck, AppModule } from './types';
import { Camera, List, BarChart2, Settings as SettingsIcon, Bell, ArrowRight, CreditCard, Mail } from 'lucide-react';
import { getAllDocuments, getAllChecks } from './services/db';

const App: React.FC = () => {
  const [screen, setScreen] = useState<ScreenName>('dashboard');
  const [module, setModule] = useState<AppModule>('courriers');
  const [editingDoc, setEditingDoc] = useState<DocumentData | null>(null);
  const [editingCheck, setEditingCheck] = useState<RejectedCheck | null>(null);
  const [enableReminders, setEnableReminders] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [alertDoc, setAlertDoc] = useState<any>(null);

  const notifiedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const storedReminders = localStorage.getItem('ENABLE_REMINDERS');
    if (storedReminders !== null) setEnableReminders(storedReminders === 'true');

    const storedTheme = localStorage.getItem('THEME') as 'light' | 'dark';
    if (storedTheme) setTheme(storedTheme);
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');

    const storedModule = localStorage.getItem('LAST_MODULE') as AppModule;
    if (storedModule) setModule(storedModule);

    if ('Notification' in window && Notification.permission !== 'granted') Notification.requestPermission();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('THEME', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('LAST_MODULE', module);
  }, [module]);

  const handleEdit = (item: any) => {
    if (module === 'courriers') {
      setEditingDoc(item);
      setScreen('scanner');
    } else {
      setEditingCheck(item);
      setScreen('scanner');
    }
  };

  const NavButton = ({ target, icon: Icon }: { target: ScreenName, icon: any }) => {
    const isActive = screen === target;
    const activeColor = module === 'courriers' ? 'text-teal' : 'text-citron';
    const activeBg = isActive ? 'bg-lavender dark:bg-gray-800' : '';
    
    return (
      <button 
        onClick={() => { setScreen(target); setEditingDoc(null); setEditingCheck(null); }}
        className={`p-3 rounded-2xl flex flex-col items-center justify-center transition-colors ${activeBg} ${isActive ? activeColor : 'text-gray-400 dark:text-gray-500'}`}
      >
        <Icon size={28} />
      </button>
    );
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#E6E6FA] dark:bg-slate-950 max-w-md mx-auto shadow-2xl overflow-hidden relative transition-colors duration-300">
        
        {/* Module Switcher Header */}
        <div className="bg-white dark:bg-slate-900 px-4 py-3 flex justify-center border-b border-gray-100 dark:border-slate-800 shrink-0 z-50">
            <div className="bg-gray-100 dark:bg-slate-800 p-1 rounded-xl flex w-full max-w-xs">
                <button 
                    onClick={() => { setModule('courriers'); setScreen('dashboard'); }}
                    className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold transition-all ${module === 'courriers' ? 'bg-white dark:bg-slate-700 text-[#0ABAB5] shadow-sm' : 'text-gray-400'}`}
                >
                    <Mail size={16} />
                    <span>COURRIERS</span>
                </button>
                <button 
                    onClick={() => { setModule('cheques'); setScreen('dashboard'); }}
                    className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold transition-all ${module === 'cheques' ? 'bg-white dark:bg-slate-700 text-citron shadow-sm' : 'text-gray-400'}`}
                >
                    <CreditCard size={16} />
                    <span>CHÈQUES</span>
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
            {screen === 'scanner' && (
                module === 'courriers' ? (
                  <Scanner onSave={() => setScreen('dashboard')} onCancel={() => setScreen('dashboard')} initialData={editingDoc} />
                ) : (
                  <CheckScanner onSave={() => setScreen('dashboard')} onCancel={() => setScreen('dashboard')} initialData={editingCheck} />
                )
            )}
            {screen === 'dashboard' && (
                module === 'courriers' ? <Dashboard onEdit={handleEdit} /> : <CheckDashboard onEdit={handleEdit} />
            )}
            {screen === 'stats' && (
                module === 'courriers' ? <Statistics /> : <CheckStatistics />
            )}
            {screen === 'settings' && (
                <Settings enableReminders={enableReminders} setEnableReminders={setEnableReminders} theme={theme} setTheme={setTheme} />
            )}
        </div>

        <div className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 px-6 py-3 flex justify-between items-center z-50 shrink-0 pb-safe transition-colors duration-300">
            <NavButton target="dashboard" icon={List} />
            <button 
              onClick={() => setScreen('scanner')} 
              className={`p-3 rounded-2xl flex items-center justify-center transition-colors ${screen === 'scanner' ? (module === 'courriers' ? 'text-teal bg-lavender dark:bg-gray-800' : 'text-citron bg-lavender dark:bg-gray-800') : 'text-gray-400 dark:text-gray-500'}`}
            >
                <Camera size={28} />
            </button>
            <NavButton target="stats" icon={BarChart2} />
            <NavButton target="settings" icon={SettingsIcon} />
        </div>
    </div>
  );
};

export default App;