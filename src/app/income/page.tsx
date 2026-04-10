'use client';

import { useState, useEffect, useRef } from 'react';
import { Calculator, Upload, Camera, Loader2, Check, Plus, Trash2, FileText, Pencil } from 'lucide-react';
import { MonthlyIncome } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';
import * as db from '@/lib/database';
import { formatCurrency } from '@/lib/utils';

export default function IncomePage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [incomes, setIncomes] = useState<MonthlyIncome[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    month: '', basicPay: '', allowances: '', overtime: '', deMinimis: '',
    holidayPay: '', nsd: '', grossPay: '', sss: '', philhealth: '',
    pagibig: '', tax: '', otherDeductions: '', netPay: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    db.getMonthlyIncomes().then(setIncomes);
  }, [user]);

  const totalNet = incomes.reduce((s, i) => s + i.netPay, 0);
  const totalGross = incomes.reduce((s, i) => s + i.grossPay, 0);
  const totalTax = incomes.reduce((s, i) => s + i.tax, 0);
  const totalSSS = incomes.reduce((s, i) => s + i.sss, 0);
  const totalPH = incomes.reduce((s, i) => s + i.philhealth, 0);
  const totalPI = incomes.reduce((s, i) => s + i.pagibig, 0);
  const avgNet = incomes.length > 0 ? totalNet / incomes.length : 0;
  const avgGross = incomes.length > 0 ? totalGross / incomes.length : 0;

  // Tax projection
  const annualGross = avgGross * 12;
  const annualDeductions = annualGross > 0 ? 90000 + 38400 : 0;
  const annualTaxable = Math.max(0, annualGross - annualDeductions);
  let projectedTax = 0;
  if (annualTaxable > 800000) projectedTax = 102500 + 0.25 * (annualTaxable - 800000);
  else if (annualTaxable > 400000) projectedTax = 22500 + 0.20 * (annualTaxable - 400000);
  else if (annualTaxable > 250000) projectedTax = 0.15 * (annualTaxable - 250000);
  const taxBracket = annualTaxable > 800000 ? '800K-2M (25%)' : annualTaxable > 400000 ? '400K-800K (20%)' : annualTaxable > 250000 ? '250K-400K (15%)' : 'Below 250K (0%)';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError('');
    setScanning(true);
    setScanResult(null);

    try {
      const base64 = await fileToBase64(file);
      const mediaType = file.type || 'image/jpeg';

      const res = await fetch('/api/scan-payslip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setScanError(data.error || 'Scan failed. Try a clearer image.');
        setScanning(false);
        return;
      }

      if (data.data) {
        setScanResult(data.data);
        setForm({
          month: data.data.month || '',
          basicPay: String(data.data.basicPay || 0),
          allowances: String(data.data.allowances || 0),
          overtime: String(data.data.overtime || 0),
          deMinimis: String(data.data.deMinimis || 0),
          holidayPay: String(data.data.holidayPay || 0),
          nsd: String(data.data.nsd || 0),
          grossPay: String(data.data.grossPay || 0),
          sss: String(data.data.sss || 0),
          philhealth: String(data.data.philhealth || 0),
          pagibig: String(data.data.pagibig || 0),
          tax: String(data.data.tax || 0),
          otherDeductions: String(data.data.otherDeductions || 0),
          netPay: String(data.data.netPay || 0),
        });
      }
    } catch (err: any) {
      setScanError(err.message || 'Upload failed');
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSave = async () => {
    const inc: Omit<MonthlyIncome, 'id'> = {
      month: form.month || new Date().toISOString().slice(0, 7),
      basicPay: parseFloat(form.basicPay) || 0,
      allowances: parseFloat(form.allowances) || 0,
      overtime: parseFloat(form.overtime) || 0,
      deMinimis: parseFloat(form.deMinimis) || 0,
      holidayPay: parseFloat(form.holidayPay) || 0,
      nsd: parseFloat(form.nsd) || 0,
      grossPay: parseFloat(form.grossPay) || 0,
      sss: parseFloat(form.sss) || 0,
      philhealth: parseFloat(form.philhealth) || 0,
      pagibig: parseFloat(form.pagibig) || 0,
      tax: parseFloat(form.tax) || 0,
      otherDeductions: parseFloat(form.otherDeductions) || 0,
      netPay: parseFloat(form.netPay) || 0,
    };

    if (editingId) {
      const updated = await db.updateMonthlyIncome(editingId, inc);
      if (updated) {
        setIncomes((prev) => prev.map((i) => i.id === editingId ? updated : i));
      }
    } else {
      const saved = await db.addMonthlyIncome(inc);
      if (saved) setIncomes((prev) => [saved, ...prev]);
    }
    resetForm();
  };

  const resetForm = () => {
    setForm({ month: '', basicPay: '', allowances: '', overtime: '', deMinimis: '', holidayPay: '', nsd: '', grossPay: '', sss: '', philhealth: '', pagibig: '', tax: '', otherDeductions: '', netPay: '' });
    setScanResult(null);
    setShowManual(false);
    setEditingId(null);
  };

  const handleEdit = (inc: MonthlyIncome) => {
    setEditingId(inc.id);
    setForm({
      month: inc.month,
      basicPay: String(inc.basicPay),
      allowances: String(inc.allowances),
      overtime: String(inc.overtime),
      deMinimis: String(inc.deMinimis),
      holidayPay: String(inc.holidayPay),
      nsd: String(inc.nsd),
      grossPay: String(inc.grossPay),
      sss: String(inc.sss),
      philhealth: String(inc.philhealth),
      pagibig: String(inc.pagibig),
      tax: String(inc.tax),
      otherDeductions: String(inc.otherDeductions),
      netPay: String(inc.netPay),
    });
    setScanResult(null);
    setShowManual(true);
    // Scroll to top so form is visible
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  const handleDelete = async (id: string) => {
    await db.deleteMonthlyIncome(id);
    setIncomes((prev) => prev.filter((i) => i.id !== id));
  };

  const FormField = ({ label, field, color }: { label: string; field: keyof typeof form; color?: string }) => (
    <div>
      <label className="text-[10px] font-medium text-slate-400 uppercase">{label}</label>
      <input
        type={field === 'month' ? 'month' : 'number'}
        value={form[field]}
        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
        placeholder={field === 'month' ? 'YYYY-MM' : '0.00'}
        className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-sm font-medium outline-none focus:border-blue-500 ${color || 'text-slate-900'}`}
      />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Income</h1>
          <p className="text-sm text-slate-500">Track salary & deductions</p>
        </div>
        <button onClick={() => setShowManual(true)} className="text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 shadow transition-opacity hover:opacity-90" style={{ backgroundColor: theme.primary }}>
          <Plus size={18} /> Add
        </button>
      </div>

      {/* AI Scan Card */}
      <div className="rounded-2xl p-5 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${theme.primaryDark}, ${theme.primary})` }}>
        <div className="flex items-center gap-2 mb-3">
          <Camera size={20} />
          <h2 className="font-semibold">AI Payslip Scanner</h2>
        </div>
        <p className="text-white/70 text-xs mb-4">Upload a photo or screenshot of your payslip. AI will automatically extract all the numbers.</p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
          id="payslip-upload"
        />

        {scanning ? (
          <div className="flex items-center justify-center gap-3 py-4">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-sm font-medium">Scanning payslip...</span>
          </div>
        ) : (
          <div className="flex gap-3">
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-white/20 hover:bg-white/30 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              <Upload size={18} /> Upload Image
            </button>
            <button onClick={() => { fileInputRef.current?.setAttribute('capture', 'environment'); fileInputRef.current?.click(); }} className="flex-1 bg-white/20 hover:bg-white/30 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              <Camera size={18} /> Take Photo
            </button>
          </div>
        )}

        {scanError && (
          <div className="mt-3 bg-red-500/20 rounded-lg px-3 py-2 text-xs">{scanError}</div>
        )}
      </div>

      {/* Scan Result / Manual Entry Form - as MODAL */}
      {(scanResult || showManual) && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center modal-backdrop" onClick={resetForm}>
          <div className="bg-white w-full md:w-[480px] md:rounded-2xl rounded-t-2xl p-5 pb-8 mb-0 md:mb-0 modal-content max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {scanResult && <Check size={18} className="text-green-500" />}
                <h3 className="font-semibold text-slate-900">
                  {scanResult ? 'Scanned Data - Review & Save' : editingId ? 'Edit Income Record' : 'Add Income'}
                </h3>
              </div>
              <button onClick={resetForm} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
            </div>

            {scanResult?.employerName && (
              <p className="text-xs text-slate-500 mb-3">From: {scanResult.employerName} | Period: {scanResult.payPeriod}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><FormField label="Pay Period (Month)" field="month" /></div>

              <div className="col-span-2 pt-2">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Compensation</p>
              </div>
              <FormField label="Basic Pay" field="basicPay" />
              <FormField label="Allowances" field="allowances" />
              <FormField label="Overtime" field="overtime" />
              <FormField label="Holiday Pay" field="holidayPay" />
              <FormField label="Night Diff (NSD)" field="nsd" />
              <FormField label="De Minimis" field="deMinimis" />
              <div className="col-span-2">
                <FormField label="Gross Pay" field="grossPay" />
              </div>

              <div className="col-span-2 pt-2">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Deductions</p>
              </div>
              <FormField label="SSS" field="sss" color="text-red-600" />
              <FormField label="PhilHealth" field="philhealth" color="text-red-600" />
              <FormField label="Pag-IBIG" field="pagibig" color="text-red-600" />
              <FormField label="Withholding Tax" field="tax" color="text-red-600" />
              <div className="col-span-2">
                <FormField label="Other Deductions" field="otherDeductions" color="text-red-600" />
              </div>

              <div className="col-span-2 pt-2 border-t border-slate-100">
                <FormField label="Net Pay (Take Home)" field="netPay" color="text-green-600" />
              </div>
            </div>

            <button onClick={handleSave} className="w-full mt-4 text-white rounded-xl py-3 font-semibold transition-opacity hover:opacity-90 flex items-center justify-center gap-2" style={{ backgroundColor: theme.primary }}>
              <Check size={18} /> {editingId ? 'Update Record' : 'Save Income Record'}
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {incomes.length > 0 && (
        <>
          {/* Totals */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Year-to-Date Totals</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-[10px] text-slate-400">Total Net</p>
                <p className="text-sm font-bold text-green-600">{formatCurrency(totalNet)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400">Total Gross</p>
                <p className="text-sm font-bold text-slate-900">{formatCurrency(totalGross)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400">Total Tax</p>
                <p className="text-sm font-bold text-red-500">{formatCurrency(totalTax)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400">Total SSS</p>
                <p className="text-sm font-bold text-slate-700">{formatCurrency(totalSSS)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400">Total PhilHealth</p>
                <p className="text-sm font-bold text-slate-700">{formatCurrency(totalPH)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400">Total Pag-IBIG</p>
                <p className="text-sm font-bold text-slate-700">{formatCurrency(totalPI)}</p>
              </div>
            </div>
          </div>

          {/* Averages */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-medium">Avg Net</p>
              <p className="text-sm font-bold text-green-600">{formatCurrency(avgNet)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-medium">Avg Gross</p>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(avgGross)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-medium">{incomes.length} Records</p>
              <p className="text-sm font-bold text-slate-500">{incomes.length} payslips</p>
            </div>
          </div>

          {/* Tax Projection */}
          {avgGross > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Calculator size={16} style={{ color: theme.primary }} />
                <h3 className="text-sm font-semibold text-slate-900">Tax Projection</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-slate-400">Est. Taxable</span><p className="font-bold text-slate-900">{formatCurrency(annualTaxable)}</p></div>
                <div><span className="text-slate-400">Projected Tax</span><p className="font-bold text-red-500">{formatCurrency(projectedTax)}</p></div>
                <div><span className="text-slate-400">Bracket</span><p className="font-semibold text-slate-700">{taxBracket}</p></div>
                <div><span className="text-slate-400">YTD Paid</span><p className="font-semibold text-slate-700">{formatCurrency(totalTax)}</p></div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Monthly History */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          {incomes.length > 0 ? 'Monthly History' : ''}
        </h2>
        {incomes.length === 0 && !scanResult && !showManual ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-slate-100">
            <FileText size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">No income records yet</p>
            <p className="text-slate-400 text-sm mt-1 mb-4">Scan a payslip or add manually to start tracking</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => fileInputRef.current?.click()} className="text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-90" style={{ backgroundColor: theme.primary }}>
                <Camera size={16} /> Scan Payslip
              </button>
              <button onClick={() => setShowManual(true)} className="border border-slate-200 rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 flex items-center gap-1.5 hover:bg-slate-50">
                <Plus size={16} /> Manual Entry
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {incomes.map((inc) => {
              const [yr, mn] = inc.month.split('-').map(Number);
              const monthName = new Date(yr, mn - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              const totalDed = inc.sss + inc.philhealth + inc.pagibig + inc.tax + inc.otherDeductions;
              return (
                <div key={inc.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primaryBg }}>
                        <FileText size={18} style={{ color: theme.primary }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm">{monthName}</h3>
                        <p className="text-xs text-slate-400">Gross: {formatCurrency(inc.grossPay)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">{formatCurrency(inc.netPay)}</p>
                        <p className="text-[10px] text-red-400">-{formatCurrency(totalDed)} deductions</p>
                      </div>
                      <button onClick={() => handleEdit(inc)} className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors">
                        <Pencil size={14} className="text-slate-300 hover:text-blue-500" />
                      </button>
                      <button onClick={() => handleDelete(inc.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} className="text-slate-300 hover:text-red-400" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <span className="text-slate-400">Basic</span>
                      <p className="font-bold text-slate-700">{formatCurrency(inc.basicPay)}</p>
                    </div>
                    {inc.overtime > 0 && (
                      <div className="bg-blue-50 rounded-lg p-2 text-center">
                        <span className="text-blue-400">OT</span>
                        <p className="font-bold text-blue-700">{formatCurrency(inc.overtime)}</p>
                      </div>
                    )}
                    <div className="bg-red-50 rounded-lg p-2 text-center">
                      <span className="text-red-400">Tax</span>
                      <p className="font-bold text-red-600">{formatCurrency(inc.tax)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
