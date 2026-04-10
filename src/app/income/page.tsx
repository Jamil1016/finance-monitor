'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Calculator } from 'lucide-react';
import { MonthlyIncome } from '@/lib/types';
import { getItems, saveItems, KEYS } from '@/lib/storage';
import { formatCurrency, generateId } from '@/lib/utils';

const SAMPLE_INCOME: MonthlyIncome[] = [
  { id: '1', month: '2026-01', basicPay: 50000, allowances: 6000, overtime: 6695.41, deMinimis: 0, holidayPay: 689.66, nsd: 114.94, grossPay: 63500, sss: 1750, philhealth: 1250, pagibig: 200, tax: 7342.64, otherDeductions: 2286.34, netPay: 50671.03 },
  { id: '2', month: '2026-02', basicPay: 50000, allowances: 6000, overtime: 8017.24, deMinimis: 0, holidayPay: 0, nsd: 804.60, grossPay: 64821.84, sss: 1750, philhealth: 1250, pagibig: 200, tax: 7690.35, otherDeductions: 2286.34, netPay: 51645.16 },
  { id: '3', month: '2026-03', basicPay: 51750, allowances: 6000, overtime: 15108.62, deMinimis: 5000, holidayPay: 2379.31, nsd: 1427.58, grossPay: 81665.52, sss: 1750, philhealth: 1293.75, pagibig: 200, tax: 13592.93, otherDeductions: 2286.34, netPay: 65542.52 },
];

export default function IncomePage() {
  const [incomes, setIncomes] = useState<MonthlyIncome[]>([]);

  useEffect(() => {
    let saved = getItems<MonthlyIncome>(KEYS.INCOME);
    if (saved.length === 0) {
      saved = SAMPLE_INCOME;
      saveItems(KEYS.INCOME, saved);
    }
    setIncomes(saved.sort((a, b) => b.month.localeCompare(a.month)));
  }, []);

  const avgNet = incomes.length > 0 ? incomes.reduce((s, i) => s + i.netPay, 0) / incomes.length : 0;
  const avgGross = incomes.length > 0 ? incomes.reduce((s, i) => s + i.grossPay, 0) / incomes.length : 0;
  const totalTax = incomes.reduce((s, i) => s + i.tax, 0);

  // Tax projection for 2026
  const annualTaxable = 656539;
  const projectedTax = 22500 + 0.20 * (annualTaxable - 400000);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Income Tracker</h1>
        <p className="text-sm text-slate-500">Your salary and deductions overview</p>
      </div>

      {/* Summary Cards */}
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

      {/* Tax Projection */}
      <div className="bg-gradient-to-br from-blue-800 to-blue-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Calculator size={18} />
          <h2 className="font-semibold">2026 Tax Projection</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-blue-200 text-xs">Est. Annual Taxable</p>
            <p className="text-xl font-bold">{formatCurrency(annualTaxable)}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">Projected Tax</p>
            <p className="text-xl font-bold">{formatCurrency(projectedTax)}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">Tax Bracket</p>
            <p className="text-sm font-medium">400K-800K (20%)</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">YTD Tax Paid</p>
            <p className="text-sm font-medium">{formatCurrency(totalTax)}</p>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Monthly History</h2>
        <div className="space-y-3">
          {incomes.map((inc) => {
            const monthName = new Date(inc.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const totalDeductions = inc.sss + inc.philhealth + inc.pagibig + inc.tax + inc.otherDeductions;

            return (
              <div key={inc.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900">{monthName}</h3>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(inc.netPay)}</span>
                  </div>

                  {/* Income breakdown */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Basic Pay</span>
                      <span className="font-medium">{formatCurrency(inc.basicPay)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">SSS</span>
                      <span className="font-medium text-red-500">-{formatCurrency(inc.sss)}</span>
                    </div>
                    {inc.allowances > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Allowances</span>
                        <span className="font-medium">{formatCurrency(inc.allowances)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">PhilHealth</span>
                      <span className="font-medium text-red-500">-{formatCurrency(inc.philhealth)}</span>
                    </div>
                    {inc.overtime > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Overtime</span>
                        <span className="font-medium text-blue-600">{formatCurrency(inc.overtime)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pag-IBIG</span>
                      <span className="font-medium text-red-500">-{formatCurrency(inc.pagibig)}</span>
                    </div>
                    {inc.holidayPay > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Holiday Pay</span>
                        <span className="font-medium">{formatCurrency(inc.holidayPay)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tax</span>
                      <span className="font-medium text-red-500">-{formatCurrency(inc.tax)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-500">Gross: </span>
                      <span className="font-semibold">{formatCurrency(inc.grossPay)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Deductions: </span>
                      <span className="font-semibold text-red-500">-{formatCurrency(totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
