'use client';

import { useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';
import { MonthlyIncome } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import * as db from '@/lib/database';
import { formatCurrency } from '@/lib/utils';

export default function IncomePage() {
  const { user } = useAuth();
  const [incomes, setIncomes] = useState<MonthlyIncome[]>([]);

  useEffect(() => {
    if (!user) return;
    db.getMonthlyIncomes().then(setIncomes);
  }, [user]);

  const avgNet = incomes.length > 0 ? incomes.reduce((s, i) => s + i.netPay, 0) / incomes.length : 0;
  const avgGross = incomes.length > 0 ? incomes.reduce((s, i) => s + i.grossPay, 0) / incomes.length : 0;
  const totalTax = incomes.reduce((s, i) => s + i.tax, 0);

  const annualGross = avgGross * 12;
  const annualDeductions = annualGross > 0 ? 90000 + 38400 : 0;
  const annualTaxable = Math.max(0, annualGross - annualDeductions);
  let projectedTax = 0;
  if (annualTaxable > 800000) projectedTax = 102500 + 0.25 * (annualTaxable - 800000);
  else if (annualTaxable > 400000) projectedTax = 22500 + 0.20 * (annualTaxable - 400000);
  else if (annualTaxable > 250000) projectedTax = 0.15 * (annualTaxable - 250000);
  const taxBracket = annualTaxable > 800000 ? '800K-2M (25%)' : annualTaxable > 400000 ? '400K-800K (20%)' : annualTaxable > 250000 ? '250K-400K (15%)' : 'Below 250K (0%)';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Income Tracker</h1>
        <p className="text-sm text-slate-500">Your salary and deductions overview</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">Avg Net Pay</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(avgNet)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">Avg Gross Pay</p>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(avgGross)}</p>
        </div>
      </div>

      {avgGross > 0 && (
        <div className="bg-gradient-to-br from-blue-800 to-blue-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3"><Calculator size={18} /><h2 className="font-semibold">Tax Projection</h2></div>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-blue-200 text-xs">Est. Annual Taxable</p><p className="text-xl font-bold">{formatCurrency(annualTaxable)}</p></div>
            <div><p className="text-blue-200 text-xs">Projected Tax</p><p className="text-xl font-bold">{formatCurrency(projectedTax)}</p></div>
            <div><p className="text-blue-200 text-xs">Tax Bracket</p><p className="text-sm font-medium">{taxBracket}</p></div>
            <div><p className="text-blue-200 text-xs">YTD Tax Paid</p><p className="text-sm font-medium">{formatCurrency(totalTax)}</p></div>
          </div>
        </div>
      )}

      {incomes.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-100">
          <Calculator size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No income records yet</p>
          <p className="text-slate-400 text-sm mt-1">Income tracking coming soon — add your payslip data to project taxes</p>
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Monthly History</h2>
          <div className="space-y-3">
            {incomes.map((inc) => {
              const monthName = new Date(inc.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              const totalDeductions = inc.sss + inc.philhealth + inc.pagibig + inc.tax + inc.otherDeductions;
              return (
                <div key={inc.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900">{monthName}</h3>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(inc.netPay)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Basic Pay</span><span className="font-medium">{formatCurrency(inc.basicPay)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">SSS</span><span className="font-medium text-red-500">-{formatCurrency(inc.sss)}</span></div>
                    {inc.overtime > 0 && <div className="flex justify-between"><span className="text-slate-500">Overtime</span><span className="font-medium text-blue-600">{formatCurrency(inc.overtime)}</span></div>}
                    <div className="flex justify-between"><span className="text-slate-500">Tax</span><span className="font-medium text-red-500">-{formatCurrency(inc.tax)}</span></div>
                  </div>
                  <div className="flex justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
                    <div><span className="text-slate-500">Gross: </span><span className="font-semibold">{formatCurrency(inc.grossPay)}</span></div>
                    <div><span className="text-slate-500">Deductions: </span><span className="font-semibold text-red-500">-{formatCurrency(totalDeductions)}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
