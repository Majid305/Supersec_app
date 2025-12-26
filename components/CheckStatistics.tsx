
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { getAllChecks } from '../services/db';
import { RejectedCheck, CheckRejectionClass } from '../types';

export const CheckStatistics = () => {
    const [stats, setStats] = useState({ total: 0, amount: 0, classData: [] as any[] });

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        const data = await getAllChecks();
        const totalAmount = data.reduce((acc, c) => acc + (Number(c.montant) || 0), 0);
        const fond = data.filter(c => c.classe_rejet === CheckRejectionClass.FOND).length;
        const classData = [
            { name: 'Fond', value: fond, color: '#ef4444' }, // Rouge pour critique
            { name: 'Forme', value: data.length - fond, color: '#84cc16' } // Citron vert pour administratif
        ];
        setStats({ total: data.length, amount: totalAmount, classData });
    };

    return (
        <div className="h-full bg-gray-50 dark:bg-slate-950 p-6 overflow-y-auto pb-24">
            <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-6 uppercase tracking-tighter">Monitoring Chèques</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-transparent dark:border-slate-800">
                    <span className="text-3xl font-black text-citron">{stats.total}</span>
                    <p className="text-[10px] font-black text-gray-400 uppercase mt-2 tracking-widest">Rejets</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-transparent dark:border-slate-800">
                    <span className="text-xl font-black text-citron">{stats.amount.toLocaleString()} DH</span>
                    <p className="text-[10px] font-black text-gray-400 uppercase mt-2 tracking-widest">Risque Total</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[3rem] shadow-sm mb-6 border border-transparent dark:border-slate-800">
                <h3 className="text-[10px] font-black text-gray-400 uppercase mb-8 tracking-widest text-center">Répartition par Classe</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={stats.classData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                                {stats.classData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#0f172a', color: '#fff' }} />
                            <Legend iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
