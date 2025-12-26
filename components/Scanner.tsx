
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader2, Save, RefreshCw, Wand2, FileText, ArrowLeft, Trash2, Calendar, Clock, ChevronLeft, ChevronRight, X, Check, Edit3, Image as ImageIcon } from 'lucide-react';
import { DocumentData, DocLanguage, DocStatus, DocType } from '../types';
import { analyzeDocument, generateResponse } from '../services/geminiService';
import { saveDocument, deleteDocument } from '../services/db';

interface ScannerProps {
  onSave: () => void;
  onCancel: () => void;
  initialData?: DocumentData | null;
}

export const Scanner: React.FC<ScannerProps> = ({ onSave, onCancel, initialData }) => {
  const [fileData, setFileData] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [formData, setFormData] = useState<Partial<DocumentData> | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(false);
  
  const [pickerConfig, setPickerConfig] = useState<{field: keyof DocumentData, type: 'date' | 'datetime', label: string} | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
        setFileData(initialData.document_image);
        setMimeType(initialData.mimeType || "image/jpeg");
        setFormData(initialData);
        if (!initialData.document_image) setIsManualEntry(true);
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

  const performAnalysis = async () => {
    if (!fileData) return;
    setAnalyzing(true);
    try {
      const result = await analyzeDocument(fileData, mimeType);
      setFormData(prev => ({ ...prev, ...result }));
    } catch (err: any) {
      alert(`Erreur IA : ${err.message || "Impossible d'accéder au service."}`);
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleManualEntry = () => {
      setIsManualEntry(true);
      setFormData({
          objet: "",
          emetteur: "",
          destinataire: "",
          reference: "",
          resume: "",
          suite_a_reserver: "",
          observation: "",
          statut: DocStatus.EN_COURS,
          langue_document: DocLanguage.FR,
          type_objet: DocType.AUTRE,
          date_document: new Date().toISOString().split('T')[0],
          date_heure_rappel: ""
      });
  };

  const handleSave = async () => {
    if (!formData) return;
    setLoading(true);
    const newDoc: DocumentData = {
      ...(formData as any),
      id: initialData?.id || crypto.randomUUID(),
      created_at: initialData?.created_at || Date.now(),
      document_image: fileData || "",
      mimeType: mimeType,
      statut: formData.statut || DocStatus.EN_COURS,
      date_heure_rappel: formData.date_heure_rappel || "",
      langue_document: formData.langue_document || DocLanguage.FR,
      type_objet: formData.type_objet || DocType.AUTRE
    };
    try {
      await saveDocument(newDoc);
      onSave();
    } catch (e) {
      alert("Erreur de sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  if (!fileData && !isManualEntry) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 bg-gray-50 dark:bg-slate-950">
        <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white uppercase tracking-tighter">Nouveau Courrier</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Prise de vue ou import administratif</p>
        </div>
        
        <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleFileChange} />
        {/* Fixed: Use handleFileChange instead of undefined handleChange */}
        <input type="file" accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

        <button 
            onClick={() => cameraInputRef.current?.click()}
            className="w-48 h-48 rounded-full bg-[#E6E6FA] dark:bg-slate-800 border-4 border-[#0ABAB5] flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
            <Camera size={48} className="text-[#0ABAB5] mb-2" />
            <span className="text-[#0ABAB5] font-black uppercase tracking-widest">Scanner</span>
        </button>

        <div className="flex flex-col w-full max-w-xs space-y-3">
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center space-x-3 bg-white dark:bg-slate-800 p-4 rounded-xl shadow text-gray-700 dark:text-gray-300 border border-transparent dark:border-slate-700 active:scale-95 transition-transform"
            >
                <Upload size={20} className="text-[#0ABAB5]" />
                <span className="font-bold">Importer un fichier</span>
            </button>
            <button 
                onClick={handleManualEntry}
                className="flex items-center justify-center space-x-3 bg-white dark:bg-slate-800 p-4 rounded-xl shadow text-gray-700 dark:text-gray-300 border border-transparent dark:border-slate-700 active:scale-95 transition-transform"
            >
                <Edit3 size={20} className="text-[#0ABAB5]" />
                <span className="font-bold">Saisie Manuelle</span>
            </button>
            <button onClick={onCancel} className="text-gray-400 font-bold text-xs uppercase p-2 tracking-widest">Annuler</button>
        </div>
      </div>
    );
  }

  if (analyzing) {
      return (
          <div className="flex flex-col items-center justify-center h-full space-y-4 bg-gray-50 dark:bg-slate-950">
              <Loader2 size={48} className="text-[#0ABAB5] animate-spin" />
              <p className="text-lg font-medium text-gray-600 dark:text-gray-300">Analyse IA en cours...</p>
          </div>
      )
  }

  return (
    <div className="h-full overflow-y-auto pb-24 bg-gray-50 dark:bg-slate-950">
        <div className="relative w-full h-[35vh] bg-gray-800 flex items-center justify-center overflow-hidden shrink-0 group">
            {fileData ? (
                <>
                    {mimeType === 'application/pdf' ? (
                        <div className="flex flex-col items-center text-gray-300">
                            <FileText size={64} />
                            <span className="text-sm font-bold mt-2">Document PDF</span>
                        </div>
                    ) : (
                        <img src={fileData} alt="Preview" className="w-full h-full object-contain" />
                    )}
                    <button onClick={() => setFileData(null)} className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded-full z-10"><RefreshCw size={20} /></button>
                    {!formData && (
                        <button onClick={performAnalysis} className="absolute bottom-4 right-4 bg-[#0ABAB5] text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center space-x-2 animate-bounce z-10"><Wand2 size={20} /><span>Analyser</span></button>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-gray-500"><ImageIcon size={32} /></div>
                    <button onClick={() => cameraInputRef.current?.click()} className="bg-[#0ABAB5]/20 text-[#0ABAB5] border border-[#0ABAB5] px-4 py-2 rounded-full font-bold flex items-center space-x-2"><Camera size={18} /><span>Ajouter une photo</span></button>
                </div>
            )}
        </div>

        {formData && (
            <div className="p-4 space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                         <button onClick={onCancel} className="text-gray-400 p-2"><ArrowLeft size={20}/></button>
                         <h3 className="text-xl font-bold text-gray-800 dark:text-white uppercase tracking-tighter">Données Courrier</h3>
                    </div>
                </div>

                <div className={`space-y-4 ${formData.langue_document === DocLanguage.AR ? 'rtl' : 'ltr'}`} dir={formData.langue_document === DocLanguage.AR ? 'rtl' : 'ltr'}>
                    <Input label="Objet" value={formData.objet} onChange={(v: string) => setFormData({...formData, objet: v})} />
                    
                    <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm focus-within:ring-2 ring-[#0ABAB5]">
                        <label className="block text-xs font-bold text-[#0ABAB5] uppercase mb-1">Type Objet</label>
                        <select className="w-full text-gray-800 dark:text-gray-100 outline-none bg-transparent" value={formData.type_objet || DocType.AUTRE} onChange={(e) => setFormData({...formData, type_objet: e.target.value as any})}>
                            {Object.values(DocType).map(type => <option key={type} value={type} className="dark:bg-slate-800">{type}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div onClick={() => setPickerConfig({field: 'date_document', type: 'date', label: 'Date Document'})}>
                            <ReadOnlyDateInput label="Date Document" value={formData.date_document} icon={Calendar} />
                        </div>
                        <Input label="Référence" value={formData.reference} onChange={(v: string) => setFormData({...formData, reference: v})} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Émetteur" value={formData.emetteur} onChange={(v: string) => setFormData({...formData, destinataire: v})} />
                        <Input label="Destinataire" value={formData.destinataire} onChange={(v: string) => setFormData({...formData, destinataire: v})} />
                    </div>

                    <TextArea label="Résumé" value={formData.resume} onChange={(v: string) => setFormData({...formData, resume: v})} rows={3} />
                    <Input label="Action Suggérée" value={formData.suite_a_reserver} onChange={(v: string) => setFormData({...formData, suite_a_reserver: v})} />

                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-all">
                        <label className="block text-xs font-bold text-[#0ABAB5] uppercase mb-1">Rappel / Échéance</label>
                        <div 
                            onClick={() => setPickerConfig({field: 'date_heure_rappel', type: 'datetime', label: 'Date & Heure Rappel'})}
                            className="flex items-center space-x-2 cursor-pointer py-1"
                        >
                            <Clock size={16} className="text-[#0ABAB5]" />
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

                    <TextArea label="Observations" value={formData.observation} onChange={(v: string) => setFormData({...formData, observation: v})} />
                    
                    <div className="fixed bottom-20 right-4 left-4 z-40">
                         <button onClick={handleSave} disabled={loading} className="w-full bg-[#0ABAB5] text-white py-4 rounded-xl shadow-xl font-bold text-lg flex justify-center items-center space-x-2 active:scale-95 transition-transform disabled:opacity-50">
                             {loading ? <Loader2 size={24} className="animate-spin"/> : <Save size={24} />}
                             <span>ENREGISTRER</span>
                         </button>
                    </div>
                </div>
            </div>
        )}

        {pickerConfig && (
            <CustomDateTimePicker label={pickerConfig.label} type={pickerConfig.type} initialValue={formData?.[pickerConfig.field] as string} onClose={() => setPickerConfig(null)} onSelect={(val: string) => { setFormData(prev => ({...prev, [pickerConfig.field]: val})); setPickerConfig(null); }} />
        )}
    </div>
  );
};

const ReadOnlyDateInput = ({ label, value, icon: Icon }: any) => (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 px-1 py-1 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors group cursor-pointer h-14 flex flex-col justify-center">
        <label className="block text-[10px] font-bold text-[#0ABAB5] uppercase text-center mb-0.5 tracking-wider">{label}</label>
        <div className="flex items-center justify-center relative pointer-events-none">
            <Icon size={14} className="absolute left-2 text-[#0ABAB5] opacity-50" />
            <div className="text-sm font-bold text-gray-800 dark:text-gray-100">{value || "-"}</div>
        </div>
    </div>
);

const Input = ({ label, value, onChange, type = "text" }: any) => (
    <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm focus-within:ring-2 ring-[#0ABAB5]">
        <label className="block text-xs font-bold text-[#0ABAB5] uppercase mb-1">{label}</label>
        <input type={type} className="w-full text-gray-800 dark:text-gray-100 outline-none bg-transparent" value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </div>
);

const TextArea = ({ label, value, onChange, rows = 2 }: any) => (
    <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm focus-within:ring-2 ring-[#0ABAB5]">
        <label className="block text-xs font-bold text-[#0ABAB5] uppercase mb-1">{label}</label>
        <textarea rows={rows} className="w-full text-gray-800 dark:text-gray-100 outline-none bg-transparent resize-none" value={value || ""} onChange={(e) => onChange(e.target.value)} />
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
            final.setHours(time.hours); final.setMinutes(time.minutes);
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
        <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/60 backdrop-blur-sm p-4">
             <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm mx-auto shadow-2xl border dark:border-slate-800 animate-in slide-in-from-bottom duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-[#0ABAB5] uppercase">{label}</h3>
                    <button onClick={onClose} className="p-2"><X size={20}/></button>
                </div>
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))}><ChevronLeft/></button>
                    <span className="font-bold">{months[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                    <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))}><ChevronRight/></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-6">
                    {['L','M','M','J','V','S','D'].map(d => <div key={d} className="text-xs font-bold text-gray-400">{d}</div>)}
                    {days.map((d, i) => d ? (
                        <button key={i} onClick={() => handleDateClick(d)} className={`h-10 rounded-full flex items-center justify-center text-sm font-medium ${selectedDate.getDate() === d && selectedDate.getMonth() === viewDate.getMonth() ? 'bg-[#0ABAB5] text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>{d}</button>
                    ) : <div key={i} />)}
                </div>
                {type === 'datetime' && (
                    <div className="flex items-center justify-center space-x-4 mb-6 bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl">
                        <div className="flex flex-col items-center">
                            <input type="number" min="0" max="23" value={time.hours} onChange={(e) => setTime({...time, hours: parseInt(e.target.value) || 0})} className="w-12 text-center font-bold bg-transparent outline-none" />
                            <span className="text-[10px] text-gray-400 uppercase font-black">Heures</span>
                        </div>
                        <span className="font-bold">:</span>
                        <div className="flex flex-col items-center">
                            <input type="number" min="0" max="59" value={time.minutes} onChange={(e) => setTime({...time, minutes: parseInt(e.target.value) || 0})} className="w-12 text-center font-bold bg-transparent outline-none" />
                            <span className="text-[10px] text-gray-400 uppercase font-black">Minutes</span>
                        </div>
                    </div>
                )}
                <button onClick={handleConfirm} className="w-full bg-[#0ABAB5] text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center space-x-2"><Check size={20} /><span>VALIDER</span></button>
             </div>
        </div>
    );
};
