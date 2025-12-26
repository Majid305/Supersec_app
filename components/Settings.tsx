
import React, { useState } from 'react';
import { Database, Download, UploadCloud, Loader2, Moon, Sun, Bell } from 'lucide-react';
import { getAllDocuments, restoreBackup } from '../services/db';
import { DocumentData } from '../types';

interface SettingsProps {
    enableReminders: boolean;
    setEnableReminders: (val: boolean) => void;
    theme: 'light' | 'dark';
    setTheme: (t: 'light' | 'dark') => void;
}

export const Settings: React.FC<SettingsProps> = ({ enableReminders, setEnableReminders, theme, setTheme }) => {
    const [isRestoring, setIsRestoring] = useState(false);

    const handleBackup = async () => {
        try {
            const docs = await getAllDocuments();
            if (docs.length === 0) {
                alert("Aucune donnée à sauvegarder.");
                return;
            }
            const json = JSON.stringify(docs, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `supersec_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la création de la sauvegarde.");
        }
    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!window.confirm(`Restaurer "${file.name}" ?`)) {
            e.target.value = "";
            return;
        }

        setIsRestoring(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                const count = await restoreBackup(data as DocumentData[]);
                alert(`${count} documents restaurés.`);
                window.location.reload();
            } catch (err: any) {
                alert("Erreur: " + err.message);
            } finally {
                setIsRestoring(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="h-full bg-gray-50 dark:bg-slate-950 p-6 overflow-y-auto transition-colors duration-300">
            <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-8 tracking-tighter uppercase">Paramètres</h2>
            
            {isRestoring && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex flex-col items-center justify-center text-white backdrop-blur-sm">
                    <Loader2 size={48} className="animate-spin mb-4 text-[#0ABAB5]" />
                    <p className="font-bold text-xl uppercase tracking-widest">Restauration...</p>
                </div>
            )}

            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-transparent dark:border-slate-800 p-6 space-y-6 transition-colors duration-300">
                    <div className="flex items-center space-x-2 text-citron">
                        <Bell size={24} />
                        <h3 className="font-bold text-lg uppercase tracking-tight">Préférences</h3>
                    </div>

                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
                        <span className="text-gray-700 dark:text-gray-200 text-sm font-bold uppercase tracking-tight">Rappels visuels</span>
                        <div 
                            onClick={() => setEnableReminders(!enableReminders)}
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${enableReminders ? 'bg-citron' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${enableReminders ? 'translate-x-6' : ''}`}></div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            {theme === 'dark' ? <Moon size={18} className="text-purple-400"/> : <Sun size={18} className="text-orange-400"/>}
                            <span className="text-gray-700 dark:text-gray-200 text-sm font-bold uppercase tracking-tight">Mode Sombre</span>
                        </div>
                        <div 
                            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${theme === 'dark' ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${theme === 'dark' ? 'translate-x-6' : ''}`}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-transparent dark:border-slate-800 p-6 space-y-6 transition-colors duration-300">
                    <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                        <Database size={24} />
                        <h3 className="font-bold text-lg uppercase tracking-tight">Archives</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <button 
                            onClick={handleBackup}
                            className="w-full bg-slate-800 text-white font-black py-4 rounded-2xl shadow-md active:scale-95 transition-transform flex justify-center items-center space-x-2"
                        >
                            <Download size={18} />
                            <span className="uppercase tracking-tight">Exporter Base Locale</span>
                        </button>

                        <label className="w-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-black py-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-95 transition-transform flex justify-center items-center space-x-2 cursor-pointer">
                            <UploadCloud size={18} />
                            <span className="uppercase tracking-tight">Restaurer Base Locale</span>
                            <input type="file" accept=".json" className="hidden" onChange={handleRestore} disabled={isRestoring} />
                        </label>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center pb-6">
                <p className="text-[10px] text-gray-400 dark:text-gray-600 font-mono uppercase tracking-widest font-black">Sécapp AI v1.4.0</p>
            </div>
        </div>
    );
};
