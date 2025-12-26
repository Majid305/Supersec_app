import React, { useEffect, useState } from 'react';
import { Search, Filter, Download, MoreVertical, Edit, Trash2, Printer, Copy, FileText, X, Clock, AlertCircle } from 'lucide-react';
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
        const data = await getAllChecks();
        setChecks(data);
        setFiltered(data);
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

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Supprimer ce chèque ?")) return;
        setMenuOpenId(null);
        await deleteCheck(id);
        load();
    };

    const handleDownloadPDF = async (check: RejectedCheck, e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpenId(null);
        setGeneratingPdf(true);

        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            doc.setFillColor(132, 204, 22);
            doc.rect(0, 0, pageWidth, 30, 'F');
            doc.setTextColor(255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text("FICHE DE CHÈQUE REJETÉ", pageWidth / 2, 20, { align: 'center' });

            doc.setTextColor(50);
            const startY = 45;
            const leftX = 20;
            const midX = 110;
            const rowH = 10;

            const drawField = (label: string, value: string, x: number, y: number, fullWidth = false) => {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(132, 204, 22);
                doc.text(label.toUpperCase(), x, y - 4);
                
                doc.setFontSize(11);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(50);
                doc.text(String(value || "-"), x, y);
                
                doc.setDrawColor(230);
                const lineLen = fullWidth ? (pageWidth - leftX * 2) : 80;
                doc.line(x, y + 2, x + lineLen, y + 2);
            };

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100);
            doc.text("INFORMATIONS BANCAIRES", leftX, startY - 8);

            drawField("Mois de Rejet", check.mois_rejet, leftX, startY);
            drawField("Date Système", check.date_systeme, midX, startY);
            
            drawField("Banque", check.banque, leftX, startY + rowH * 1.5);
            drawField("Ville", check.ville, midX, startY + rowH * 1.5);

            drawField("N° Chèque", check.numero_cheque, leftX, startY + rowH * 3);
            drawField("N° Compte", check.numero_compte, midX, startY + rowH * 3);

            drawField("Montant", `${check.montant.toLocaleString()} DH`, leftX, startY + rowH * 4.5);
            drawField("Date Rejet", check.date_rejet, midX, startY + rowH * 4.5);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100);
            doc.text("PARTIES PRENANTES", leftX, startY + rowH * 6.5);

            drawField("Propriétaire (Tireur)", check.nom_proprietaire, leftX, startY + rowH * 7.5);
            drawField("Bénéficiaire", check.nom_beneficiaire, midX, startY + rowH * 7.5);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100);
            doc.text("SITUATION DU REJET", leftX, startY + rowH * 9.5);

            drawField("Classe", check.classe_rejet, leftX, startY + rowH * 10.5);
            drawField("Situation Actuelle", check.situation_actuelle, midX, startY + rowH * 10.5);
            
            drawField("Agence", check.agence, leftX, startY + rowH * 12);
            drawField("Motif", check.motif_rejet, midX, startY + rowH * 12);
            
            drawField("Rappel Prévu", check.date_heure_rappel || "Aucun", leftX, startY + rowH * 13.5, true);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100);
            doc.text("COORDONNÉES DE PAIEMENT (RIB)", leftX, startY + rowH * 15.5);
            drawField("RIB Complet", check.rib, leftX, startY + rowH * 16.5, true);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100);
            doc.text("OBSERVATIONS", leftX, startY + rowH * 18.5);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80);
            const obsLines = doc.splitTextToSize(check.observation || "Aucune observation particulière.", pageWidth - 40);
            doc.text(obsLines, leftX, startY + rowH * 19.2);

            if (check.document_image && check.mimeType.startsWith('image/')) {
                doc.addPage();
                doc.setFillColor(245, 245, 245);
                doc.rect(0, 0, pageWidth, 20, 'F');
                doc.setFontSize(12);
                doc.setTextColor(100);
                doc.text("COPIE NUMÉRISÉE DU CHÈQUE", pageWidth / 2, 13, { align: 'center' });
                
                const imgProps = doc.getImageProperties(check.document_image);
                const margin = 15;
                const availableW = pageWidth - margin * 2;
                const availableH = pageHeight - 40;
                let w = availableW;
                let h = (imgProps.height * w) / imgProps.width;
                if (h > availableH) {
                    h = availableH;
                    w = (imgProps.width * h) / imgProps.height;
                }
                doc.addImage(check.document_image, 'JPEG', (pageWidth - w) / 2, 25, w, h);
            }

            doc.save(`Supersec_Cheque_${check.numero_cheque}.pdf`);
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la génération du PDF.");
        } finally {
            setGeneratingPdf(false);
        }
    };

    const getSituationBadge = (sit: CheckSituation) => {
        const colors: Record<string, string> = {
            [CheckSituation.COFFRE]: 'bg-gray-100 text-gray-700 dark:bg-rose-900/30 dark:text-rose-200',
            [CheckSituation.REGULARISE]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
            [CheckSituation.CONTENTIEUX]: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
            [CheckSituation.RESTITUE]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        };
        return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${colors[sit] || 'bg-gray-100'}`}>{sit}</span>;
    };

    const getStatusIndicator = (check: RejectedCheck) => {
        if (check.situation_actuelle === CheckSituation.REGULARISE) return 'border-l-4 border-green-500';
        if (check.date_heure_rappel) {
            const deadline = new Date(check.date_heure_rappel).getTime();
            const now = Date.now();
            if (deadline < now) return 'border-l-4 border-red-600 animate-pulse';
            if ((deadline - now) < 86400000) return 'border-l-4 border-orange-500';
        }
        return check.classe_rejet === CheckRejectionClass.FOND ? 'border-l-4 border-red-400' : 'border-l-4 border-citron';
    };

    return (
        <div className="h-full bg-gray-50 dark:bg-bordeaux flex flex-col">
            {generatingPdf && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex flex-col items-center justify-center text-white backdrop-blur-sm">
                    <Loader2 size={48} className="animate-spin mb-4 text-citron" />
                    <p className="font-bold text-lg">Génération de la fiche expert...</p>
                </div>
            )}

            <div className="bg-white dark:bg-rose-950 p-4 shadow-sm z-10 transition-colors duration-300">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Chèques Rejetés</h2>
                    <button onClick={handleExportXLSX} className="text-citron p-2 hover:bg-gray-100 dark:hover:bg-rose-900 rounded-full transition-colors">
                        <Download size={22} />
                    </button>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                        className="w-full bg-gray-100 dark:bg-rose-900 rounded-xl pl-10 pr-4 py-2 text-sm outline-none text-gray-800 dark:text-white focus:ring-2 ring-citron/50 transition-all"
                        placeholder="Rechercher banque, N°, RIB, nom..."
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
                        className={`bg-white dark:bg-rose-950/40 rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.98] transition-all relative group ${getStatusIndicator(check)}`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1 pr-2">
                                <div className="flex items-center space-x-2">
                                    <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">{check.banque || "Banque inconnue"}</h3>
                                    {check.date_heure_rappel && check.situation_actuelle !== CheckSituation.REGULARISE && (
                                        <Clock size={14} className={new Date(check.date_heure_rappel).getTime() < Date.now() ? "text-red-500" : "text-citron"} />
                                    )}
                                </div>
                                <p className="text-[10px] font-black text-citron uppercase mt-0.5 tracking-wider">{check.ville || "Ville non précisée"}</p>
                                <div className="mt-2 space-y-0.5">
                                    <p className="text-xs text-gray-500 dark:text-rose-200/60 line-clamp-1">
                                        <span className="font-bold opacity-70">De:</span> {check.nom_proprietaire || "Non identifié"}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-rose-200/60 line-clamp-1">
                                        <span className="font-bold opacity-70">Pour:</span> {check.nom_beneficiaire || "Non identifié"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end shrink-0">
                                <span className="text-lg font-black text-citron leading-none">{(Number(check.montant) || 0).toLocaleString()} DH</span>
                                <div className="flex space-x-1 mt-2">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${check.classe_rejet === CheckRejectionClass.FOND ? 'bg-red-500 text-white' : 'bg-citron text-white'}`}>
                                        {check.classe_rejet}
                                    </span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === check.id ? null : check.id); }}
                                        className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-rose-900 rounded-full transition-colors"
                                    >
                                        <MoreVertical size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-50 dark:border-rose-900 flex justify-between items-end">
                            <div className="flex flex-col space-y-1.5">
                                {getSituationBadge(check.situation_actuelle)}
                                {check.date_heure_rappel && check.situation_actuelle !== CheckSituation.REGULARISE && (
                                    <span className={`text-[9px] font-black uppercase flex items-center ${new Date(check.date_heure_rappel).getTime() < Date.now() ? "text-red-500 animate-pulse" : "text-rose-400"}`}>
                                        <AlertCircle size={10} className="mr-1" /> Échéance: {check.date_heure_rappel.replace('T', ' ')}
                                    </span>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 dark:text-rose-300 font-mono font-bold">N° {check.numero_cheque}</p>
                                <p className="text-[10px] text-gray-400 dark:text-rose-300 uppercase font-bold">{check.date_rejet}</p>
                            </div>
                        </div>

                        {menuOpenId === check.id && (
                            <div className="absolute right-4 top-12 bg-white dark:bg-rose-950 shadow-2xl border border-gray-100 dark:border-rose-800 rounded-2xl z-30 flex flex-col w-48 py-2 animate-in fade-in zoom-in-95 duration-150">
                                <button onClick={() => { onEdit(check); setMenuOpenId(null); }} className="flex items-center px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-rose-900 text-sm font-bold text-gray-700 dark:text-gray-100 transition-colors">
                                    <Edit size={16} className="mr-3 text-citron" /> Modifier
                                </button>
                                <button onClick={(e) => { handleDuplicate(check, e); setMenuOpenId(null); }} className="flex items-center px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-rose-900 text-sm font-bold text-gray-700 dark:text-gray-100 transition-colors">
                                    <Copy size={16} className="mr-3 text-blue-500" /> Dupliquer
                                </button>
                                <button onClick={(e) => { handleDownloadPDF(check, e); setMenuOpenId(null); }} className="flex items-center px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-rose-900 text-sm font-bold text-gray-700 dark:text-gray-100 transition-colors">
                                    <Printer size={16} className="mr-3 text-gray-500" /> Fiche Expert PDF
                                </button>
                                <div className="h-px bg-gray-100 dark:bg-rose-800 my-1 mx-2"></div>
                                <button onClick={(e) => { handleDelete(check.id, e); setMenuOpenId(null); }} className="flex items-center px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-bold text-red-600 dark:text-red-400 transition-colors">
                                    <Trash2 size={16} className="mr-3" /> Supprimer
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); }} className="absolute -top-2 -right-2 bg-white dark:bg-rose-950 border border-gray-200 dark:border-rose-800 p-1.5 rounded-full shadow-lg">
                                    <X size={12} className="text-gray-400" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const Loader2 = ({ size, className }: any) => (
    <svg className={`animate-spin ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
);