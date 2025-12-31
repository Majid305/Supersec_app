import React, { useEffect, useState } from 'react';
import { Search, Download, MoreVertical, Edit, Trash2, Printer, Copy, FileText, X, Clock, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import { RejectedCheck, CheckRejectionClass, CheckSituation } from '../types';
import { getAllChecks, deleteCheck, saveCheck } from '../services/db';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";

export const CheckDashboard = ({ onEdit }: { onEdit: (check: RejectedCheck) => void }) => {
    const [checks, setChecks] = useState<RejectedCheck[]>([]);
    const [filtered, setFiltered] = useState<RejectedCheck[]>([]);
    const [search, setSearch] = useState("");
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        const lower = search.toLowerCase();
        const res = checks.filter(c => 
            c.banque.toLowerCase().includes(lower) || 
            c.numero_cheque.includes(search) ||
            (c.numero_compte && c.numero_compte.includes(search)) ||
            (c.rib && c.rib.includes(search)) ||
            (c.ville && c.ville.toLowerCase().includes(lower)) ||
            (c.nom_proprietaire && c.nom_proprietaire.toLowerCase().includes(lower)) ||
            (c.nom_beneficiaire && c.nom_beneficiaire.toLowerCase().includes(lower)) ||
            c.montant.toString().includes(search) ||
            c.mois_rejet.toLowerCase().includes(lower) ||
            c.agence.toLowerCase().includes(lower) ||
            c.motif_rejet.toLowerCase().includes(lower)
        );
        setFiltered(res);
    }, [search, checks]);

    const load = async () => {
        try {
            const data = await getAllChecks();
            setChecks(data);
            setFiltered(data);
        } catch (err) {
            console.error("Failed to load checks", err);
        }
    };

    const handleExportXLSX = () => {
        const ws = XLSX.utils.json_to_sheet(checks.map(({ document_image, ...r }) => r));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Chèques Rejetés");
        XLSX.writeFile(wb, "Supersec_Cheques_Export.xlsx");
    };

    const handleDuplicate = async (check: RejectedCheck, e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpenId(null);
        const newCheck: RejectedCheck = {
            ...check,
            id: crypto.randomUUID(),
            created_at: Date.now(),
        };
        await saveCheck(newCheck);
        load();
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;
        try {
            await deleteCheck(deleteTargetId);
            setChecks(prev => prev.filter(c => c.id !== deleteTargetId));
            setDeleteTargetId(null);
        } catch (err) {
            console.error("Delete check failed", err);
            alert("Erreur lors de la suppression du chèque.");
            setDeleteTargetId(null);
        }
    };

    const handleDownloadPDF = async (check: RejectedCheck, e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpenId(null);
        setGeneratingPdf(true);

        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            
            // Header expert
            doc.setFillColor(132, 204, 22); // Citron green
            doc.rect(0, 0, pageWidth, 30, 'F');
            doc.setTextColor(255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text("FICHE EXPERT : CHÈQUE REJETÉ", pageWidth / 2, 20, { align: 'center' });

            doc.setTextColor(50);
            let y = 45;
            const left = 20;

            const addField = (label: string, value: any) => {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(132, 204, 22);
                doc.text(label.toUpperCase(), left, y);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(50);
                doc.text(String(value || "N/A"), left, y + 6);
                y += 15;
            };

            addField("Banque", check.banque);
            addField("N° Chèque", check.numero_cheque);
            addField("Montant", `${Number(check.montant).toLocaleString()} DH`);
            addField("Tireur (Propriétaire)", check.nom_proprietaire);
            addField("Bénéficiaire", check.nom_beneficiaire);
            addField("RIB", check.rib);
            addField("Motif de rejet", check.motif_rejet);
            addField("Situation", check.situation_actuelle);
            addField("Date Rejet", check.date_rejet);

            doc.save(`Expert_Cheque_${check.numero_cheque}.pdf`);
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la génération du PDF.");
        } finally {
            setGeneratingPdf(false);
        }
    };

    const getSituationBadge = (sit: CheckSituation) => {
        const colors: Record<string, string> = {
            [CheckSituation.COFFRE]: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300',
            [CheckSituation.REGULARISE]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
            [CheckSituation.CONTENTIEUX]: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
            [CheckSituation.RESTITUE]: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
        };
        return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${colors[sit] || 'bg-gray-100'}`}>{sit}</span>;
    };

    const getStatusIndicator = (check: RejectedCheck) => {
        if (check.situation_actuelle === CheckSituation.REGULARISE) return 'border-l-4 border-green-500';
        if (check.date_heure_rappel) {
            const deadline = new Date(check.date_heure_rappel).getTime();
            if (deadline < Date.now()) return 'border-l-4 border-red-600 animate-pulse';
        }
        return check.classe_rejet === CheckRejectionClass.FOND ? 'border-l-4 border-red-400' : 'border-l-4 border-citron';
    };

    return (
        <div className="h-full bg-lavande dark:bg-lavande-deep flex flex-col transition-colors duration-500">
            {generatingPdf && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex flex-col items-center justify-center text-white backdrop-blur-sm">
                    <Loader2 size={48} className="animate-spin mb-4 text-citron" />
                    <p className="font-bold text-lg">Génération de la fiche expert...</p>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 p-4 shadow-sm z-10">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Chèques Rejetés</h2>
                    <button onClick={handleExportXLSX} className="text-citron p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <Download size={22} />
                    </button>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                        className="w-full bg-gray-100 dark:bg-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm outline-none text-gray-800 dark:text-white focus:ring-2 ring-citron/50 transition-all"
                        placeholder="Rechercher banque, N°, nom..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
                {filtered.length === 0 && (
                    <div className="text-center text-gray-400 mt-20 flex flex-col items-center">
                        <FileText size={48} className="mb-2 opacity-20" />
                        <p>Aucun chèque enregistré.</p>
                    </div>
                )}
                
                {filtered.map(check => (
                    <div 
                        key={check.id} 
                        onClick={() => onEdit(check)}
                        className={`bg-white dark:bg-slate-800/40 rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.98] transition-all relative ${getStatusIndicator(check)}`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1 truncate pr-2">
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">{check.banque || "Banque Inconnue"}</h3>
                                <p className="text-lg font-black text-citron leading-none mt-1">{(Number(check.montant) || 0).toLocaleString()} DH</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase mt-1 line-clamp-1">{check.nom_proprietaire}</p>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === check.id ? null : check.id); }}
                                className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <MoreVertical size={18} />
                            </button>
                        </div>

                        <div className="mt-3 flex justify-between items-center border-t border-gray-50 dark:border-slate-700/50 pt-3">
                            {getSituationBadge(check.situation_actuelle)}
                            <div className="text-right">
                                <span className="text-[10px] text-gray-400 font-bold block leading-none">N° {check.numero_cheque}</span>
                                <span className="text-[9px] text-gray-300 font-bold uppercase">{check.date_rejet}</span>
                            </div>
                        </div>

                        {menuOpenId === check.id && (
                            <div className="absolute right-4 top-12 bg-white dark:bg-slate-900 shadow-2xl border border-gray-100 dark:border-slate-800 rounded-2xl z-30 flex flex-col w-48 py-2 animate-in fade-in zoom-in-95 duration-150">
                                <button onClick={() => { onEdit(check); setMenuOpenId(null); }} className="flex items-center px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-bold text-gray-700 dark:text-gray-100 transition-colors">
                                    <Edit size={16} className="mr-3 text-citron" /> Modifier
                                </button>
                                <button onClick={(e) => { handleDuplicate(check, e); setMenuOpenId(null); }} className="flex items-center px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-bold text-gray-700 dark:text-gray-100 transition-colors">
                                    <Copy size={16} className="mr-3 text-blue-500" /> Dupliquer
                                </button>
                                <button onClick={(e) => { handleDownloadPDF(check, e); setMenuOpenId(null); }} className="flex items-center px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-bold text-gray-700 dark:text-gray-100 transition-colors">
                                    <Printer size={16} className="mr-3 text-gray-500" /> Fiche Expert PDF
                                </button>
                                <div className="h-px bg-gray-100 dark:bg-slate-800 my-1 mx-2"></div>
                                <button onClick={(e) => { e.stopPropagation(); setDeleteTargetId(check.id); setMenuOpenId(null); }} className="flex items-center px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-bold text-red-600 dark:text-red-400 transition-colors">
                                    <Trash2 size={16} className="mr-3" /> Supprimer
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); }} className="absolute -top-2 -right-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-1.5 rounded-full shadow-lg">
                                    <X size={12} className="text-gray-400" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {deleteTargetId && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 w-full max-w-xs text-center shadow-2xl animate-in zoom-in duration-200">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-gray-800 dark:text-white uppercase mb-2 tracking-tighter">Supprimer ?</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Ce chèque sera définitivement retiré de la base de données locale.</p>
                        <div className="flex flex-col space-y-3">
                            <button onClick={confirmDelete} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-transform uppercase tracking-widest">Confirmer</button>
                            <button onClick={() => setDeleteTargetId(null)} className="w-full text-gray-400 font-bold py-2 hover:text-gray-600 transition-colors">ANNULER</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};