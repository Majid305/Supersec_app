import React, { useEffect, useState } from 'react';
import { Search, Filter, Download, MoreVertical, Edit, Trash2, Printer, X, Loader2, FileText, AlertTriangle } from 'lucide-react';
import { DocumentData, DocStatus } from '../types';
import { getAllDocuments, deleteDocument } from '../services/db';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";

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
        try {
            const docs = await getAllDocuments();
            setDocuments(docs);
            setFilteredDocs(docs);
        } catch (err) {
            console.error("Failed to load documents", err);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;
        try {
            await deleteDocument(deleteTargetId);
            setDocuments(prev => prev.filter(d => d.id !== deleteTargetId));
            setDeleteTargetId(null);
        } catch (err) {
            console.error("Delete failed", err);
            alert("Erreur lors de la suppression.");
            setDeleteTargetId(null);
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
        e.stopPropagation();
        setMenuOpenId(null);
        setGeneratingPdf(true);
        try {
            const pdf = new jsPDF();
            pdf.setFontSize(20);
            pdf.text("FICHE COURRIER", 20, 20);
            pdf.setFontSize(12);
            pdf.text(`Objet: ${doc.objet}`, 20, 40);
            pdf.text(`Emetteur: ${doc.emetteur}`, 20, 50);
            pdf.text(`Destinataire: ${doc.destinataire}`, 20, 60);
            pdf.text(`Date: ${doc.date_document}`, 20, 70);
            pdf.text(`Statut: ${doc.statut}`, 20, 80);
            pdf.text("Résumé:", 20, 100);
            const lines = pdf.splitTextToSize(doc.resume || "", 170);
            pdf.text(lines, 20, 110);
            pdf.save(`Courrier_${doc.id.substring(0,8)}.pdf`);
        } catch (e) {
            alert("Erreur PDF");
        } finally {
            setGeneratingPdf(false);
        }
    };

    return (
        <div className="h-full bg-gray-50 dark:bg-slate-950 flex flex-col">
            <div className="bg-white dark:bg-slate-900 p-4 border-b border-gray-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Courriers</h2>
                    <button onClick={handleExportXLSX} className="text-[#0ABAB5] p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
                        <Download size={22} />
                    </button>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                        className="w-full bg-gray-100 dark:bg-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm outline-none text-gray-800 dark:text-white"
                        placeholder="Rechercher un courrier..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
                {filteredDocs.map(doc => (
                    <div 
                        key={doc.id} 
                        onClick={() => onEdit(doc)}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border-l-4 border-[#0ABAB5] relative"
                    >
                        <div className="flex justify-between">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 line-clamp-1">{doc.objet}</h3>
                                <p className="text-xs text-[#0ABAB5] font-bold mt-1 uppercase">{doc.type_objet}</p>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === doc.id ? null : doc.id); }}
                                className="p-1 text-gray-400"
                            >
                                <MoreVertical size={18} />
                            </button>
                        </div>
                        <div className="mt-2 flex justify-between items-end">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${doc.statut === DocStatus.TRAITE ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                {doc.statut}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold">{doc.date_document}</span>
                        </div>

                        {menuOpenId === doc.id && (
                            <div className="absolute right-4 top-10 bg-white dark:bg-slate-800 shadow-xl border dark:border-slate-700 rounded-xl z-30 py-2 w-40">
                                <button onClick={() => { onEdit(doc); setMenuOpenId(null); }} className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700">
                                    <Edit size={14} className="mr-2 text-[#0ABAB5]" /> Modifier
                                </button>
                                <button onClick={(e) => handleGeneratePDF(doc, e)} className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700">
                                    <Printer size={14} className="mr-2 text-gray-500" /> Imprimer PDF
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setDeleteTargetId(doc.id); setMenuOpenId(null); }} className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <Trash2 size={14} className="mr-2" /> Supprimer
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {deleteTargetId && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 w-full max-w-xs text-center shadow-2xl">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-gray-800 dark:text-white uppercase mb-2">Supprimer ?</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Cette action est définitive et supprimera le fichier de la base locale.</p>
                        <div className="flex flex-col space-y-3">
                            <button onClick={confirmDelete} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-transform">SUPPRIMER</button>
                            <button onClick={() => setDeleteTargetId(null)} className="w-full text-gray-400 font-bold py-2">ANNULER</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};