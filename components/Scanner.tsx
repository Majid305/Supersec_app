import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader2, Save, RefreshCw, Wand2, FileText, ArrowLeft, Calendar, Clock, ChevronLeft, ChevronRight, X, Check, Edit3, Send, Sparkles } from 'lucide-react';
import { DocumentData, DocLanguage, DocStatus, DocType } from '../types';
import { analyzeDocument, generateResponse } from '../services/geminiService';
import { saveDocument } from '../services/db';

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
  const [generatingAiResponse, setGeneratingAiResponse] = useState(false);
  const [formData, setFormData] = useState<Partial<DocumentData> | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [pickerConfig, setPickerConfig] = useState<{field: keyof DocumentData, type: 'date' | 'datetime', label: string} | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initEmptyForm = () => ({
    objet: "", emetteur: "", destinataire: "", reference: "",
    resume: "", suite_a_reserver: "", observation: "", reponse: "",
    statut: DocStatus.EN_COURS, langue_document: DocLanguage.FR,
    type_objet: DocType.AUTRE, date_document: new Date().toISOString().split('T')[0],
    date_heure_rappel: ""
  });

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
        // On initialise le formulaire dès qu'un fichier est choisi pour éviter qu'il soit "disparu"
        if (!formData) setFormData(initEmptyForm());
      };
      reader.readAsDataURL(file);
    }
  };

  const performAnalysis = async () => {
    if (!fileData) return;
    setAnalyzing(true);
    try {
      const result = await analyzeDocument(fileData, mimeType);
      setFormData(prev => ({ 
        ...(prev || initEmptyForm()), 
        ...result,
        statut: prev?.statut || DocStatus.EN_COURS,
        langue_document: (result.langue_document as any) || DocLanguage.FR
      }));
    } catch (err: any) {
      alert(`Erreur IA : ${err.message || "Impossible d'analyser le document."}`);
      // En cas d'erreur, on garde le formulaire vide pour saisie manuelle
      if (!formData) setFormData(initEmptyForm());
    } finally {
      setAnalyzing(false);
    }
  };

  const handleManualEntry = () => {
      setIsManualEntry(true);
      setFormData(initEmptyForm());
  };

  const handleGenerateAiResponse = async () => {
    if (!formData || !formData.objet) { alert("Veuillez saisir au moins l'objet du courrier."); return; }
    setGeneratingAiResponse(true);
    try {
        const aiText = await generateResponse(formData as DocumentData, aiInstruction);
        setFormData(prev => ({ ...prev, reponse: aiText }));
    } catch (err) { alert("Erreur lors de la génération de la réponse."); } finally { setGeneratingAiResponse(false); }
  };

  const handleSave = async () => {
    if (!formData || !formData.objet) { alert("L'objet est obligatoire."); return; }
    setLoading(true);
    try {
      await saveDocument({
        ...(formData as any),
        id: initialData?.id || crypto.randomUUID(),
        created_at: initialData?.created_at || Date.now(),
        document_image: fileData || "",
        mimeType: mimeType
      });
      onSave();
    } catch (e) { alert("Erreur lors de la sauvegarde."); } finally { setLoading(false); }
  };

  if (!fileData && !isManualEntry) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 bg-gray-50 dark:bg-slate-950 transition-colors">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white uppercase tracking-tighter">Nouveau Courrier</h2>
        <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleFileChange} />
        <input type="file" accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        <button onClick={() => cameraInputRef.current?.click()} className="w-48 h-48 rounded-full bg-lavender dark:bg-slate-800 border-4 border-teal flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform">
            <Camera size={48} className="text-teal mb-2" /><span className="text-teal font-black">SCANNER</span>
        </button>
        <div className="flex flex-col w-full max-w-xs space-y-3">
            <button onClick={() => fileInputRef.current?.click()} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow font-bold flex justify-center items-center space-x-2 text-gray-700 dark:text-gray-200"><Upload size={20} className="text-teal"/><span>Importer</span></button>
            <button onClick={handleManualEntry} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow font-bold flex justify-center items-center space-x-2 text-gray-700 dark:text-gray-200"><Edit3 size={20} className="text-teal"/><span>Saisie Manuelle</span></button>
            <button onClick={onCancel} className="text-gray-400 font-bold text-xs uppercase p-2 tracking-widest">Annuler</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-32 bg-gray-50 dark:bg-slate-950">
        <div className="relative w-full h-[30vh] bg-gray-800 flex items-center justify-center overflow-hidden">
            {fileData ? (
                <>
                    {mimeType === 'application/pdf' ? <FileText size={64} className="text-white"/> : <img src={fileData} alt="Scan" className="w-full h-full object-contain" />}
                    <button onClick={() => { setFileData(null); setFormData(null); }} className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded-full"><RefreshCw size={20}/></button>
                    {!analyzing && !formData?.objet && (
                      <button onClick={performAnalysis} className="absolute bottom-4 right-4 bg-teal text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center space-x-2 active:scale-95">
                        <Wand2 size={20}/><span>Analyser avec IA</span>
                      </button>
                    )}
                </>
            ) : <div className="text-gray-500 font-bold uppercase tracking-widest">Saisie manuelle</div>}
            
            {analyzing && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white z-10">
                <Loader2 size={48} className="animate-spin text-teal mb-4" />
                <span className="font-bold uppercase tracking-widest">Analyse IA en cours...</span>
              </div>
            )}
        </div>

        {formData && (
            <div className="p-4 space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <button onClick={onCancel} className="text-gray-400 p-2"><ArrowLeft size={20}/></button>
                        <h3 className="text-xl font-bold dark:text-white uppercase tracking-tighter">Édition Courrier</h3>
                    </div>
                    {loading && <Loader2 size={20} className="animate-spin text-teal" />}
                </div>
                
                <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                    <label className="block text-xs font-bold text-teal uppercase mb-1">Statut du dossier</label>
                    <div className="flex space-x-2">
                        <button onClick={() => setFormData({...formData, statut: DocStatus.EN_COURS})} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${formData.statut === DocStatus.EN_COURS ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-gray-50 dark:bg-slate-800 text-gray-400 border-transparent'}`}>EN COURS</button>
                        <button onClick={() => setFormData({...formData, statut: DocStatus.CLOTURE})} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${formData.statut === DocStatus.CLOTURE ? 'bg-green-50 border-green-500 text-green-600' : 'bg-gray-50 dark:bg-slate-800 text-gray-400 border-transparent'}`}>CLÔTURÉ</button>
                    </div>
                </div>

                <Input label="Objet du courrier" value={formData.objet} dir={formData.langue_document === DocLanguage.AR ? 'rtl' : 'ltr'} onChange={(v: string) => setFormData({...formData, objet: v})} />
                
                <div className="grid grid-cols-2 gap-3">
                    <div onClick={() => setPickerConfig({field: 'date_document', type: 'date', label: 'Date du document'})}>
                      <ReadOnlyDateInput label="Date" value={formData.date_document} icon={Calendar} />
                    </div>
                    <Input label="Référence" value={formData.reference} onChange={(v: string) => setFormData({...formData, reference: v})} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Input label="Émetteur" value={formData.emetteur} dir={formData.langue_document === DocLanguage.AR ? 'rtl' : 'ltr'} onChange={(v: string) => setFormData({...formData, emetteur: v})} />
                    <Input label="Destinataire" value={formData.destinataire} dir={formData.langue_document === DocLanguage.AR ? 'rtl' : 'ltr'} onChange={(v: string) => setFormData({...formData, destinataire: v})} />
                </div>

                <TextArea label="Résumé analytique" value={formData.resume} dir={formData.langue_document === DocLanguage.AR ? 'rtl' : 'ltr'} onChange={(v: string) => setFormData({...formData, resume: v})} rows={3} />
                
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-2 border-dashed border-teal/30 space-y-3">
                    <div className="flex items-center space-x-2 text-teal"><Sparkles size={18}/><h4 className="text-xs font-black uppercase">Assistant Rédaction IA</h4></div>
                    <div className="flex space-x-2">
                        <input className="flex-1 bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2 text-xs outline-none dark:text-white" placeholder="Consigne de réponse..." value={aiInstruction} onChange={(e) => setAiInstruction(e.target.value)} />
                        <button onClick={handleGenerateAiResponse} disabled={generatingAiResponse} className="bg-teal text-white p-2 rounded-lg active:scale-95 disabled:opacity-50 transition-opacity">
                          {generatingAiResponse ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                        </button>
                    </div>
                    <TextArea label="Réponse établie" value={formData.reponse} dir={formData.langue_document === DocLanguage.AR ? 'rtl' : 'ltr'} onChange={(v: string) => setFormData({...formData, reponse: v})} rows={4} />
                </div>

                <Input label="Action à réserver" value={formData.suite_a_reserver} dir={formData.langue_document === DocLanguage.AR ? 'rtl' : 'ltr'} onChange={(v: string) => setFormData({...formData, suite_a_reserver: v})} />

                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm cursor-pointer" onClick={() => setPickerConfig({field: 'date_heure_rappel', type: 'datetime', label: 'Date & Heure de Rappel'})}>
                    <label className="block text-xs font-bold text-teal uppercase mb-1">Suivi / Rappel</label>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock size={16} className="text-teal"/>
                        <span className="text-sm font-bold text-gray-800 dark:text-white">{formData.date_heure_rappel || "Ajouter un rappel"}</span>
                      </div>
                      {formData.date_heure_rappel && <X size={16} className="text-red-500" onClick={(e) => { e.stopPropagation(); setFormData({...formData, date_heure_rappel: ""}); }} />}
                    </div>
                </div>

                <TextArea label="Observations complémentaires" value={formData.observation} dir={formData.langue_document === DocLanguage.AR ? 'rtl' : 'ltr'} onChange={(v: string) => setFormData({...formData, observation: v})} />
                
                <div className="fixed bottom-20 right-4 left-4 z-40">
                  <button onClick={handleSave} disabled={loading} className="w-full bg-teal text-white py-4 rounded-xl shadow-xl font-bold text-lg flex justify-center items-center space-x-2 active:scale-95 transition-all disabled:opacity-50">
                    {loading ? <Loader2 size={24} className="animate-spin"/> : <Save size={24}/>}
                    <span>VALIDER L'ENREGISTREMENT</span>
                  </button>
                </div>
            </div>
        )}

        {pickerConfig && (
            <CustomDateTimePicker 
                label={pickerConfig.label} 
                type={pickerConfig.type} 
                initialValue={formData?.[pickerConfig.field] as string} 
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

const Input = ({ label, value, onChange, dir = "ltr" }: any) => (
    <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm focus-within:ring-2 ring-teal/50 transition-all">
        <label className="block text-xs font-bold text-teal uppercase mb-1 text-left">{label}</label>
        <input dir={dir} className="w-full text-gray-800 dark:text-white outline-none bg-transparent font-medium" value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </div>
);

const TextArea = ({ label, value, onChange, dir = "ltr", rows = 2 }: any) => (
    <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm focus-within:ring-2 ring-teal/50 transition-all">
        <label className="block text-xs font-bold text-teal uppercase mb-1 text-left">{label}</label>
        <textarea dir={dir} rows={rows} className="w-full text-gray-800 dark:text-white outline-none bg-transparent resize-none font-medium" value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </div>
);

const ReadOnlyDateInput = ({ label, value, icon: Icon }: any) => (
    <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm h-14 flex flex-col justify-center cursor-pointer">
        <label className="block text-[10px] font-bold text-teal uppercase mb-0.5 text-left">{label}</label>
        <div className="flex items-center space-x-2">
            <Icon size={14} className="text-teal opacity-50"/>
            <div className="text-sm font-bold text-gray-800 dark:text-white">{value || "Définir"}</div>
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
        if (type === 'datetime') {
            final.setHours(time.hours); final.setMinutes(time.minutes);
            // Format YYYY-MM-DD HH:mm
            const pad = (n: number) => n.toString().padStart(2, '0');
            const str = `${final.getFullYear()}-${pad(final.getMonth()+1)}-${pad(final.getDate())} ${pad(final.getHours())}:${pad(final.getMinutes())}`;
            onSelect(str);
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
             <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm mx-auto shadow-2xl border dark:border-slate-800 animate-in slide-in-from-bottom duration-300">
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-teal uppercase">{label}</h3><button onClick={onClose} className="p-2 text-gray-400"><X size={20}/></button></div>
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="text-gray-500"><ChevronLeft/></button>
                    <span className="font-bold dark:text-white">{months[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                    <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="text-gray-500"><ChevronRight/></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-6 text-xs font-bold text-gray-400">
                    {['L','M','M','J','V','S','D'].map(d => <div key={d}>{d}</div>)}
                    {days.map((d, i) => d ? (
                        <button key={i} onClick={() => setSelectedDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), d))} className={`h-9 rounded-full text-sm font-medium transition-colors ${selectedDate.getDate() === d && selectedDate.getMonth() === viewDate.getMonth() ? 'bg-teal text-white' : 'dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>{d}</button>
                    ) : <div key={i}/>)}
                </div>
                {type === 'datetime' && (
                    <div className="flex justify-center space-x-4 mb-6 bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl">
                        <div className="flex flex-col items-center">
                          <input type="number" min="0" max="23" value={time.hours} onChange={(e) => setTime({...time, hours: parseInt(e.target.value) || 0})} className="w-12 text-center font-bold bg-transparent dark:text-white outline-none"/>
                          <span className="text-[8px] font-black uppercase text-gray-400">HH</span>
                        </div>
                        <span className="font-bold text-gray-400 self-start mt-1">:</span>
                        <div className="flex flex-col items-center">
                          <input type="number" min="0" max="59" value={time.minutes} onChange={(e) => setTime({...time, minutes: parseInt(e.target.value) || 0})} className="w-12 text-center font-bold bg-transparent dark:text-white outline-none"/>
                          <span className="text-[8px] font-black uppercase text-gray-400">MM</span>
                        </div>
                    </div>
                )}
                <button onClick={handleConfirm} className="w-full bg-teal text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform flex justify-center items-center space-x-2"><Check size={20}/><span>CONFIRMER</span></button>
             </div>
        </div>
    );
};