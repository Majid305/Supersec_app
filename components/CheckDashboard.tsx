import React, { useEffect, useState } from 'react';
import { Search, Download, MoreVertical, Edit, Trash2, Printer, X, Loader2, FileText, AlertTriangle, Clock, CheckCircle2, User, Hash, CreditCard, Landmark } from 'lucide-react';
import { RejectedCheck, CheckRejectionClass, CheckSituation } from '../types';
import { getAllChecks, deleteCheck } from '../services/db';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import { PDFDocument } from 'pdf-lib';

export const CheckDashboard = ({ onEdit }: { onEdit: (check: RejectedCheck) => void }) => {
    const [checks, setChecks] = useState<RejectedCheck[]>([]);
    const [filtered, setFiltered] = useState<RejectedCheck[]>([]);
    const [search, setSearch] = useState("");
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    useEffect(() => { load(); }, []);

    useEffect(() => {
        const lower = search.toLowerCase();
        setFiltered(checks.filter(c => 
            c.banque.toLowerCase().includes(lower) || 
            c.numero_cheque.includes(search) || 
            (c.nom_proprietaire || "").toLowerCase().includes(lower) ||
            (c.motif_rejet || "").toLowerCase().includes(lower)
        ));
    }, [search, checks]);

    const load = async () => { setChecks(await getAllChecks()); };

    const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text || "");

    const renderTextToImage = async (text: string, widthMM: number, fontSizePT: number = 10.5, color: string = "#1a202c", align: 'left' | 'right' = 'left') => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return { dataUrl: '', heightMM: 0 };
        const SCALE = 4; const MM_TO_PX = 3.7795; const PT_TO_PX = 1.333;
        const canvasWidth = widthMM * MM_TO_PX * SCALE;
        const fontSizePX = fontSizePT * PT_TO_PX * SCALE;
        ctx.font = `${fontSizePX}px Arial, sans-serif`;
        const words = String(text).split(/\s+/);
        let lines = []; let currentLine = "";
        for (let word of words) {
            let testLine = currentLine ? currentLine + " " + word : word;
            if (ctx.measureText(testLine).width < canvasWidth) currentLine = testLine;
            else { lines.push(currentLine); currentLine = word; }
        }
        lines.push(currentLine);
        const lineHeightPX = fontSizePX * 1.5;
        canvas.width = canvasWidth; canvas.height = lines.length * lineHeightPX;
        ctx.font = `${fontSizePX}px Arial, sans-serif`; ctx.textBaseline = 'top'; ctx.textAlign = align; ctx.fillStyle = color;
        lines.forEach((line, i) => { const x = align === 'right' ? canvasWidth : 0; ctx.fillText(line, x, i * lineHeightPX); });
        return { dataUrl: canvas.toDataURL('image/png'), heightMM: canvas.height / (MM_TO_PX * SCALE) };
    };

    const handleDownloadPDF = async (check: RejectedCheck, e: React.MouseEvent) => {
        e.stopPropagation(); setMenuOpenId(null); setGeneratingPdf(true);
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = 210; const margin = 20; const contentWidth = pageWidth - (margin * 2);
            let y = 35;

            // Header
            pdf.setFillColor(132, 204, 22); pdf.rect(0, 0, pageWidth, 25, 'F');
            pdf.setTextColor(255); pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
            pdf.text("EXPERTISE CHÈQUE REJETÉ", margin, 16);

            const addField = async (label: string, value: string, isFullWidth: boolean = false) => {
                const text = String(value || "Non renseigné");
                const width = isFullWidth ? contentWidth : (contentWidth / 2) - 5;
                const x = isFullWidth || !label.includes('2') ? margin : (pageWidth / 2) + 5;
                pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(150);
                pdf.text(label.toUpperCase().replace(' 2', ''), x, y);
                y += 5;
                const res = await renderTextToImage(text, width, 10.5, "#333", isArabic(text) ? 'right' : 'left');
                pdf.addImage(res.dataUrl, 'PNG', x, y, width, res.heightMM);
                if (isFullWidth || label.includes('2')) y += res.heightMM + 8;
            };

            // Audit Info
            pdf.setFontSize(10); pdf.setTextColor(60);
            pdf.text(`Période : ${check.mois_rejet}`, margin, y);
            pdf.text(`Audit du : ${check.date_systeme}`, (pageWidth/2)+5, y);
            y += 12;

            await addField("Banque", check.banque);
            await addField("N° Chèque 2", check.numero_cheque);
            await addField("Montant", `${check.montant.toLocaleString()} DH`, false);
            await addField("Ville 2", check.ville);
            await addField("RIB", check.rib, true);
            await addField("Propriétaire (Tireur)", check.nom_proprietaire, true);
            await addField("Bénéficiaire", check.nom_beneficiaire, true);
            await addField("Motif de rejet", check.motif_rejet, true);
            await addField("Situation Actuelle", check.situation_actuelle);
            await addField("Classe de rejet 2", check.classe_rejet);
            await addField("Agence Bancaire", check.agence);
            await addField("Encaisseur 2", check.encaisseur || "Non spécifié");
            await addField("Rappel de suivi", check.date_heure_rappel || "Aucun", true);
            await addField("Observations", check.observation, true);

            if (check.document_image) {
                if (check.mimeType === 'application/pdf') {
                    const main = await PDFDocument.load(new Uint8Array(pdf.output('arraybuffer')));
                    try {
                        const orig = await PDFDocument.load(Uint8Array.from(atob(check.document_image.split(',')[1]), c => c.charCodeAt(0)));
                        (await main.copyPages(orig, orig.getPageIndices())).forEach(p => main.addPage(p));
                        const final = await main.save();
                        const blob = new Blob([final], { type: 'application/pdf' });
                        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Audit_Cheque_${check.numero_cheque}.pdf`; link.click();
                    } catch { pdf.save(`Audit_Cheque_${check.numero_cheque}.pdf`); }
                } else {
                    pdf.addPage();
                    pdf.setFillColor(132, 204, 22); pdf.rect(0, 0, pageWidth, 25, 'F');
                    pdf.setTextColor(255); pdf.setFontSize(14); pdf.text("SCANNER DU CHÈQUE REJETÉ", margin, 16);
                    const img = pdf.getImageProperties(check.document_image);
                    const r = Math.min(190/img.width, 240/img.height);
                    pdf.addImage(check.document_image, 'JPEG', 10, 40, img.width*r, img.height*r);
                    pdf.save(`Audit_Cheque_${check.numero_cheque}.pdf`);
                }
            } else pdf.save(`Audit_Cheque_${check.numero_cheque}.pdf`);
        } catch (err) { alert("Erreur PDF."); } finally { setGeneratingPdf(false); }
    };

    return (
        <div className="h-full bg-lavande dark:bg-lavande-deep flex flex-col">
            {generatingPdf && <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center text-white font-bold">GÉNÉRATION PDF...</div>}
            <div className="bg-white dark:bg-slate-900 p-4 border-b shadow-sm">
                <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold dark:text-white uppercase tracking-tighter">Flux Chèques</h2><button onClick={load} className="text-citron p-2"><Download size={24}/></button></div>
                <div className="relative"><input className="w-full bg-gray-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm dark:text-white outline-none" placeholder="Chercher banque, chèque, tireur..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
                {filtered.map(c => (
                    <div key={c.id} onClick={() => onEdit(c)} className={`bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border-l-[6px] ${c.situation_actuelle === CheckSituation.REGULARISE ? 'border-green-500' : 'border-citron'} relative active:scale-[0.98] transition-all`}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center">
                                <Landmark size={16} className="text-citron mr-2" />
                                <h3 className="font-black dark:text-gray-100 text-[13px] uppercase tracking-tight truncate max-w-[180px]">{c.banque}</h3>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id); }} className="text-gray-400 p-1 -mr-2"><MoreVertical size={20}/></button>
                        </div>
                        
                        <div className="space-y-1.5 mb-4">
                            <div className="flex items-center text-[12px] text-gray-700 dark:text-gray-300">
                                <User size={14} className="text-citron mr-2" />
                                <span className="font-bold truncate">{c.nom_proprietaire || 'Propriétaire inconnu'}</span>
                            </div>
                            <div className="flex items-center text-[11px] text-gray-500 dark:text-gray-400">
                                <Hash size={14} className="text-citron/60 mr-2" />
                                <span>Chèque N°: <span className="font-mono">{c.numero_cheque}</span></span>
                            </div>
                            <div className="flex items-center text-[11px] text-red-500/80 dark:text-red-400/80">
                                <AlertTriangle size={13} className="mr-2" />
                                <span className="truncate">{c.motif_rejet || 'Motif non précisé'}</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-end pt-3 border-t border-gray-50 dark:border-slate-800">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Montant Rejeté</span>
                                <span className="text-citron font-black text-lg leading-none">{Number(c.montant).toLocaleString()} <small className="text-[10px] opacity-70">DH</small></span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={`text-[10px] font-black uppercase mb-1 px-2 py-0.5 rounded-full ${c.situation_actuelle === CheckSituation.REGULARISE ? 'bg-green-100 text-green-600' : 'bg-citron/10 text-citron'}`}>
                                    {c.situation_actuelle}
                                </span>
                                <span className="text-[10px] text-gray-400 font-bold">{c.date_rejet}</span>
                            </div>
                        </div>

                        {menuOpenId === c.id && (
                            <div className="absolute right-4 top-12 bg-white dark:bg-slate-800 shadow-2xl border dark:border-slate-700 rounded-2xl z-30 py-2 w-48 overflow-hidden animate-in fade-in zoom-in duration-200">
                                <button onClick={() => onEdit(c)} className="w-full px-4 py-3 text-left text-sm dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center space-x-2"><Edit size={16} className="text-citron" /><span>Modifier Audit</span></button>
                                <button onClick={(e) => handleDownloadPDF(c, e)} className="w-full px-4 py-3 text-left text-sm dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700 font-bold flex items-center space-x-2"><Printer size={16} className="text-citron" /><span>Exporter PDF</span></button>
                                <button onClick={(e) => { e.stopPropagation(); deleteCheck(c.id).then(load); }} className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"><Trash2 size={16} /><span>Supprimer</span></button>
                            </div>
                        )}
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-sm">
                        <CreditCard size={48} className="mb-2 opacity-20" />
                        <p>Aucun chèque en archive</p>
                    </div>
                )}
            </div>
        </div>
    );
};