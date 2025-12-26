import React, { useState, useEffect } from 'react';
import { Save, Lock, Bell, Database, Download, UploadCloud, Loader2, Moon, Sun, ExternalLink, ShieldCheck, Lightbulb, Key } from 'lucide-react';
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
    }, []);

    const checkApiKey = async () => {
        const win = window as any;
        if (win.aistudio && typeof win.aistudio.hasSelectedApiKey === 'function') {
            try {
                const selected = await win.aistudio.hasSelectedApiKey();
                setHasKey(selected);
            } catch (e) {
                console.error("Erreur lors de la vérification de la clé:", e);
            }
        }
    };

    const handleSelectKey = async () => {
        const win = window as any;
        if (win.aistudio && typeof win.aistudio.openSelectKey === 'function') {
            try {
                await win.aistudio.openSelectKey();
                // On assume le succès car le statut peut mettre du temps à se mettre à jour
                setHasKey(true);
            } catch (e) {
                console.error("Erreur lors de l'ouverture du sélecteur:", e);
            }
        } else {
            alert("Le sélecteur de clé est disponible uniquement dans l'environnement AI Studio.");
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

        if (!window.confirm(`Voulez-vous restaurer le fichier "${file.name}" ?\nAttention : Les données actuelles seront fusionnées.`)) {
            e.target.value = "";
            return;
        }

        setIsRestoring(true);
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            try {
                const json = event.target?.result as string;
                if (!json) throw new Error("Fichier vide.");
                
                const data = JSON.parse(json);
                if (!Array.isArray(data)) throw new Error("Format invalide.");

                const count = await restoreBackup(data as DocumentData[]);
                alert(`${count} documents restaurés.`);
                window.location.reload();
            } catch (err: any) {
                console.error(err);
                alert("Erreur: " + err.message);
            } finally {
                setIsRestoring(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="h-full bg-gray-50 dark:bg-slate-950 p-6 overflow-y-auto transition-colors duration-300">
            <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-8 tracking-tighter">Paramètres</h2>
            
            {isRestoring && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex flex-col items-center justify-center text-white backdrop-blur-sm">
                    <Loader2 size={48} className="animate-spin mb-4 text-citron" />
                    <p className="font-bold text-xl">Restauration en cours...</p>
                </div>
            )}

            {/* AI Environment Section (As per user request image) */}
            <div className="bg-[#0b0f19] rounded-[2.5rem] border border-slate-800 p-8 mb-8 shadow-2xl overflow-hidden relative">
                <div className="flex justify-between items-start mb-8 relative z-10">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700">
                            <Lock size={24} className="text-teal-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-teal-400">Intelligence</h3>
                            <h3 className="text-xl font-bold text-teal-400">Artificielle</h3>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 bg-emerald-950/30 border border-emerald-500/30 px-4 py-2 rounded-full">
                        <ShieldCheck size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Optimisé Gratuit</span>
                    </div>
                </div>

                <div className="bg-[#070b14] rounded-3xl p-6 mb-8 border border-slate-800/50 relative z-10">
                    <div className="flex items-start space-x-4">
                        <div className="mt-1 shrink-0">
                            <Lightbulb size={20} className="text-yellow-400" />
                        </div>
                        <div className="space-y-4">
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Pour utiliser Sécapp AI gratuitement, créez une clé API gratuite sur <span className="text-slate-200 font-bold">Google AI Studio</span>. Aucun frais n'est appliqué pour une utilisation standard.
                            </p>
                            <a 
                                href="https://aistudio.google.dev/app/apikey" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center space-x-2 text-teal-400 font-bold text-sm hover:underline"
                            >
                                <span>Obtenir ma clé gratuite</span>
                                <ExternalLink size={14} />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 relative z-10">
                    <div className="group cursor-pointer" onClick={handleSelectKey}>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest flex items-center">
                            Votre Clé API Gemini
                            {!hasKey && <span className="ml-2 text-yellow-500 animate-pulse">(Action requise)</span>}
                        </label>
                        <div className="relative">
                            <div className={`w-full bg-[#070b14] border-2 ${hasKey ? 'border-emerald-500/30' : 'border-slate-800 group-hover:border-teal-500/50'} rounded-2xl px-6 py-4 text-white font-mono flex items-center justify-between transition-all`}>
                                <span className="opacity-50">
                                    {hasKey ? "••••••••••••••••••••••••••••••••" : "Cliquer pour configurer..."}
                                </span>
                                {hasKey ? (
                                    <div className="w-3 h-3 bg-teal-500 rounded-full shadow-[0_0_10px_rgba(20,184,166,0.5)]"></div>
                                ) : (
                                    <Key size={18} className="text-slate-600" />
                                )}
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleSelectKey}
                        className={`w-full ${hasKey ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-teal-600 hover:bg-teal-500'} text-white font-black py-5 rounded-2xl shadow-xl flex items-center justify-center space-x-3 transition-all active:scale-[0.98]`}
                    >
                        <Save size={20} />
                        <span className="text-lg">{hasKey ? "Modifier ma clé API" : "Activer ma clé gratuite"}</span>
                    </button>
                    
                    <p className="text-[10px] text-center text-slate-600 uppercase font-bold tracking-widest">
                        Sécurisé par Google AI Studio & Sécapp Enterprise
                    </p>
                </div>
                
                {/* Background deco */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
            </div>

            {/* Other Settings */}
            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-transparent dark:border-slate-800 p-6 space-y-6 transition-colors duration-300">
                    <div className="flex items-center space-x-2 text-citron">
                        <Bell size={24} />
                        <h3 className="font-bold text-lg">Préférences</h3>
                    </div>

                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
                        <span className="text-gray-700 dark:text-gray-200 text-sm font-medium">Rappels visuels</span>
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
                            <span className="text-gray-700 dark:text-gray-200 text-sm font-medium">Mode Sombre</span>
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
                        <h3 className="font-bold text-lg">Données Locales</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <button 
                            onClick={handleBackup}
                            disabled={isRestoring}
                            className="w-full bg-gray-800 dark:bg-slate-700 text-white font-bold py-4 rounded-2xl shadow-md active:scale-95 transition-transform flex justify-center items-center space-x-2"
                        >
                            <Download size={18} />
                            <span>Exporter la Base</span>
                        </button>

                        <label className={`w-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-bold py-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-95 transition-transform flex justify-center items-center space-x-2 cursor-pointer ${isRestoring ? 'opacity-50' : ''}`}>
                            <UploadCloud size={18} />
                            <span>Restaurer une Base</span>
                            <input 
                                type="file" 
                                accept=".json"
                                className="hidden"
                                onChange={handleRestore}
                                disabled={isRestoring}
                            />
                        </label>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center pb-6">
                <p className="text-[10px] text-gray-400 dark:text-gray-600 font-mono uppercase tracking-widest">Sécapp AI v1.3.0 • Enterprise Secure</p>
            </div>
        </div>
    );
};
