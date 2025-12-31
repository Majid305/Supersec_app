import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader2, Save, RefreshCw, Wand2, FileText, ArrowLeft, Trash2, Check, Calendar, X, Clock, Edit3, Image as ImageIcon, ChevronLeft, ChevronRight, User, MapPin, Hash, Send, Sparkles } from 'lucide-react';
import { RejectedCheck, CheckRejectionClass, CheckSituation } from '../types';
import { analyzeCheck, generateObservationIA } from '../services/geminiService';
import { saveCheck, deleteCheck } from '../services/db';

export const CheckScanner = ({ onSave, onCancel, initialData }: any) => {
    const [fileData, setFileData] = useState<string | null>(null);
    const [mimeType, setMimeType] = useState<string>("image/jpeg");
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [generatingObs, setGeneratingObs] = useState(false);
    const [formData, setFormData] = useState<Partial<RejectedCheck>>({});
    const [isManualEntry, setIsManualEntry] = useState(false);
    const [aiObsInstruction, setAiObsInstruction] = useState("");
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
        } finally {
            setAnalyzing(false);
        }
    };

    const handleGenObs = async () => {
        if (!formData.banque && !formData.numero_cheque) { 
            alert("Veuillez saisir au moins la banque ou le N° de chèque pour aider l'IA."); 
            return; 
        }
        setGeneratingObs(true);
        try {
            const obs = await generateObservationIA(formData, aiObsInstruction);
            setFormData(prev => ({ ...prev, observation: obs }));
        } catch (err) { 
            alert("Erreur génération observation."); 
        } finally { 
            setGeneratingObs(false); 
        }
    };

    const handleSave = async () => {
        if (!formData.banque || !formData.numero_cheque) { alert("La banque et le numéro de chèque sont obligatoires."); return; }
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
        } finally {
            setLoading(false);
        }
    };

    if (!fileData && !isManualEntry) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 bg-lavande dark:bg-lavande-deep">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white uppercase tracking-tighter">Scanner Chèque</h2>
                    <p className="text-gray-500 text-sm">Prise de vue ou import sécurisé</p>
                </div>
                
                <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleFileChange} />
                <input type="file" accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

                <button 
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-48 h-48 rounded-full bg-white dark:bg-slate-800 border-4 border-citron flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                    <Camera size={48} className="text-citron mb-2" />
                    <span className="text-citron font-black uppercase tracking-widest text-xs">Scanner</span>
                </button>

                <div className="flex flex-col w-full max-w-xs space-y-3">
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center space-x-3 bg-white dark:bg-slate-800 p-4 rounded-xl shadow active:scale-95 transition-transform"><Upload size={20} className="text-citron" /><span className="font-bold dark:text-white">Importer</span></button>
                    <button onClick={() => setIsManualEntry(true)} className="flex items-center justify-center space-x-3 bg-white dark:bg-slate-800 p-4 rounded-xl shadow active:scale-95 transition-transform"><Edit3 size={20} className="text-citron" /><span className="font-bold dark:text-white">Saisie Manuelle</span></button>
                    <button onClick={onCancel} className="text-gray-400 font-bold text-xs uppercase p-2 tracking-widest">Annuler</button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto pb-32 bg-lavande dark:bg-lavande-deep">
            <div className="relative w-full h-[25vh] bg-slate-200 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                {fileData ? (
                    <>
                        {mimeType === 'application/pdf' ? <div className="flex flex-col items-center text-gray-500"><FileText size={48} /><span className="text-xs font-bold mt-2 uppercase">PDF Chèque</span></div> : <img src={fileData} alt="Scan" className="w-full h-full object-contain" />}
                        <button onClick={() => setFileData(null)} className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded-full"><RefreshCw size={20} /></button>
                        {!formData.banque && <button onClick={runIA} className="absolute bottom-4 right-4 bg-citron text-white px-6 py-3 rounded-full shadow-lg font-black flex items-center space-x-2"><Wand2 size={20}/><span>Analyser</span></button>}
                    </>
                ) : <div className="text-gray-500 font-bold uppercase tracking-widest text-xs">Saisie Manuelle</div>}
                
                {analyzing && <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white"><Loader2 className="animate-spin text-citron mb-2" size={40}/><span className="text-xs font-bold uppercase">Expertise IA...</span></div>}
            </div>

            <div className="p-4 space-y-4">
                <div className="flex items-center space-x-2">
                    <button onClick={onCancel} className="text-gray-400 p-2"><ArrowLeft size={20}/></button>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white uppercase tracking-tighter">Audit Chèque</h3>
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
                    <Field label="Propriétaire (Tireur)" value={formData.nom_proprietaire} onChange={(v: string) => setFormData({...formData, nom_proprietaire: v})} icon={User} />
                    <Field label="Bénéficiaire" value={formData.nom_beneficiaire} onChange={(v: string) => setFormData({...formData, nom_beneficiaire: v})} icon={User} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Field label="N° Chèque" value={formData.numero_cheque} onChange={(v: string) => setFormData({...formData, numero_cheque: v})} />
                    <Field label="N° Compte" value={formData.numero_compte} onChange={(v: string) => setFormData({...formData, numero_compte: v})} />
                </div>

                <Field label="RIB (24 chiffres)" value={formData.rib} onChange={(v: string) => setFormData({...formData, rib: v})} icon={Hash} />

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Montant (DH)" type="number" value={formData.montant} onChange={(v: string) => setFormData({...formData, montant: Number(v) || 0})} />
                    <div onClick={() => setPickerConfig({field: 'date_rejet', type: 'date', label: 'Date Rejet'})}>
                        <ReadOnlyDateInput label="Date Rejet" value={formData.date_rejet} icon={Calendar} />
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
                    <div onClick={() => setPickerConfig({field: 'date_operation', type: 'date', label: 'Opération'})}>
                        <ReadOnlyDateInput label="Date Opération" value={formData.date_operation} icon={Calendar} />
                    </div>
                    <Field label="Agence Bancaire" value={formData.agence} onChange={(v: string) => setFormData({...formData, agence: v})} />
                </div>

                <Field label="Encaisseur" value={formData.encaisseur} onChange={(v: string) => setFormData({...formData, encaisseur: v})} />

                {/* Assistant Observation IA spécifique pour les chèques */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border-2 border-dashed border-citron/30 space-y-3">
                    <div className="flex items-center space-x-2 text-citron">
                        <Sparkles size={18}/>
                        <h4 className="text-[11px] font-black uppercase tracking-wider">Assistant Expertise IA</h4>
                    </div>
                    <div className="flex space-x-2">
                        <input 
                            className="flex-1 bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-xs outline-none dark:text-white border border-transparent focus:border-citron/30" 
                            placeholder="Instruction pour l'audit..." 
                            value={aiObsInstruction} 
                            onChange={(e) => setAiObsInstruction(e.target.value)} 
                        />
                        <button 
                            onClick={handleGenObs} 
                            disabled={generatingObs} 
                            className="bg-citron text-white p-2.5 rounded-xl shadow-sm active:scale-95 disabled:opacity-50 transition-all"
                        >
                            {generatingObs ? <Loader2 size={20} className="animate-spin"/> : <Send size={20}/>}
                        </button>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                        <label className="block text-[9px] font-black text-citron uppercase mb-1">Observations Audit</label>
                        <textarea 
                            rows={4} 
                            className="w-full text-gray-800 dark:text-white outline-none bg-transparent resize-none text-sm font-medium leading-relaxed" 
                            value={formData.observation || ""} 
                            onChange={(e) => setFormData({...formData, observation: e.target.value})} 
                            placeholder="Les observations d'audit apparaîtront ici..." 
                        />
                    </div>
                </div>

                <div onClick={() => setPickerConfig({field: 'date_heure_rappel', type: 'datetime', label: 'Rappel'})} className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm cursor-pointer transition-colors active:bg-gray-50">
                    <label className="block text-[10px] font-black text-citron uppercase mb-1">Rappel de suivi</label>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Clock size={18} className="text-citron"/>
                            <span className="text-sm font-bold text-gray-800 dark:text-white">{formData.date_heure_rappel || "Définir un rappel"}</span>
                        </div>
                        {formData.date_heure_rappel && <X size={16} className="text-red-500" onClick={(e) => { e.stopPropagation(); setFormData({...formData, date_heure_rappel: ""}); }} />}
                    </div>
                </div>

                <div className="fixed bottom-20 right-4 left-4 z-40">
                    <button 
                        onClick={handleSave} 
                        disabled={loading} 
                        className="w-full bg-citron text-white py-4 rounded-2xl shadow-xl font-black text-lg flex justify-center items-center space-x-2 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={24} className="animate-spin"/> : <Save size={24} />}
                        <span>VALIDER L'EXPERTISE</span>
                    </button>
                </div>
            </div>

            {pickerConfig && (
                <CustomDateTimePicker 
                    label={pickerConfig.label} 
                    type={pickerConfig.type} 
                    initialValue={formData[pickerConfig.field]} 
                    onClose={() => setPickerConfig(null)} 
                    onSelect={(val: string) => { setFormData(prev => ({...prev, [pickerConfig.field]: val})); setPickerConfig(null); }} 
                />
            )}
        </div>
    );
};

const Field = ({ label, value, onChange, type="text", icon: Icon }: any) => (
    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm focus-within:ring-2 ring-citron/50 transition-all">
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
    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm focus-within:ring-2 ring-citron/50 transition-all">
        <label className="block text-[10px] font-black text-citron uppercase mb-1">{label}</label>
        <select 
            className="w-full text-sm font-bold bg-transparent outline-none text-gray-800 dark:text-white appearance-none" 
            value={value || ""} 
            onChange={e => onChange(e.target.value)}
        >
            {children}
        </select>
    </div>
);

const ReadOnlyDateInput = ({ label, value, icon: Icon }: any) => (
    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-gray-200 dark:border-slate-700 h-[58px] flex flex-col justify-center cursor-pointer active:bg-gray-50 transition-all">
        <label className="block text-[10px] font-black text-citron uppercase mb-0.5">{label}</label>
        <div className="flex items-center space-x-2">
            <Icon size={14} className="text-citron opacity-50" />
            <div className="text-sm font-bold text-gray-800 dark:text-gray-100">{value || "Choisir"}</div>
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
    const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y: number, m: number) => { let d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; };
    
    const handleConfirm = () => {
        const final = new Date(selectedDate);
        const pad = (n: number) => n.toString().padStart(2, '0');
        if (type === 'datetime') {
            final.setHours(time.hours); final.setMinutes(time.minutes);
            onSelect(`${final.getFullYear()}-${pad(final.getMonth()+1)}-${pad(final.getDate())} ${pad(final.getHours())}:${pad(final.getMinutes())}`);
        } else {
            onSelect(`${final.getFullYear()}-${pad(final.getMonth()+1)}-${pad(final.getDate())}`);
        }
    };
    
    const days = [];
    const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
    const firstDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm p-4">
             <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-sm mx-auto shadow-2xl animate-in slide-in-from-bottom duration-300 border dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-citron uppercase tracking-tighter">{label}</h3>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
                </div>
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="text-gray-500 p-1"><ChevronLeft/></button>
                    <span className="font-bold dark:text-white uppercase tracking-widest text-xs">{months[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                    <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="text-gray-500 p-1"><ChevronRight/></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-6">
                    {['L','M','M','J','V','S','D'].map(d => <div key={d} className="text-[10px] font-black text-gray-400 uppercase">{d}</div>)}
                    {days.map((d, i) => d ? (
                        <button 
                            key={i} 
                            onClick={() => setSelectedDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), d))} 
                            className={`h-9 w-9 rounded-full text-sm font-bold flex items-center justify-center transition-all ${selectedDate.getDate() === d && selectedDate.getMonth() === viewDate.getMonth() ? 'bg-citron text-white shadow-lg shadow-citron/30' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                        >
                            {d}
                        </button>
                    ) : <div key={i} />)}
                </div>
                {type === 'datetime' && (
                    <div className="flex justify-center space-x-6 mb-8 bg-gray-50 dark:bg-slate-800 p-4 rounded-3xl">
                        <div className="flex flex-col items-center">
                            <input type="number" min="0" max="23" value={time.hours} onChange={(e) => setTime({...time, hours: parseInt(e.target.value) || 0})} className="w-12 text-center text-xl font-black bg-transparent dark:text-white outline-none" />
                            <span className="text-[8px] font-black text-gray-400 uppercase">Heures</span>
                        </div>
                        <span className="text-xl font-black text-gray-500 pt-1">:</span>
                        <div className="flex flex-col items-center">
                            <input type="number" min="0" max="59" value={time.minutes} onChange={(e) => setTime({...time, minutes: parseInt(e.target.value) || 0})} className="w-12 text-center text-xl font-black bg-transparent dark:text-white outline-none" />
                            <span className="text-[8px] font-black text-gray-400 uppercase">Minutes</span>
                        </div>
                    </div>
                )}
                <button onClick={handleConfirm} className="w-full bg-citron text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center space-x-2 active:scale-95 transition-transform">
                    <Check size={20} />
                    <span className="uppercase tracking-widest">Confirmer</span>
                </button>
             </div>
        </div>
    );
};