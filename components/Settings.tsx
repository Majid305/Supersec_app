import React, { useState, useEffect } from 'react';
import { Save, Lock, Bell, Database, Download, UploadCloud, Loader2, Moon, Sun, ExternalLink, ShieldCheck, Lightbulb, Key, Activity, AlertCircle } from 'lucide-react';
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
    const [hasKey, setHasKey] = useState(false);

    useEffect(() => {
        checkApiKey();
        const timer = setInterval(checkApiKey, 2000);
        return () => clearInterval(timer);
    }, []);

    const checkApiKey = async () => {
        // 1. Priorité à la variable d'environnement système
        if (process.env.API_KEY && process.env.API_KEY.length > 5) {
            setHasKey(true);
            return;
        }

        // 2. Vérification via le pont sécurisé AI Studio
        const win = window as any;
        if (win.aistudio && typeof win.aistudio.hasSelectedApiKey === 'function') {
            try {
                const selected = await win.aistudio.hasSelectedApiKey();
                if (selected) setHasKey(true);
            } catch (e) {
                console.debug("Pont sécurisé en attente...");
            }
        }
    };

    const handleSelectKey = async () => {
        const win = window as any;
        if (win.aistudio && typeof win.aistudio.openSelectKey === 'function') {
            try {
                await win.aistudio.openSelectKey();
                setHasKey(true);
            } catch (e) {
                console.error("Erreur sélecteur:", e);
            }
        } else {
            alert("CONFIGURATION REQUISE :\n\n1. Si vous développez : Ajoutez 'API_KEY' dans vos variables d'environnement Vercel.\n2. Si vous testez : Utilisez l'aperçu directement dans Google AI Studio.\n\nNote : La saisie directe est désactivée par mesure de sécurité.");
        }
    };

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
                    <Loader2 size={48} className="animate-spin mb-4 text-citron" />
                    <p className="font-bold text-xl uppercase">Restauration...</p>
                </div>
            )}

            {/* AI Environment Section */}
            <div className="bg-[#0b0f19] rounded-[2.5rem] border border-slate-800 p-8 mb-8 shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-start mb-8 relative z-10">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700">
                            <Lock size={24} className="text-teal-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-teal-400 uppercase tracking-tighter">Moteur IA</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sécapp Enterprise</p>
                        </div>
                    </div>
                    {hasKey ? (
                        <div className="flex items-center space-x-2 bg-teal-500/10 border border-teal-500/50 px-4 py-2 rounded-full">
                            <Activity size={14} className="text-teal-400 animate-pulse" />
                            <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Actif</span>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/50 px-4 py-2 rounded-full">
                            <AlertCircle size={14} className="text-red-500" />
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Inactif</span>
                        </div>
                    )}
                </div>

                <div className="bg-[#070b14] rounded-3xl p-6 mb-8 border border-slate-800/50 relative z-10">
                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <Lightbulb size={20} className="text-yellow-400 shrink-0 mt-1" />
                            <p className="text-sm text-slate-400 leading-relaxed">
                                L'IA nécessite une clé <span className="text-slate-200 font-bold">Gemini 3</span>. Sur Vercel, configurez la variable <code className="bg-slate-800 px-1 rounded text-teal-400 font-bold">API_KEY</code>.
                            </p>
                        </div>
                        <a 
                            href="https://aistudio.google.dev/" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center space-x-2 text-teal-400 font-bold text-xs hover:text-teal-300 transition-colors bg-teal-400/5 px-4 py-2 rounded-xl border border-teal-400/20"
                        >
                            <span>Accéder à Google AI Studio</span>
                            <ExternalLink size={14} />
                        </a>
                    </div>
                </div>

                <div className="space-y-6 relative z-10">
                    <div className="bg-[#070b14] border-2 border-slate-800 rounded-2xl p-6 text-center">
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Statut de Connexion</label>
                        {hasKey ? (
                            <div className="flex flex-col items-center">
                                <div className="text-emerald-400 font-black text-sm uppercase flex items-center mb-1">
                                    <ShieldCheck size={18} className="mr-2" /> 
                                    Clé Sécurisée Détectée
                                </div>
                                <p className="text-[10px] text-slate-600 font-bold">Prêt pour l'analyse de documents</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="text-red-400 font-black text-sm uppercase flex items-center mb-1">
                                    <AlertCircle size={18} className="mr-2" /> 
                                    Configuration Manquante
                                </div>
                                <p className="text-[10px] text-slate-600 font-bold">L'IA est actuellement désactivée</p>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={handleSelectKey}
                        className={`w-full ${hasKey ? 'bg-slate-800 text-teal-400' : 'bg-teal-600 text-white shadow-xl'} font-black py-5 rounded-2xl flex items-center justify-center space-x-3 transition-all active:scale-[0.98]`}
                    >
                        <Key size={20} />
                        <span className="text-lg uppercase tracking-tight">{hasKey ? "Changer de clé" : "Activer via le pont IA"}</span>
                    </button>
                </div>
                
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
            </div>

            {/* Other Settings */}
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
                            <span className="uppercase tracking-tight">Exporter Base</span>
                        </button>

                        <label className="w-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-black py-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-95 transition-transform flex justify-center items-center space-x-2 cursor-pointer">
                            <UploadCloud size={18} />
                            <span className="uppercase tracking-tight">Restaurer Base</span>
                            <input type="file" accept=".json" className="hidden" onChange={handleRestore} disabled={isRestoring} />
                        </label>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center pb-6">
                <p className="text-[10px] text-gray-400 dark:text-gray-600 font-mono uppercase tracking-widest font-black">Sécapp AI v1.3.2 • Enterprise Secure Mode</p>
            </div>
        </div>
    );
};