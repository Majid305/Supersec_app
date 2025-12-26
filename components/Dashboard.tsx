import React, { useEffect, useState } from 'react';
import { Search, Filter, Download, MoreVertical, Edit, Trash2, Share2, Printer, X, Loader2, FileText, LogOut, Save, AlertTriangle } from 'lucide-react';
import { DocumentData, DocStatus } from '../types';
import { getAllDocuments, deleteDocument } from '../services/db';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';

interface DashboardProps {
    onEdit: (doc: DocumentData) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onEdit }) => {
    const [documents, setDocuments] = useState<DocumentData[]>([]);
    const [filteredDocs, setFilteredDocs] = useState<DocumentData[]>([]);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<"ALL" | DocStatus>("ALL");
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [showExitModal, setShowExitModal] = useState(false);
    const [isExited, setIsExited] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        let res = documents;
        if (search) {
            const lower = search.toLowerCase();
            res = res.filter(d => 
                d.objet.toLowerCase().includes(lower) || 
                d.emetteur.toLowerCase().includes(lower) ||
                d.resume.toLowerCase().includes(lower) ||
                (d.type_objet || "").toLowerCase().includes(lower)
            );
        }
        if (filterStatus !== "ALL") {
            res = res.filter(d => d.statut === filterStatus);
        }
        setFilteredDocs(res);
    }, [search, filterStatus, documents]);

    const loadData = async () => {
        const docs = await getAllDocuments();
        setDocuments(docs);
        setFilteredDocs(docs);
    };

    const handleBackup = async () => {
        try {
            const docs = await getAllDocuments();
            if (docs.length === 0) return false;
            const json = JSON.stringify(docs, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `supersec_auto_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const handleExit = async (withBackup: boolean) => {
        if (withBackup) {
            await handleBackup();
        }
        setShowExitModal(false);
        setIsExited(true);
        
        setTimeout(() => {
            window.close();
        }, 1500);
    };

    const handleDeleteClick = (docId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpenId(null);
        setDeleteTargetId(docId);
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;
        try {
            const id = deleteTargetId;
            setDeleteTargetId(null);
            setDocuments(prev => prev.filter(d => d.id !== id));
            setFilteredDocs(prev => prev.filter(d => d.id !== id));
            await deleteDocument(id);
        } catch (err) {
            console.error("Delete failed", err);
            alert("Erreur: Impossible de supprimer le document.");
            loadData();
        }
    };

    const handleExportXLSX = () => {
        const exportData = documents.map(({ document_image, ...rest }) => rest);
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Courriers");
        XLSX.writeFile(wb, "Supersec_Export.xlsx");
    };

    const handleGeneratePDF = async (doc: DocumentData, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpenId(null);
        setGeneratingPdf(true);

        try {
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '-10000px'; 
            container.style.width = '210mm'; 
            container.style.minHeight = '297mm'; 
            container.style.backgroundColor = 'white'; 
            container.style.padding = '15mm';
            container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'; 
            container.style.zIndex = '9999';
            
            const isArabic = doc.langue_document === 'Arabe';
            if (isArabic) {
                container.style.direction = 'rtl';
                container.style.textAlign = 'right';
            } else {
                container.style.direction = 'ltr';
                container.style.textAlign = 'left';
            }

            document.body.appendChild(container);
            const safe = (str: string) => str || '-';

            container.innerHTML = `
                <style>
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0ABAB5; padding-bottom: 10px; margin-bottom: 25px; }
                    .title { color: #0ABAB5; margin: 0; font-size: 24px; font-weight: bold; }
                    .meta { color: #888; font-size: 10px; }
                    .section-title { color: #0ABAB5; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 2px; }
                    .row { display: flex; gap: 20px; margin-bottom: 10px; }
                    .col { flex: 1; }
                    .field-label { font-size: 9px; color: #888; font-weight: bold; text-transform: uppercase; display: block; margin-bottom: 2px; }
                    .field-value { font-size: 11px; color: #000; line-height: 1.4; word-wrap: break-word; }
                    .box-highlight { background: #f8fcfc; border: 1px solid #e0f2f1; padding: 12px; border-radius: 6px; margin: 15px 0; }
                    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; background: #eee; color: #555; }
                </style>
                <div class="header">
                    <h1 class="title">FICHE DOCUMENT</h1>
                    <span class="meta">Généré le ${new Date().toLocaleDateString()}</span>
                </div>
                <div class="row">
                    <div class="col"><span class="field-label">Objet</span><div class="field-value" style="font-size: 14px; font-weight: bold;">${safe(doc.objet)}</div></div>
                </div>
                <div class="row">
                    <div class="col"><span class="field-label">Type</span><div class="field-value">${safe(doc.type_objet)}</div></div>
                    <div class="col"><span class="field-label">Date Document</span><div class="field-value">${safe(doc.date_document)}</div></div>
                    <div class="col"><span class="field-label">Statut</span><div class="field-value"><span class="badge">${doc.statut}</span></div></div>
                </div>
                <div class="section-title">Informations Tiers</div>
                <div class="row">
                    <div class="col"><span class="field-label">Émetteur</span><div class="field-value">${safe(doc.emetteur)}</div></div>
                    <div class="col"><span class="field-label">Destinataire</span><div class="field-value">${safe(doc.destinataire)}</div></div>
                </div>
                <div class="row">
                    <div class="col"><span class="field-label">Référence</span><div class="field-value">${safe(doc.reference)}</div></div>
                    <div class="col"><span class="field-label">Contact / Infos</span><div class="field-value">${safe(doc.autres_infos)}</div></div>
                </div>
                <div class="section-title">Analyse & Contenu</div>
                <div class="box-highlight">
                    <span class="field-label" style="color:#0ABAB5">Résumé</span>
                    <div class="field-value">${safe(doc.resume)}</div>
                </div>
                ${doc.observation ? `<div class="row"><div class="col"><span class="field-label">Observation</span><div class="field-value">${safe(doc.observation)}</div></div></div>` : ''}
                <div class="section-title">Traitement</div>
                <div class="row">
                    <div class="col"><span class="field-label">Action Suggérée</span><div class="field-value">${safe(doc.suite_a_reserver)}</div></div>
                    <div class="col"><span class="field-label">Rappel prévu</span><div class="field-value">${safe(doc.date_heure_rappel?.replace('T', ' '))}</div></div>
                </div>
                ${doc.reponse ? `<div style="margin-top: 10px;"><span class="field-label">Réponse / Note</span><div class="field-value" style="white-space: pre-wrap; background: #fff; border: 1px solid #eee; padding: 10px; border-radius: 4px;">${safe(doc.reponse)}</div></div>` : ''}
            `;

            const canvasData = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
            const summaryPdf = new jsPDF('p', 'mm', 'a4');
            const pdfW = summaryPdf.internal.pageSize.getWidth();
            const pdfH = summaryPdf.internal.pageSize.getHeight();
            const imgData = canvasData.toDataURL('image/jpeg', 0.90);
            const props = summaryPdf.getImageProperties(imgData);
            const h = (props.height * pdfW) / props.width;
            summaryPdf.addImage(imgData, 'JPEG', 0, 0, pdfW, h);
            document.body.removeChild(container);

            if (doc.mimeType === 'application/pdf' && doc.document_image) {
                const summaryBytes = summaryPdf.output('arraybuffer');
                const importedPdfBytes = await fetch(doc.document_image).then(res => res.arrayBuffer());
                const mergedPdf = await PDFDocument.create();
                const summaryDoc = await PDFDocument.load(summaryBytes);
                const importedDoc = await PDFDocument.load(importedPdfBytes);
                const [summaryPage] = await mergedPdf.copyPages(summaryDoc, [0]);
                mergedPdf.addPage(summaryPage);
                const importedPages = await mergedPdf.copyPages(importedDoc, importedDoc.getPageIndices());
                importedPages.forEach((page) => mergedPdf.addPage(page));
                const pdfBytes = await mergedPdf.save();
                const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                const safeName = (doc.objet || 'Document').replace(/[^a-z0-9]/gi, '_').substring(0, 20);
                link.download = `Supersec_${safeName}.pdf`;
                link.click();
            } else if (doc.document_image && doc.mimeType.startsWith('image/')) {
                summaryPdf.addPage();
                summaryPdf.setFontSize(10);
                summaryPdf.setTextColor(150);
                summaryPdf.text("Pièce jointe : Scan original", 10, 10);
                const imgProps = summaryPdf.getImageProperties(doc.document_image);
                const margin = 10;
                const availableW = pdfW - (margin * 2);
                const availableH = pdfH - (margin * 2) - 10; 
                let w = availableW;
                let finalH = (imgProps.height * w) / imgProps.width;
                if (finalH > availableH) {
                    finalH = availableH;
                    w = (imgProps.width * finalH) / imgProps.height;
                }
                summaryPdf.addImage(doc.document_image, 'JPEG', margin, 20, w, finalH);
                const safeName = (doc.objet || 'Document').replace(/[^a-z0-9]/gi, '_').substring(0, 20);
                summaryPdf.save(`Supersec_${safeName}.pdf`);
            } else {
                const safeName = (doc.objet || 'Document').replace(/[^a-z0-9]/gi, '_').substring(0, 20);
                summaryPdf.save(`Supersec_${safeName}.pdf`);
            }

        } catch (err) {
            console.error("PDF Gen Error", err);
            alert("Erreur lors de la génération du PDF. " + err);
        } finally {
            setGeneratingPdf(false);
        }
    };

    const getStatusColor = (doc: DocumentData) => {
        if (doc.statut === DocStatus.TRAITE) return 'border-l-4 border-[#00C979]';
        if (doc.date_heure_rappel) {
            const deadline = new Date(doc.date_heure_rappel).getTime();
            const now = Date.now();
            if (deadline < now) return 'border-l-4 border-[#E03664]';
            if ((deadline - now) < 86400000) return 'border-l-4 border-[#FF6600]';
        }
        return 'border-l-4 border-gray-300 dark:border-gray-600';
    };

    if (isExited) {
        return (
            <div className="h-full bg-slate-900 flex flex-col items-center justify-center text-white p-8 text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-[#0ABAB5]/20 rounded-full flex items-center justify-center mb-6">
                    <ShieldCheck size={48} className="text-[#0ABAB5]" />
                </div>
                <h2 className="text-3xl font-black mb-4">SESSION TERMINÉE</h2>
                <p className="text-gray-400 mb-8 max-w-xs">Vos données sont sécurisées dans votre base locale. Vous pouvez fermer cet onglet.</p>
                <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce [animation-delay:-.3s]"></div>
                    <div className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce [animation-delay:-.5s]"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
            {generatingPdf && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex flex-col items-center justify-center text-white">
                    <Loader2 size={48} className="animate-spin mb-4" />
                    <p className="font-bold">Génération du PDF...</p>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 p-4 shadow-sm z-10 transition-colors duration-300">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Mes Courriers</h2>
                    <div className="flex items-center space-x-1">
                        <button onClick={handleExportXLSX} className="text-[#0ABAB5] p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full" title="Exporter Excel">
                            <Download size={22} />
                        </button>
                        <button 
                            onClick={() => setShowExitModal(true)} 
                            className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full" 
                            title="Quitter"
                        >
                            <LogOut size={22} />
                        </button>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            className="w-full bg-gray-100 dark:bg-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 ring-[#0ABAB5] text-gray-800 dark:text-white placeholder-gray-400"
                            placeholder="Rechercher..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button 
                        className={`p-2 rounded-lg ${filterStatus !== 'ALL' ? 'bg-[#0ABAB5] text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300'}`}
                        onClick={() => setFilterStatus(filterStatus === 'ALL' ? DocStatus.EN_COURS : filterStatus === DocStatus.EN_COURS ? DocStatus.TRAITE : "ALL")}
                    >
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
                {filteredDocs.length === 0 && (
                    <div className="text-center text-gray-400 mt-20">Aucun document trouvé.</div>
                )}
                
                {filteredDocs.map(doc => (
                    <div 
                        key={doc.id} 
                        onClick={() => onEdit(doc)}
                        className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm p-4 relative cursor-pointer active:scale-[0.98] transition-all duration-200 ${getStatusColor(doc)}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 pr-2">
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 line-clamp-1">{doc.objet}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{doc.emetteur} • {doc.date_document}</p>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === doc.id ? null : doc.id); }} 
                                className="text-gray-400 p-2 -mr-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"
                            >
                                <MoreVertical size={20} />
                            </button>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">{doc.resume}</p>
                        
                        <div className="flex items-center justify-between mt-2">
                             <div className="flex space-x-2">
                                <span className={`text-xs px-2 py-1 rounded-md ${doc.statut === DocStatus.TRAITE ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                    {doc.statut}
                                </span>
                                {doc.type_objet && (
                                    <span className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400">
                                        {doc.type_objet}
                                    </span>
                                )}
                             </div>
                             {doc.mimeType === 'application/pdf' ? (
                                <FileText size={16} className="text-gray-400" />
                             ) : (
                                <span className="text-xs text-[#0ABAB5] font-medium">
                                    {doc.langue_document}
                                </span>
                             )}
                        </div>

                        {menuOpenId === doc.id && (
                            <div className="absolute right-2 top-8 bg-white dark:bg-slate-800 shadow-xl border border-gray-100 dark:border-slate-700 rounded-lg z-30 flex flex-col w-52 py-2 animate-in fade-in zoom-in-95 duration-100">
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        onEdit(doc); 
                                        setMenuOpenId(null); 
                                    }} 
                                    className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 w-full text-left"
                                >
                                    <Edit size={18} className="mr-3 text-blue-500" /> 
                                    <span className="text-sm font-medium">Modifier</span>
                                </button>
                                
                                <button 
                                    onClick={(e) => handleGeneratePDF(doc, e)}
                                    className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 w-full text-left"
                                >
                                    <Printer size={18} className="mr-3 text-gray-500" /> 
                                    <span className="text-sm font-medium">Exporter PDF</span>
                                </button>
                                
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(doc.resume);
                                        setMenuOpenId(null);
                                        alert("Résumé copié !");
                                    }} 
                                    className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 w-full text-left"
                                >
                                    <Share2 size={18} className="mr-3 text-gray-500" /> 
                                    <span className="text-sm font-medium">Copier résumé</span>
                                </button>
                                
                                <div className="h-px bg-gray-100 dark:bg-slate-700 my-1"></div>
                                
                                <button 
                                    onClick={(e) => handleDeleteClick(doc.id, e)} 
                                    className="flex items-center px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 w-full text-left cursor-pointer"
                                >
                                    <Trash2 size={18} className="mr-3" /> 
                                    <span className="text-sm font-medium">Supprimer</span>
                                </button>
                                
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); }} 
                                    className="absolute -top-2 -right-2 bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-300 rounded-full p-1 shadow-md border hover:bg-gray-100 dark:hover:bg-slate-600"
                                >
                                    <X size={14}/>
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {showExitModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-transparent dark:border-slate-800">
                        <div className="bg-red-500 p-6 flex flex-col items-center text-white">
                            <AlertTriangle size={48} className="mb-2" />
                            <h3 className="text-xl font-bold uppercase tracking-tight">Quitter l'application ?</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
                                Voulez-vous sauvegarder une copie de vos données locales avant de fermer la session ?
                            </p>
                            
                            <button 
                                onClick={() => handleExit(true)}
                                className="w-full py-4 bg-[#0ABAB5] text-white font-bold rounded-2xl shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-transform"
                            >
                                <Save size={20} />
                                <span>Sauvegarder & Quitter</span>
                            </button>

                            <button 
                                onClick={() => handleExit(false)}
                                className="w-full py-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-2xl flex items-center justify-center space-x-2 active:scale-95 transition-transform"
                            >
                                <LogOut size={20} />
                                <span>Quitter sans sauvegarde</span>
                            </button>

                            <button 
                                onClick={() => setShowExitModal(false)}
                                className="w-full py-3 text-gray-400 dark:text-gray-500 font-bold text-sm"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteTargetId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-transparent dark:border-slate-800">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-2">
                                <Trash2 size={32} className="text-red-500 dark:text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Confirmer la suppression</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Ce document sera définitivement effacé de la base de données locale.
                            </p>
                            <div className="flex space-x-3 w-full mt-4">
                                <button 
                                    onClick={() => setDeleteTargetId(null)}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl active:scale-95 transition-transform"
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={confirmDelete}
                                    className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 active:scale-95 transition-transform"
                                >
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ShieldCheck = ({ size, className }: { size: number, className: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);