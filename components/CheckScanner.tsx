import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader2, Save, RefreshCw, Wand2, FileText, ArrowLeft, Trash2, Check, Calendar, X, Clock, Edit3, Image as ImageIcon, ChevronLeft, ChevronRight, User, MapPin, Hash } from 'lucide-react';
import { RejectedCheck, CheckRejectionClass, CheckSituation } from '../types';
import { analyzeCheck } from '../services/geminiService';
import { saveCheck, deleteCheck } from '../services/db';

export const CheckScanner = ({ onSave, onCancel, initialData }: any) => {
    const [fileData, setFileData] = useState<string | null>(null);
    const [mimeType, setMimeType] = useState<string>("image/jpeg");
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [formData, setFormData] = useState<Partial<RejectedCheck>>({});
    const [isManualEntry, setIsManualEntry] = useState(false);
    const [pickerConfig, setPickerConfig] = useState<{field: keyof RejectedCheck, type: 'date' | 'datetime', label: string} | null>(null);

    const cameraInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

    useEffect(() => {
        if (initialData) {
            setFileData(initialData.document_image);
            setMimeType(initialData.mimeType || "image/jpeg");
            setFormData(initialData);
            if (!initialData.document_image) setIsManualEntry(true);
        } else {
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            setFormData({
                mois_rejet: months[now.getMonth()],
                date_systeme: dateStr,
                date_rejet: dateStr,
                date_operation: dateStr,
                situation_actuelle: CheckSituation.COFFRE,
                classe_rejet: CheckRejectionClass.FOND,
                montant: 0,
                banque: "",
                numero_cheque: "",
                numero_compte: "",
                rib: "",
                ville: "",
                nom_proprietaire: "",
                nom_beneficiaire: "",
                motif_rejet: "",
                agence: "",
                encaisseur: "",
                observation: "",
                date_heure_rappel: ""
            });
        }
    }, [initialData]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMimeType(file.type);
            const reader = new FileReader();
            reader.onloadend = () => {
                setFileData(reader.result as string);
                setIsManualEntry(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const runIA = async () => {
        if (!fileData) return;
        setAnalyzing(true);
        try {
            const result = await analyzeCheck(fileData, mimeType);
            setFormData(prev => ({ ...prev, ...result }));
        } catch (e: any) {
            alert(`Erreur lors de l'analyse IA: ${e.message}`);
            console.error(e);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const check: RejectedCheck = {
                id: initialData?.id || crypto.randomUUID(),
                document_image: fileData || "",
                mimeType: mimeType,
                mois_rejet: formData.mois_rejet || months[new Date().getMonth()],
                date_systeme: formData.date_systeme || new Date().toISOString().split('T')[0],
                banque: formData.banque || "",
                numero_cheque: formData.numero_cheque || "",
                numero_compte: formData.numero_compte || "",
                rib: formData.rib || "",
                montant: Number(formData.montant) || 0,
                ville: formData.ville || "",
                nom_proprietaire: formData.nom_proprietaire || "",
                nom_beneficiaire: formData.nom_beneficiaire || "",
                date_rejet: formData.date_rejet || new Date().toISOString().split('T')[0],
                motif_rejet: formData.motif_rejet || "",
                classe_rejet: formData.classe_rejet || CheckRejectionClass.FOND,
                situation_actuelle: formData.situation_actuelle || CheckSituation.COFFRE,
                date_operation: formData.date_operation || new Date().toISOString().split('T')[0],
                agence: formData.agence || "",
                encaisseur: formData.encaisseur || "",
                observation: formData.observation || "",
                date_heure_rappel: formData.date_heure_rappel || "",
                created_at: initialData?.created_at || Date.now()
            };
            await saveCheck(check);
            onSave();
        } catch (e) {
            alert("Erreur lors de l'enregistrement");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (!fileData && !isManualEntry) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 bg-gray-50 dark:bg-bordeaux">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white uppercase tracking-tighter">Scanner Chèque</h2>
                    <p className="text-gray-500 dark:text-gray-300 text-sm">Prise de vue ou import</p>
                </div>
                
                <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleFileChange} />
                <input type="file" accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

                <button 
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-48 h-48 rounded-full bg-citron/10 dark:bg-rose-900/40 border-4 border-citron flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                    <Camera size={48} className="text-citron mb-2" />
                    <span className="text-citron font-black uppercase tracking-widest">Scanner</span>
                </button>

                <div className="flex flex-col w-full max-w-xs space-y-3">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center space-x-3 bg-white dark:bg-rose-950 p-4 rounded-xl shadow text-gray-700 dark:text-gray-200 border border-transparent dark:border-rose-900 active:scale-95 transition-transform"
                    >
                        <Upload size={20} className="text-citron" />
                        <span className="font-bold">Importer un fichier</span>
                    </button>
                    
                    <button 
                        onClick={() => setIsManualEntry(true)}
                        className="flex items-center justify-center space-x-3 bg-white dark:bg-rose-950 p-4 rounded-xl shadow text-gray-700 dark:text-gray-200 border border-transparent dark:border-rose-900 active:scale-95 transition-transform"
                    >
                        <Edit3 size={20} className="text-citron" />
                        <span className="font-bold">Saisie Manuelle</span>
                    </button>

                    <button onClick={onCancel} className="text-gray-400 font-bold text-xs uppercase p-2 tracking-widest">Annuler</button>
                </div>
            </div>
        );
    }

    if (analyzing) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-bordeaux to-rose-950 text-white space-y-4">
                <Loader2 className="animate-spin text-citron" size={64}/>
                <div className="text-center">
                    <p className="text-xl font-black uppercase tracking-tighter">Analyse IA...</p>
                    <p className="text-rose-200 text-sm opacity-70">Expertise chèque en cours</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto pb-32 bg-gray-50 dark:bg-bordeaux">
            <div className="relative w-full h-[30vh] bg-rose-950 flex items-center justify-center overflow-hidden shrink-0">
                {fileData ? (
                    <>
                        {mimeType === 'application/pdf' ? (
                            <div className="flex flex-col items-center text-rose-100">
                                <FileText size={64} />
                                <span className="text-sm font-bold mt-2 uppercase tracking-widest">Chèque PDF</span>
                            </div>
                        ) : (
                            <img src={fileData} alt="Scan" className="w-full h-full object-contain" />
                        )}
                        <button onClick={() => setFileData(null)} className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">
                            <RefreshCw size={20} />
                        </button>
                        <button onClick={runIA} className="absolute bottom-4 right-4 bg-citron text-white px-6 py-3 rounded-full shadow-lg font-black flex items-center space-x-2">
                            <Wand2 size={20}/>
                            <span>Auto-Analyse</span>
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-rose-900/50 flex items-center justify-center text-rose-300">
                           <ImageIcon size={32} />
                        </div>
                        <button 
                            onClick={() => cameraInputRef.current?.click()}
                            className="bg-citron/20 text-citron border border-citron px-4 py-2 rounded-full font-bold flex items-center space-x-2"
                        >
                            <Camera size={18} />
                            <span>Ajouter une photo</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="p-4 space-y-4">
                <div className="flex items-center space-x-2 mb-2">
                    <button onClick={onCancel} className="text-gray-400 p-2"><ArrowLeft size={20}/></button>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white uppercase tracking-tighter">Fiche de Rejet</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Select label="Mois de rejet" value={formData.mois_rejet} onChange={(v: string) => setFormData({...formData, mois_rejet: v})}>
                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </Select>
                    <div onClick={() => setPickerConfig({field: 'date_systeme', type: 'date', label: 'Date Système'})}>
                        <ReadOnlyDateInput label="Date Système" value={formData.date_systeme} icon={Calendar} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Banque" value={formData.banque} onChange={(v: string) => setFormData({...formData, banque: v})} />
                    <Field label="Ville" value={formData.ville} onChange={(v: string) => setFormData({...formData, ville: v})} icon={MapPin} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Nom Propriétaire" value={formData.nom_proprietaire} onChange={(v: string) => setFormData({...formData, nom_proprietaire: v})} icon={User} />
                    <Field label="Nom Bénéficiaire" value={formData.nom_beneficiaire} onChange={(v: string) => setFormData({...formData, nom_beneficiaire: v})} icon={User} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Field label="N° de Chèque" value={formData.numero_cheque} onChange={(v: string) => setFormData({...formData, numero_cheque: v})} />
                    <Field label="N° de Compte bancaire" value={formData.numero_compte} onChange={(v: string) => setFormData({...formData, numero_compte: v})} />
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <Field label="RIB (24 chiffres)" value={formData.rib} onChange={(v: string) => setFormData({...formData, rib: v})} icon={Hash} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Montant (DH)" type="number" value={formData.montant} onChange={(v: string) => setFormData({...formData, montant: Number(v) || 0})} />
                    <div onClick={() => setPickerConfig({field: 'date_rejet', type: 'date', label: 'Date de Rejet'})}>
                        <ReadOnlyDateInput label="Date de Rejet" value={formData.date_rejet} icon={Calendar} />
                    </div>
                </div>

                <Field label="Motif de rejet" value={formData.motif_rejet} onChange={(v: string) => setFormData({...formData, motif_rejet: v})} />

                <div className="grid grid-cols-2 gap-3">
                    <Select label="Classe de rejet" value={formData.classe_rejet} onChange={(v: string) => setFormData({...formData, classe_rejet: v as any})}>
                        <option value={CheckRejectionClass.FOND}>🔴 Fond</option>
                        <option value={CheckRejectionClass.FORME}>🔵 Forme</option>
                    </Select>
                    <Select label="Situation actuelle" value={formData.situation_actuelle} onChange={(v: string) => setFormData({...formData, situation_actuelle: v as any})}>
                        {Object.values(CheckSituation).map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div onClick={() => setPickerConfig({field: 'date_operation', type: 'date', label: 'Date d\'opération'})}>
                        <ReadOnlyDateInput label="Date d'opération" value={formData.date_operation} icon={Calendar} />
                    </div>
                    <Field label="Agence" value={formData.agence} onChange={(v: string) => setFormData({...formData, agence: v})} />
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <Field label="Encaisseur" value={formData.encaisseur} onChange={(v: string) => setFormData({...formData, encaisseur: v})} />
                </div>

                <div className="bg-white dark:bg-rose-950/50 p-3 rounded-xl border border-gray-200 dark:border-rose-900 shadow-sm transition-all">
                    <label className="block text-[10px] font-black text-citron uppercase mb-1">Rappel pour régularisation</label>
                    <div 
                        onClick={() => setPickerConfig({field: 'date_heure_rappel', type: 'datetime', label: 'Date & Heure Rappel'})}
                        className="flex items-center space-x-2 cursor-pointer py-1"
                    >
                        <Clock size={16} className="text-citron" />
                        <span className="text-sm font-bold text-gray-800 dark:text-white">
                            {formData.date_heure_rappel ? formData.date_heure_rappel.replace('T', ' à ') : "Ajouter un rappel"}
                        </span>
                        {formData.date_heure_rappel && (
                            <button onClick={(e) => { e.stopPropagation(); setFormData({...formData, date_heure_rappel: ""}); }} className="ml-auto text-red-500 p-1">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-rose-950/50 px-3 py-2 rounded-xl border border-gray-200 dark:border-rose-900 shadow-sm">
                    <label className="block text-[10px] font-black text-citron uppercase mb-1">Observations</label>
                    <textarea 
                        rows={3}
                        className="w-full text-gray-800 dark:text-gray-100 text-sm outline-none bg-transparent resize-none"
                        value={formData.observation || ""}
                        onChange={(e) => setFormData({...formData, observation: e.target.value})}
                        placeholder="Notes complémentaires..."
                    />
                </div>

                <div className="fixed bottom-20 right-4 left-4 z-40">
                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-citron text-white py-4 rounded-xl shadow-xl font-black text-lg flex justify-center items-center space-x-2 active:scale-95 transition-transform disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={24} className="animate-spin"/> : <Save size={24} />}
                        <span>ENREGISTRER</span>
                    </button>
                </div>
            </div>

            {pickerConfig && (
                <CustomDateTimePicker 
                    label={pickerConfig.label} 
                    type={pickerConfig.type} 
                    initialValue={formData[pickerConfig.field]} 
                    onClose={() => setPickerConfig(null)} 
                    onSelect={(val: string) => { 
                        setFormData(prev => ({...prev, [pickerConfig.field]: val})); 
                        setPickerConfig(null); 
                    }} 
                />
            )}
        </div>
    );
};

const Field = ({ label, value, onChange, type="text", icon: Icon }: any) => (
    <div className="bg-white dark:bg-rose-950/50 p-3 rounded-xl border border-gray-200 dark:border-rose-900 shadow-sm focus-within:ring-2 ring-citron/50 transition-all">
        <label className="block text-[10px] font-black text-citron uppercase mb-1">{label}</label>
        <div className="flex items-center space-x-2">
            {Icon && <Icon size={14} className="text-citron opacity-40" />}
            <input 
                type={type} 
                className="w-full text-sm font-bold bg-transparent outline-none text-gray-800 dark:text-white" 
                value={value || ""} 
                onChange={e => onChange(e.target.value)} 
            />
        </div>
    </div>
);

const Select = ({ label, value, onChange, children }: any) => (
    <div className="bg-white dark:bg-rose-950/50 p-3 rounded-xl border border-gray-200 dark:border-rose-900 shadow-sm focus-within:ring-2 ring-citron/50 transition-all">
        <label className="block text-[10px] font-black text-citron uppercase mb-1">{label}</label>
        <select 
            className="w-full text-sm font-bold bg-transparent outline-none text-gray-800 dark:text-white" 
            value={value || ""} 
            onChange={e => onChange(e.target.value)}
        >
            {children}
        </select>
    </div>
);

const ReadOnlyDateInput = ({ label, value, icon: Icon }: any) => (
    <div className="bg-white dark:bg-rose-950/50 p-3 rounded-xl border border-gray-200 dark:border-rose-900 shadow-sm transition-colors cursor-pointer focus-within:ring-2 ring-citron/50 h-[58px] flex flex-col justify-center">
        <label className="block text-[10px] font-black text-citron uppercase mb-0.5 tracking-wider">{label}</label>
        <div className="flex items-center space-x-2">
            <Icon size={14} className="text-citron opacity-50" />
            <div className="text-sm font-bold text-gray-800 dark:text-gray-100">{value || "-"}</div>
        </div>
    </div>
);

const CustomDateTimePicker = ({ label, type, initialValue, onClose, onSelect }: any) => {
    const initDate = initialValue ? new Date(initialValue) : new Date();
    const safeDate = isNaN(initDate.getTime()) ? new Date() : initDate;
    const [viewDate, setViewDate] = useState(safeDate);
    const [selectedDate, setSelectedDate] = useState(safeDate);
    const [time, setTime] = useState({ hours: safeDate.getHours(), minutes: safeDate.getMinutes() });
    
    const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1;
    };
    const handleDateClick = (day: number) => { setSelectedDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day)); };
    const handleConfirm = () => {
        const final = new Date(selectedDate);
        if (type === 'datetime') {
            final.setHours(time.hours); 
            final.setMinutes(time.minutes);
            onSelect(final.toISOString().slice(0, 16));
        } else {
            onSelect(final.toISOString().split('T')[0]);
        }
    };
    
    const days = [];
    const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
    const firstDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm p-4">
             <div className="bg-white dark:bg-rose-950 rounded-3xl p-6 w-full max-w-sm mx-auto shadow-2xl border dark:border-rose-900 animate-in slide-in-from-bottom duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-citron uppercase">{label}</h3>
                    <button onClick={onClose} className="p-2 text-gray-500"><X size={20}/></button>
                </div>
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="text-gray-500"><ChevronLeft/></button>
                    <span className="font-bold text-gray-800 dark:text-white">{months[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                    <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="text-gray-500"><ChevronRight/></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-6">
                    {['L','M','M','J','V','S','D'].map(d => <div key={d} className="text-xs font-bold text-gray-400">{d}</div>)}
                    {days.map((d, i) => d ? (
                        <button key={i} onClick={() => handleDateClick(d)} className={`h-10 rounded-full flex items-center justify-center text-sm font-medium ${selectedDate.getDate() === d && selectedDate.getMonth() === viewDate.getMonth() ? 'bg-citron text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-rose-900'}`}>{d}</button>
                    ) : <div key={i} />)}
                </div>
                {type === 'datetime' && (
                    <div className="flex items-center justify-center space-x-4 mb-6 bg-gray-50 dark:bg-rose-900/50 p-3 rounded-2xl">
                        <div className="flex flex-col items-center">
                            <input type="number" min="0" max="23" value={time.hours} onChange={(e) => setTime({...time, hours: parseInt(e.target.value) || 0})} className="w-12 text-center font-bold bg-transparent outline-none dark:text-white" />
                            <span className="text-[10px] text-gray-400 uppercase font-black">Heures</span>
                        </div>
                        <span className="font-bold text-gray-500">:</span>
                        <div className="flex flex-col items-center">
                            <input type="number" min="0" max="59" value={time.minutes} onChange={(e) => setTime({...time, minutes: parseInt(e.target.value) || 0})} className="w-12 text-center font-bold bg-transparent outline-none dark:text-white" />
                            <span className="text-[10px] text-gray-400 uppercase font-black">Minutes</span>
                        </div>
                    </div>
                )}
                <button onClick={handleConfirm} className="w-full bg-citron text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-transform"><Check size={20} /><span>VALIDER</span></button>
             </div>
        </div>
    );
};