import React, { useEffect, useState } from 'react';
import { Search, Download, MoreVertical, Edit, Trash2, Printer, X, Loader2, FileText, AlertTriangle, Clock, CheckCircle2, User, Hash, FileSignature } from 'lucide-react';
import { DocumentData, DocStatus } from '../types';
import { getAllDocuments, deleteDocument } from '../services/db';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import { PDFDocument } from 'pdf-lib';

interface DashboardProps {
    onEdit: (doc: DocumentData) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onEdit }) => {
    const [documents, setDocuments] = useState<DocumentData[]>([]);
    const [filteredDocs, setFilteredDocs] = useState<DocumentData[]>([]);
    const [search, setSearch] = useState("");
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        let res = documents;
        if (search) {
            const lower = search.toLowerCase();
            res = res.filter(d => 
                d.objet.toLowerCase().includes(lower) || d.emetteur.toLowerCase().includes(lower) ||
                d.resume.toLowerCase().includes(lower) || (d.type_objet || "").toLowerCase().includes(lower) ||
                (d.reference || "").toLowerCase().includes(lower)
            );
        }
        setFilteredDocs(res);
    }, [search, documents]);

    const loadData = async () => {
        const docs = await getAllDocuments();
        setDocuments(docs);
        setFilteredDocs(docs);
    };

    const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text || "");

    const renderTextToImage = async (text: string, widthMM: number, fontSizePT: number = 10.5, color: string = "#1a202c", align: 'left' | 'right' = 'left') => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return { dataUrl: '', heightMM: 0 };

        const SCALE = 4;
        const MM_TO_PX = 3.7795;
        const PT_TO_PX = 1.333;
        
        const canvasWidth = widthMM * MM_TO_PX * SCALE;
        const fontSizePX = fontSizePT * PT_TO_PX * SCALE;
        
        ctx.font = `${fontSizePX}px Arial, sans-serif`;
        
        const words = String(text).split(/\s+/);
        let lines = [];
        let currentLine = "";
        for (let word of words) {
            let testLine = currentLine ? currentLine + " " + word : word;
            if (ctx.measureText(testLine).width < canvasWidth) currentLine = testLine;
            else { lines.push(currentLine); currentLine = word; }
        }
        lines.push(currentLine);

        const lineHeightPX = fontSizePX * 1.5;
        canvas.width = canvasWidth;
        canvas.height = lines.length * lineHeightPX;

        ctx.font = `${fontSizePX}px Arial, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.textAlign = align;
        ctx.fillStyle = color;

        lines.forEach((line, i) => {
            const x = align === 'right' ? canvasWidth : 0;
            ctx.fillText(line, x, i * lineHeightPX);
        });

        return {
            dataUrl: canvas.toDataURL('image/png'),
            heightMM: canvas.height / (MM_TO_PX * SCALE)
        };
    };

    const handleGeneratePDF = async (docData: DocumentData, e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpenId(null);
        setGeneratingPdf(true);
        
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = 210;
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);
            let y = 35;

            const checkPageBreak = (h: number) => {
                if (y + h > 280) { pdf.addPage(); y = 20; return true; }
                return false;
            };

            // Page 1 Header
            pdf.setFillColor(10, 186, 181);
            pdf.rect(0, 0, pageWidth, 25, 'F');
            pdf.setTextColor(255); pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
            pdf.text("DOSSIER COURRIER EXPERT", margin, 16);
            pdf.setFontSize(8); pdf.text(`RÉF : ${docData.reference || 'SANS RÉF'}`, pageWidth - margin, 16, { align: 'right' });

            const addField = async (label: string, value: string, isFullWidth: boolean = false, isBold: boolean = false) => {
                const text = value || "N/A";
                const width = isFullWidth ? contentWidth : (contentWidth / 2) - 5;
                const x = isFullWidth || !label.includes('2') ? margin : (pageWidth / 2) + 5;
                
                pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(150);
                pdf.text(label.toUpperCase().replace(' 2', ''), x, y);
                y += 5;

                const ar = isArabic(text);
                const res = await renderTextToImage(text, width, isBold ? 11 : 10.5, "#333", ar ? 'right' : 'left');
                checkPageBreak(res.heightMM);
                pdf.addImage(res.dataUrl, 'PNG', x, y, width, res.heightMM);
                if (isFullWidth || label.includes('2')) y += res.heightMM + 8;
            };

            pdf.setFontSize(9); pdf.setTextColor(60);
            pdf.text(`Date : ${docData.date_document}`, margin, y);
            pdf.text(`Statut : ${docData.statut}`, (pageWidth/2)+5, y);
            y += 12;

            await addField("Émetteur", docData.emetteur, false, true);
            await addField("Destinataire 2", docData.destinataire, false, true);
            await addField("Objet", docData.objet, true, true);
            await addField("Résumé", docData.resume, true, false);
            await addField("Action à réserver", docData.suite_a_reserver, false, true);
            await addField("Échéance 2", docData.date_heure_rappel || "Aucune", false, true);
            await addField("Observations", docData.observation, true, false);

            // PAGE 2 : RÉPONSE IA - AFFICHAGE COMPLET
            if (docData.reponse) {
                pdf.addPage();
                y = 20;
                pdf.setFillColor(10, 186, 181);
                pdf.rect(0, 0, pageWidth, 25, 'F');
                pdf.setTextColor(255); pdf.setFontSize(14); pdf.setFont('helvetica', 'bold');
                pdf.text("RÉPONSE ÉTABLIE ET INSTRUCTIONS", margin, 16);
                y = 40;

                const internalPadding = 10;
                const res = await renderTextToImage(docData.reponse, contentWidth - (internalPadding * 2), 10.5, "#1a202c", isArabic(docData.reponse) ? 'right' : 'left');
                
                // Si la réponse est trop longue pour une seule page, on divise
                // Pour simplifier ici, on l'affiche dans un grand cadre gris clair
                const boxHeight = res.heightMM + 20;
                pdf.setFillColor(248, 250, 252);
                pdf.setDrawColor(226, 232, 240);
                pdf.rect(margin, y - 5, contentWidth, boxHeight, 'FD');
                
                pdf.addImage(res.dataUrl, 'PNG', margin + internalPadding, y + 5, contentWidth - (internalPadding * 2), res.heightMM);
                y += boxHeight + 10;
            }

            // Document Scan
            if (docData.document_image) {
                if (docData.mimeType === 'application/pdf') {
                    const mainPdf = await PDFDocument.load(new Uint8Array(pdf.output('arraybuffer')));
                    try {
                        const orig = await PDFDocument.load(Uint8Array.from(atob(docData.document_image.split(',')[1]), c => c.charCodeAt(0)));
                        (await mainPdf.copyPages(orig, orig.getPageIndices())).forEach(p => mainPdf.addPage(p));
                        const final = await mainPdf.save();
                        const blob = new Blob([final], { type: 'application/pdf' });
                        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Sécapp_Doc_${docData.id.slice(0,5)}.pdf`; link.click();
                    } catch { pdf.save(`Sécapp_Doc_${docData.id.slice(0,5)}.pdf`); }
                } else {
                    pdf.addPage();
                    const img = pdf.getImageProperties(docData.document_image);
                    const r = Math.min(190/img.width, 270/img.height);
                    pdf.addImage(docData.document_image, 'JPEG', 10, 10, img.width*r, img.height*r);
                    pdf.save(`Sécapp_Doc_${docData.id.slice(0,5)}.pdf`);
                }
            } else pdf.save(`Sécapp_Doc_${docData.id.slice(0,5)}.pdf`);
        } catch (err) { alert("Erreur PDF."); } finally { setGeneratingPdf(false); }
    };

    return (
        <div className="h-full bg-gray-50 dark:bg-slate-950 flex flex-col">
            {generatingPdf && <div className="fixed inset-0 bg-black/70 z-[100] flex flex-col items-center justify-center text-white font-black"><Loader2 size={50} className="animate-spin mb-4 text-teal"/>GÉNÉRATION PDF...</div>}
            <div className="bg-white dark:bg-slate-900 p-4 border-b">
                <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold dark:text-white uppercase tracking-tighter">Flux Courriers</h2><button onClick={loadData} className="text-teal p-2"><Download size={24}/></button></div>
                <div className="relative"><input className="w-full bg-gray-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm dark:text-white outline-none" placeholder="Recherche..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
                {filteredDocs.map(doc => (
                    <div key={doc.id} onClick={() => onEdit(doc)} className={`bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border-l-[6px] ${doc.statut === DocStatus.CLOTURE ? 'border-green-500' : 'border-teal'} relative active:scale-[0.98] transition-all`}>
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold dark:text-gray-100 text-[15px] uppercase leading-tight pr-8">{doc.objet}</h3>
                            <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === doc.id ? null : doc.id); }} className="text-gray-400 p-1 -mr-2"><MoreVertical size={20}/></button>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                            <div className="flex items-center text-[12px] text-gray-600 dark:text-gray-400">
                                <User size={14} className="text-teal mr-2" />
                                <span className="font-medium truncate">De: <span className="text-gray-900 dark:text-gray-200">{doc.emetteur || 'Inconnu'}</span></span>
                            </div>
                            {doc.reference && (
                                <div className="flex items-center text-[12px] text-gray-500 dark:text-gray-500">
                                    <Hash size={14} className="text-teal/60 mr-2" />
                                    <span>Réf: {doc.reference}</span>
                                </div>
                            )}
                            {doc.type_objet && (
                                <div className="flex items-center text-[11px] text-gray-500 dark:text-gray-500">
                                    <FileSignature size={13} className="text-teal/40 mr-2" />
                                    <span className="uppercase tracking-wider">{doc.type_objet}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-gray-50 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest">
                            <span className={doc.statut === DocStatus.CLOTURE ? 'text-green-500' : 'text-teal'}>{doc.statut}</span>
                            <div className="flex items-center text-gray-400">
                                <Clock size={12} className="mr-1" />
                                <span>{doc.date_document}</span>
                            </div>
                        </div>

                        {menuOpenId === doc.id && (
                            <div className="absolute right-4 top-12 bg-white dark:bg-slate-800 shadow-2xl border dark:border-slate-700 rounded-2xl z-30 py-2 w-48 overflow-hidden animate-in fade-in zoom-in duration-200">
                                <button onClick={() => onEdit(doc)} className="w-full px-4 py-3 text-left text-sm dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center space-x-2"><Edit size={16} className="text-teal" /><span>Modifier</span></button>
                                <button onClick={(e) => handleGeneratePDF(doc, e)} className="w-full px-4 py-3 text-left text-sm dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700 font-bold flex items-center space-x-2"><Printer size={16} className="text-teal" /><span>Exporter PDF</span></button>
                                <button onClick={(e) => { e.stopPropagation(); deleteDocument(doc.id).then(loadData); }} className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"><Trash2 size={16} /><span>Supprimer</span></button>
                            </div>
                        )}
                    </div>
                ))}
                {filteredDocs.length === 0 && (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-sm">
                        <FileText size={48} className="mb-2 opacity-20" />
                        <p>Aucun courrier trouvé</p>
                    </div>
                )}
            </div>
        </div>
    );
};