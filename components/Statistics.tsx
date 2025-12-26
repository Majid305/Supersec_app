import React, { useEffect, useState, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { getAllDocuments } from '../services/db';
import { DocumentData, DocStatus, DocType } from '../types';
import { Loader2, Zap, Award, FileCheck, ShieldAlert, Check, TrendingUp, BookOpen, Layers } from 'lucide-react';
import { generateReportSynthesis } from '../services/geminiService';
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';

export const Statistics = () => {
    const [stats, setStats] = useState<{
        statusData: any[],
        typeData: any[],
        total: number,
        allDocs: DocumentData[]
    }>({ statusData: [], typeData: [], total: 0, allDocs: [] });

    const [isGenerating, setIsGenerating] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportConfig, setReportConfig] = useState({ startDate: '', endDate: '', type: 'ALL' });

    const chartRef1 = useRef<HTMLDivElement>(null);
    const chartRef2 = useRef<HTMLDivElement>(null);

    useEffect(() => { calculateStats(); }, []);

    const calculateStats = async () => {
        try {
            const docs = await getAllDocuments();
            const traites = docs.filter(d => d.statut === DocStatus.TRAITE).length;
            const statusData = [
                { name: 'Traités', value: traites, color: '#00C979' },
                { name: 'En cours', value: docs.length - traites, color: '#FF6600' }
            ];
            const typeMap: Record<string, number> = {};
            docs.forEach(d => { typeMap[d.type_objet || "Autre"] = (typeMap[d.type_objet || "Autre"] || 0) + 1; });
            const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
            setStats({ statusData, typeData, total: docs.length, allDocs: docs });
        } catch (e) { console.error(e); }
    };

    const handleGenerateReport = async () => {
        let filtered = stats.allDocs.filter(d => d.statut === DocStatus.TRAITE);
        if (reportConfig.startDate) filtered = filtered.filter(d => d.date_document >= reportConfig.startDate);
        if (reportConfig.endDate) filtered = filtered.filter(d => d.date_document <= reportConfig.endDate);
        if (reportConfig.type !== 'ALL') filtered = filtered.filter(d => d.type_objet === reportConfig.type);

        if (filtered.length === 0) { alert("Aucune donnée disponible (seuls les documents 'Traités' sont analysés)."); return; }

        setIsGenerating(true);
        setShowReportModal(false);

        try {
            const periodStr = `${reportConfig.startDate || 'l\'origine'} au ${reportConfig.endDate || 'ce jour'}`;
            // Fixed: Removed apiKey argument
            const synthesis = await generateReportSynthesis(filtered, periodStr, reportConfig.type);

            const capture = async (ref: React.RefObject<HTMLDivElement>) => {
                if (!ref.current) return null;
                const canvas = await html2canvas(ref.current, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
                return canvas.toDataURL('image/jpeg', 0.95);
            };

            const imgStatus = await capture(chartRef1);
            const imgTypes = await capture(chartRef2);

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);

            const addDecorations = (pageNum: number) => {
                pdf.setFillColor(10, 186, 181);
                pdf.rect(0, 0, pageWidth, 5, 'F');
                pdf.setFontSize(8);
                pdf.setTextColor(150);
                pdf.text(`Supersec_app Audit - Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            };

            // COUVERTURE
            pdf.setFillColor(10, 186, 181);
            pdf.rect(0, 0, pageWidth, pageHeight / 2.5, 'F');
            pdf.setTextColor(255);
            pdf.setFontSize(30);
            pdf.setFont('helvetica', 'bold');
            pdf.text("RAPPORT D'EXPERTISE", margin, 50);
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'normal');
            pdf.text("Audit Algorithmique & Flux Administratifs", margin, 62);
            pdf.setTextColor(60);
            pdf.setFontSize(10);
            pdf.text(`Période : ${periodStr}`, margin, pageHeight / 2.5 + 40);
            pdf.text(`Documents audités : ${filtered.length}`, margin, pageHeight / 2.5 + 47);
            pdf.text(`Type : ${reportConfig.type}`, margin, pageHeight / 2.5 + 54);
            addDecorations(1);

            // CONTENU
            pdf.addPage();
            let pNum = 2;
            addDecorations(pNum);
            pdf.setTextColor(10, 186, 181);
            pdf.setFontSize(18);
            pdf.text("ANALYSE DÉTAILLÉE", margin, 25);
            pdf.line(margin, 28, margin + 80, 28);
            pdf.setTextColor(70);
            pdf.setFontSize(11);
            
            const lines = pdf.splitTextToSize(synthesis, contentWidth);
            let y = 40;
            lines.forEach((line: string) => {
                const isTitle = /^\d\.\s/.test(line.trim());
                if (y > pageHeight - 25) {
                    pdf.addPage();
                    pNum++;
                    y = 25;
                    addDecorations(pNum);
                }
                if (isTitle) {
                    y += 5;
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(10, 186, 181);
                    pdf.text(line, margin, y);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor(70);
                    y += 8;
                } else {
                    pdf.text(line, margin, y);
                    y += 7;
                }
            });

            pdf.addPage();
            pNum++;
            addDecorations(pNum);
            pdf.setTextColor(10, 186, 181);
            pdf.setFontSize(16);
            pdf.text("VISUALISATION DES FLUX", margin, 25);
            if (imgStatus) pdf.addImage(imgStatus, 'JPEG', margin, 40, contentWidth, 70);
            if (imgTypes) pdf.addImage(imgTypes, 'JPEG', margin, 120, contentWidth, 75);

            pdf.save(`Expertise_Supersec_${new Date().toISOString().slice(0, 10)}.pdf`);
            alert("Rapport d'expertise généré avec succès !");
        } catch (err) {
            alert("Erreur lors de la génération. Vérifiez votre connexion.");
            console.error(err);
        } finally { setIsGenerating(false); }
    };

    return (
        <div className="h-full bg-gray-50 dark:bg-slate-950 overflow-y-auto p-4 pb-24 transition-colors duration-300">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Statistiques</h2>
                    <p className="text-xs text-gray-400">Monitoring & Expertise IA</p>
                </div>
                <button 
                    onClick={() => setShowReportModal(true)}
                    className="flex items-center space-x-2 bg-gradient-to-br from-[#0ABAB5] to-[#00C979] text-white px-5 py-3 rounded-2xl shadow-xl active:scale-95 transition-transform"
                >
                    <Award size={20} />
                    <span className="text-sm font-bold uppercase">Rapport Expert</span>
                </button>
            </div>
            
            {isGenerating && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center text-white p-8 text-center">
                    <Loader2 size={80} className="animate-spin text-[#0ABAB5] mb-8" />
                    <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter">Audit IA Multi-pages</h3>
                    <div className="space-y-4 max-w-xs">
                        <div className="flex items-center space-x-3 text-white/70 text-sm">
                            <Zap size={18} className="text-yellow-400" />
                            <span>Intelligence Gemini 3 Pro active</span>
                        </div>
                        <div className="flex items-center space-x-3 text-white/70 text-sm">
                            <FileCheck size={18} className="text-blue-400" />
                            <span>Mise en page institutionnelle</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-transparent dark:border-slate-800">
                        <span className="text-3xl font-black text-[#0ABAB5]">{stats.total}</span>
                        <p className="text-gray-400 uppercase text-[9px] font-black mt-2 tracking-widest">Base Archive</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-transparent dark:border-slate-800">
                        <span className="text-3xl font-black text-[#00C979]">{stats.statusData.find(d => d.name === 'Traités')?.value || 0}</span>
                        <p className="text-gray-400 uppercase text-[9px] font-black mt-2 tracking-widest">Flux Clôturés</p>
                    </div>
                </div>

                <div ref={chartRef1} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-transparent dark:border-slate-800">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase mb-8 tracking-[0.2em]">Efficiency Status</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                                    {stats.statusData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                                </Pie>
                                <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff'}} />
                                <Legend iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div ref={chartRef2} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-transparent dark:border-slate-800">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase mb-8 tracking-[0.2em]">Typology Analysis</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.typeData} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} fontSize={10} tick={{fill: '#9ca3af'}} />
                                <Tooltip cursor={{fill: 'rgba(10,186,181,0.05)'}} contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '16px'}} />
                                <Bar dataKey="value" fill="#0ABAB5" radius={[0, 10, 10, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {showReportModal && (
                <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-br from-[#0ABAB5] to-[#00C979] p-8 text-white">
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Paramètres Audit</h3>
                            <p className="text-white/80 text-xs">Expertise multi-pages des documents traités</p>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Du</label>
                                    <input type="date" className="w-full bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl text-xs outline-none dark:text-white" value={reportConfig.startDate} onChange={(e) => setReportConfig({...reportConfig, startDate: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Au</label>
                                    <input type="date" className="w-full bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl text-xs outline-none dark:text-white" value={reportConfig.endDate} onChange={(e) => setReportConfig({...reportConfig, endDate: e.target.value})} />
                                </div>
                            </div>
                            <select className="w-full bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl text-xs outline-none dark:text-white" value={reportConfig.type} onChange={(e) => setReportConfig({...reportConfig, type: e.target.value})}>
                                <option value="ALL">Expertise Flux Intégral</option>
                                {Object.values(DocType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <button onClick={handleGenerateReport} className="w-full bg-gradient-to-r from-[#0ABAB5] to-[#00C979] text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center space-x-2">
                                <Check size={20} />
                                <span>GÉNÉRER L'EXPERTISE</span>
                            </button>
                            <button onClick={() => setShowReportModal(false)} className="w-full text-gray-400 text-xs font-bold py-2">Annuler</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};