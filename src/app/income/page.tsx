'use client';

import { useState, useEffect, useRef } from 'react';
import { Calculator, Upload, Camera, Loader2, Check, Plus, Trash2, FileText, Pencil, ChevronRight, ChevronLeft, Wallet, ArrowUpRight, TrendingUp } from 'lucide-react';
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
  const [limitReached, setLimitReached] = useState(false);
  const [bypassPw, setBypassPw] = useState('');
  const [showBypass, setShowBypass] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ base64: string; mediaType: string } | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [viewMode, setViewMode] = useState<'payslip' | 'monthly'>('payslip');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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

  // Get available years from data
  const availableYears = [...new Set(incomes.map(i => parseInt(i.month.split('-')[0])))].sort((a, b) => b - a);
  if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
    // If selected year has no data, don't change - user might be adding for current year
  }

  // Filter by selected year
  const yearIncomes = incomes.filter(i => i.month.startsWith(String(selectedYear)));

  const totalNet = yearIncomes.reduce((s, i) => s + i.netPay, 0);
  const totalGross = yearIncomes.reduce((s, i) => s + i.grossPay, 0);
  const totalTax = yearIncomes.reduce((s, i) => s + i.tax, 0);
  const totalSSS = yearIncomes.reduce((s, i) => s + i.sss, 0);
  const totalPH = yearIncomes.reduce((s, i) => s + i.philhealth, 0);
  const totalPI = yearIncomes.reduce((s, i) => s + i.pagibig, 0);
  const totalOtherDed = yearIncomes.reduce((s, i) => s + i.otherDeductions, 0);
  const avgNet = yearIncomes.length > 0 ? totalNet / yearIncomes.length : 0;
  const avgGross = yearIncomes.length > 0 ? totalGross / yearIncomes.length : 0;

  // Group by month for combined view
  const monthlyGrouped = yearIncomes.reduce<Record<string, MonthlyIncome>>((acc, inc) => {
    if (!acc[inc.month]) {
      acc[inc.month] = { ...inc };
    } else {
      const m = acc[inc.month];
      m.basicPay += inc.basicPay;
      m.allowances += inc.allowances;
      m.overtime += inc.overtime;
      m.deMinimis += inc.deMinimis;
      m.holidayPay += inc.holidayPay;
      m.nsd += inc.nsd;
      m.grossPay += inc.grossPay;
      m.sss += inc.sss;
      m.philhealth += inc.philhealth;
      m.pagibig += inc.pagibig;
      m.tax += inc.tax;
      m.otherDeductions += inc.otherDeductions;
      m.netPay += inc.netPay;
    }
    return acc;
  }, {});
  const monthlyList = Object.values(monthlyGrouped).sort((a, b) => b.month.localeCompare(a.month));
  const displayList = viewMode === 'monthly' ? monthlyList : yearIncomes;

  // Tax projection
  const annualGross = avgGross * 12;
  const annualDeductions = annualGross > 0 ? 90000 + 38400 : 0;
  const annualTaxable = Math.max(0, annualGross - annualDeductions);
  let projectedTax = 0;
  if (annualTaxable > 800000) projectedTax = 102500 + 0.25 * (annualTaxable - 800000);
  else if (annualTaxable > 400000) projectedTax = 22500 + 0.20 * (annualTaxable - 400000);
  else if (annualTaxable > 250000) projectedTax = 0.15 * (annualTaxable - 250000);
  const taxBracket = annualTaxable > 800000 ? '800K-2M (25%)' : annualTaxable > 400000 ? '400K-800K (20%)' : annualTaxable > 250000 ? '250K-400K (15%)' : 'Below 250K (0%)';

  const doScan = async (base64: string, mediaType: string, bypass?: string) => {
    setScanError(''); setScanning(true); setScanResult(null); setLimitReached(false);
    try {
      const res = await fetch('/api/scan-payslip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType, userId: user?.id, bypassPassword: bypass }),
      });
      const data = await res.json();

      if (data.limitReached) {
        setLimitReached(true);
        setPendingFile({ base64, mediaType });
        setScanError(`Scan limit reached (${data.scansUsed}/${data.scansLimit} this month)`);
        setScanning(false);
        return;
      }

      if (!res.ok || !data.success) { setScanError(data.error || 'Scan failed'); setScanning(false); return; }
      if (data.data) {
        setScanResult(data.data);
        setForm({
          month: data.data.month || '', basicPay: String(data.data.basicPay || 0),
          allowances: String(data.data.allowances || 0), overtime: String(data.data.overtime || 0),
          deMinimis: String(data.data.deMinimis || 0), holidayPay: String(data.data.holidayPay || 0),
          nsd: String(data.data.nsd || 0), grossPay: String(data.data.grossPay || 0),
          sss: String(data.data.sss || 0), philhealth: String(data.data.philhealth || 0),
          pagibig: String(data.data.pagibig || 0), tax: String(data.data.tax || 0),
          otherDeductions: String(data.data.otherDeductions || 0), netPay: String(data.data.netPay || 0),
        });
        setPendingFile(null);
      }
    } catch (err: any) { setScanError(err.message || 'Upload failed'); }
    finally { setScanning(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
    await doScan(base64, file.type || 'image/jpeg');
  };

  const handleBypassSubmit = async () => {
    if (!pendingFile || !bypassPw) return;
    setShowBypass(false);
    await doScan(pendingFile.base64, pendingFile.mediaType, bypassPw);
    setBypassPw('');
  };

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleSave = async () => {
    const inc = {
      month: form.month || new Date().toISOString().slice(0, 7),
      basicPay: parseFloat(form.basicPay) || 0, allowances: parseFloat(form.allowances) || 0,
      overtime: parseFloat(form.overtime) || 0, deMinimis: parseFloat(form.deMinimis) || 0,
      holidayPay: parseFloat(form.holidayPay) || 0, nsd: parseFloat(form.nsd) || 0,
      grossPay: parseFloat(form.grossPay) || 0, sss: parseFloat(form.sss) || 0,
      philhealth: parseFloat(form.philhealth) || 0, pagibig: parseFloat(form.pagibig) || 0,
      tax: parseFloat(form.tax) || 0, otherDeductions: parseFloat(form.otherDeductions) || 0,
      netPay: parseFloat(form.netPay) || 0,
    };
    if (editingId) {
      const updated = await db.updateMonthlyIncome(editingId, inc);
      if (updated) setIncomes(prev => prev.map(i => i.id === editingId ? updated : i));
    } else {
      const saved = await db.addMonthlyIncome(inc);
      if (saved) setIncomes(prev => [saved, ...prev]);
    }
    resetForm();
  };

  const handleEdit = (inc: MonthlyIncome) => {
    setEditingId(inc.id);
    setForm({
      month: inc.month, basicPay: String(inc.basicPay), allowances: String(inc.allowances),
      overtime: String(inc.overtime), deMinimis: String(inc.deMinimis), holidayPay: String(inc.holidayPay),
      nsd: String(inc.nsd), grossPay: String(inc.grossPay), sss: String(inc.sss),
      philhealth: String(inc.philhealth), pagibig: String(inc.pagibig), tax: String(inc.tax),
      otherDeductions: String(inc.otherDeductions), netPay: String(inc.netPay),
    });
    setScanResult(null); setShowManual(true);
  };

  const handleDelete = async (id: string) => {
    await db.deleteMonthlyIncome(id);
    setIncomes(prev => prev.filter(i => i.id !== id));
  };

  const resetForm = () => {
    setForm({ month: '', basicPay: '', allowances: '', overtime: '', deMinimis: '', holidayPay: '', nsd: '', grossPay: '', sss: '', philhealth: '', pagibig: '', tax: '', otherDeductions: '', netPay: '' });
    setScanResult(null); setShowManual(false); setEditingId(null);
  };

  const Field = ({ label, field, tint }: { label: string; field: keyof typeof form; tint?: string }) => (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: tint || theme.primaryText + '80' }}>{label}</label>
      <input type={field === 'month' ? 'month' : 'number'} value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
        placeholder={field === 'month' ? '' : '0.00'} className="input-tinted w-full mt-1" style={{ color: tint }} />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Income & Payslips</h1>
          <p className="text-xs" style={{ color: theme.primary }}>Track salary, deductions & tax</p>
        </div>
        <button onClick={() => setShowManual(true)} className="btn-pill text-white text-xs flex items-center gap-1.5" style={{ backgroundColor: theme.primary }}>
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Year Selector */}
      <div className="flex items-center justify-center gap-4 card-white py-3 px-4">
        <button onClick={() => setSelectedYear(y => y - 1)} className="p-1 rounded-lg hover:opacity-70">
          <ChevronLeft size={20} style={{ color: theme.primary }} />
        </button>
        <span className="text-sm font-bold text-slate-900 min-w-[60px] text-center">{selectedYear}</span>
        <button onClick={() => setSelectedYear(y => y + 1)} disabled={selectedYear >= new Date().getFullYear()} className="p-1 rounded-lg hover:opacity-70 disabled:opacity-20">
          <ChevronRight size={20} style={{ color: theme.primary }} />
        </button>
        {availableYears.length > 1 && (
          <div className="flex gap-1 ml-2">
            {availableYears.map(y => (
              <button key={y} onClick={() => setSelectedYear(y)}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors"
                style={selectedYear === y ? { backgroundColor: theme.primary, color: 'white' } : { backgroundColor: theme.surfaceBg, color: theme.primaryText }}>
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hero Card - AI Scanner */}
      <div className="rounded-3xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${theme.headerGradient[0]}, ${theme.headerGradient[1]})` }}>
        <div className="flex items-center gap-2 mb-2">
          <Camera size={18} />
          <h2 className="font-bold text-sm">AI Payslip Scanner</h2>
        </div>
        <p className="text-white/60 text-[10px] mb-4">Upload a photo of your payslip. AI extracts salary, tax, and all deductions automatically.</p>

        <input ref={fileInputRef} type="file" accept="image/*,.pdf" capture="environment" onChange={handleFileUpload} className="hidden" />

        {scanning ? (
          <div className="flex items-center justify-center gap-3 py-4">
            <Loader2 size={22} className="animate-spin" />
            <span className="text-sm font-medium">Scanning payslip...</span>
          </div>
        ) : (
          <div className="flex gap-3">
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-white/20 hover:bg-white/30 rounded-full py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors">
              <Upload size={14} /> Upload Image
            </button>
            <button onClick={() => { fileInputRef.current?.setAttribute('capture', 'environment'); fileInputRef.current?.click(); }} className="flex-1 bg-white/20 hover:bg-white/30 rounded-full py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors">
              <Camera size={14} /> Take Photo
            </button>
          </div>
        )}
        {scanError && (
          <div className="mt-3 bg-red-500/20 rounded-2xl px-3 py-2 text-xs">
            {scanError}
            {limitReached && !showBypass && (
              <button onClick={() => setShowBypass(true)} className="block mt-1.5 underline text-white/80 text-[10px]">
                Have an access code?
              </button>
            )}
          </div>
        )}
        {showBypass && (
          <div className="mt-3 flex gap-2">
            <input type="password" value={bypassPw} onChange={e => setBypassPw(e.target.value)} placeholder="Enter access code" className="flex-1 bg-white/20 rounded-full px-4 py-2 text-xs text-white placeholder-white/40 outline-none" autoFocus />
            <button onClick={handleBypassSubmit} className="bg-white/30 rounded-full px-4 py-2 text-xs font-bold">Unlock</button>
          </div>
        )}
      </div>

      {/* YTD Summary Cards */}
      {yearIncomes.length > 0 && (
        <>
          <div className="card-white p-4">
            <h3 className="text-xs font-bold text-slate-900 mb-3">{selectedYear} Summary ({yearIncomes.length} payslips)</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: theme.surfaceBg }}>
                <p className="text-[9px] font-medium" style={{ color: theme.primary }}>Total Net</p>
                <p className="text-sm font-bold text-green-600">{formatCurrency(totalNet)}</p>
              </div>
              <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: theme.surfaceBg }}>
                <p className="text-[9px] font-medium" style={{ color: theme.primary }}>Total Gross</p>
                <p className="text-sm font-bold text-slate-900">{formatCurrency(totalGross)}</p>
              </div>
              <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: theme.surfaceBg }}>
                <p className="text-[9px] font-medium" style={{ color: theme.primary }}>Total Tax</p>
                <p className="text-sm font-bold text-red-500">{formatCurrency(totalTax)}</p>
              </div>
            </div>
            {/* Deductions breakdown */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t" style={{ borderColor: theme.primaryBg }}>
              <div className="flex justify-between text-[10px]">
                <span style={{ color: theme.primaryText + '80' }}>SSS</span>
                <span className="font-bold text-slate-700">{formatCurrency(totalSSS)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span style={{ color: theme.primaryText + '80' }}>PhilHealth</span>
                <span className="font-bold text-slate-700">{formatCurrency(totalPH)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span style={{ color: theme.primaryText + '80' }}>Pag-IBIG</span>
                <span className="font-bold text-slate-700">{formatCurrency(totalPI)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span style={{ color: theme.primaryText + '80' }}>Other Ded.</span>
                <span className="font-bold text-slate-700">{formatCurrency(totalOtherDed)}</span>
              </div>
            </div>
          </div>

          {/* Averages */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card-white p-3 text-center">
              <p className="text-[9px] font-medium text-slate-400">Avg Net</p>
              <p className="text-sm font-bold text-green-600">{formatCurrency(avgNet)}</p>
            </div>
            <div className="card-white p-3 text-center">
              <p className="text-[9px] font-medium text-slate-400">Avg Gross</p>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(avgGross)}</p>
            </div>
            <div className="card-white p-3 text-center">
              <p className="text-[9px] font-medium text-slate-400">Records</p>
              <p className="text-sm font-bold" style={{ color: theme.primary }}>{incomes.length}</p>
            </div>
          </div>

          {/* Tax Projection */}
          {avgGross > 0 && (
            <div className="card-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primaryBg }}>
                  <Calculator size={16} style={{ color: theme.primary }} />
                </div>
                <h3 className="text-xs font-bold text-slate-900">Tax Projection</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-3" style={{ backgroundColor: theme.surfaceBg }}>
                  <p className="text-[9px] font-medium" style={{ color: theme.primary }}>Est. Annual Taxable</p>
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(annualTaxable)}</p>
                </div>
                <div className="rounded-2xl p-3" style={{ backgroundColor: theme.surfaceBg }}>
                  <p className="text-[9px] font-medium" style={{ color: theme.primary }}>Projected Tax</p>
                  <p className="text-sm font-bold text-red-500">{formatCurrency(projectedTax)}</p>
                </div>
                <div className="rounded-2xl p-3" style={{ backgroundColor: theme.surfaceBg }}>
                  <p className="text-[9px] font-medium" style={{ color: theme.primary }}>Bracket</p>
                  <p className="text-xs font-bold text-slate-700">{taxBracket}</p>
                </div>
                <div className="rounded-2xl p-3" style={{ backgroundColor: theme.surfaceBg }}>
                  <p className="text-[9px] font-medium" style={{ color: theme.primary }}>YTD Paid</p>
                  <p className="text-sm font-bold text-slate-700">{formatCurrency(totalTax)}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* History */}
      <div>
        {yearIncomes.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">History</h2>
            <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: theme.primary + '40' }}>
              <button onClick={() => setViewMode('payslip')}
                className="text-[10px] font-bold px-3 py-1.5 transition-colors"
                style={viewMode === 'payslip' ? { backgroundColor: theme.primary, color: 'white' } : { color: theme.primary }}>
                Payslip
              </button>
              <button onClick={() => setViewMode('monthly')}
                className="text-[10px] font-bold px-3 py-1.5 transition-colors"
                style={viewMode === 'monthly' ? { backgroundColor: theme.primary, color: 'white' } : { color: theme.primary }}>
                Monthly
              </button>
            </div>
          </div>
        )}

        {yearIncomes.length === 0 && !scanResult && !showManual ? (
          <div className="card-white p-10 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: theme.primaryBg }}>
              <FileText size={24} style={{ color: theme.primary }} />
            </div>
            <p className="text-sm font-bold text-slate-900">No income records yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-5">Scan a payslip or add manually to start tracking</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => fileInputRef.current?.click()} className="btn-pill text-white text-xs flex items-center gap-1.5" style={{ backgroundColor: theme.primary }}>
                <Camera size={14} /> Scan Payslip
              </button>
              <button onClick={() => setShowManual(true)} className="btn-pill text-xs flex items-center gap-1.5 border" style={{ borderColor: theme.primary, color: theme.primary }}>
                <Plus size={14} /> Manual
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {displayList.map((inc, idx) => {
              const [yr, mn] = inc.month.split('-').map(Number);
              const monthName = new Date(yr, mn - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              const totalDed = inc.sss + inc.philhealth + inc.pagibig + inc.tax + inc.otherDeductions;
              const payslipCount = viewMode === 'monthly' ? yearIncomes.filter(i => i.month === inc.month).length : 0;

              return (
                <div key={viewMode === 'monthly' ? inc.month : inc.id} className="card-white p-4">
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: theme.primaryBg }}>
                        <FileText size={18} style={{ color: theme.primary }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{monthName}</p>
                        <p className="text-[10px]" style={{ color: theme.primary }}>
                          Gross: {formatCurrency(inc.grossPay)}
                          {viewMode === 'monthly' && payslipCount > 1 && <span> · {payslipCount} payslips combined</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="text-right mr-1">
                        <p className="text-base font-bold text-green-600">{formatCurrency(inc.netPay)}</p>
                        <p className="text-[9px] text-red-400">-{formatCurrency(totalDed)}</p>
                      </div>
                      {viewMode === 'payslip' && (
                        <>
                          <button onClick={() => handleEdit(inc)} className="p-1.5 rounded-xl hover:bg-blue-50"><Pencil size={13} className="text-slate-300 hover:text-blue-500" /></button>
                          <button onClick={() => handleDelete(inc.id)} className="p-1.5 rounded-xl hover:bg-red-50"><Trash2 size={13} className="text-slate-300 hover:text-red-400" /></button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Breakdown grid */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <div className="rounded-xl p-2 text-center" style={{ backgroundColor: theme.primaryBg }}>
                      <p className="text-[8px] font-medium" style={{ color: theme.primaryText + '80' }}>Basic</p>
                      <p className="text-xs font-bold" style={{ color: theme.primaryText }}>{formatCurrency(inc.basicPay)}</p>
                    </div>
                    {inc.overtime > 0 && (
                      <div className="rounded-xl p-2 text-center bg-blue-50">
                        <p className="text-[8px] font-medium text-blue-400">Overtime</p>
                        <p className="text-xs font-bold text-blue-700">{formatCurrency(inc.overtime)}</p>
                      </div>
                    )}
                    {inc.allowances > 0 && (
                      <div className="rounded-xl p-2 text-center bg-purple-50">
                        <p className="text-[8px] font-medium text-purple-400">Allowances</p>
                        <p className="text-xs font-bold text-purple-700">{formatCurrency(inc.allowances)}</p>
                      </div>
                    )}
                    {inc.holidayPay > 0 && (
                      <div className="rounded-xl p-2 text-center bg-amber-50">
                        <p className="text-[8px] font-medium text-amber-400">Holiday</p>
                        <p className="text-xs font-bold text-amber-700">{formatCurrency(inc.holidayPay)}</p>
                      </div>
                    )}
                    {inc.nsd > 0 && (
                      <div className="rounded-xl p-2 text-center bg-indigo-50">
                        <p className="text-[8px] font-medium text-indigo-400">NSD</p>
                        <p className="text-xs font-bold text-indigo-700">{formatCurrency(inc.nsd)}</p>
                      </div>
                    )}
                    <div className="rounded-xl p-2 text-center bg-red-50">
                      <p className="text-[8px] font-medium text-red-400">Tax</p>
                      <p className="text-xs font-bold text-red-600">{formatCurrency(inc.tax)}</p>
                    </div>
                    {(inc.sss + inc.philhealth + inc.pagibig + inc.otherDeductions) > 0 && (
                      <div className="rounded-xl p-2 text-center bg-orange-50">
                        <p className="text-[8px] font-medium text-orange-400">Other Ded.</p>
                        <p className="text-xs font-bold text-orange-700">{formatCurrency(inc.sss + inc.philhealth + inc.pagibig + inc.otherDeductions)}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(scanResult || showManual) && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center modal-backdrop" onClick={resetForm}>
          <div className="bg-white w-full md:w-[480px] md:rounded-3xl rounded-t-3xl p-5 pb-8 mb-0 md:mb-0 modal-content max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {scanResult && <Check size={18} className="text-green-500" />}
                <h3 className="font-bold text-slate-900">
                  {scanResult ? 'Scanned - Review & Save' : editingId ? 'Edit Record' : 'Add Income'}
                </h3>
              </div>
              <button onClick={resetForm} className="text-xs font-medium" style={{ color: theme.primary }}>Cancel</button>
            </div>

            {scanResult?.employerName && (
              <p className="text-[10px] mb-3 px-3 py-1.5 rounded-full inline-block" style={{ backgroundColor: theme.primaryBg, color: theme.primaryText }}>
                {scanResult.employerName} &middot; {scanResult.payPeriod}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Field label="Pay Period" field="month" /></div>

              <div className="col-span-2 mt-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-green-600 mb-2">💰 Compensation</p>
              </div>
              <Field label="Basic Pay" field="basicPay" />
              <Field label="Allowances" field="allowances" />
              <Field label="Overtime" field="overtime" />
              <Field label="Holiday Pay" field="holidayPay" />
              <Field label="Night Diff" field="nsd" />
              <Field label="De Minimis" field="deMinimis" />
              <div className="col-span-2"><Field label="Gross Pay" field="grossPay" /></div>

              <div className="col-span-2 mt-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-red-500 mb-2">📋 Deductions</p>
              </div>
              <Field label="SSS" field="sss" tint="#ef4444" />
              <Field label="PhilHealth" field="philhealth" tint="#ef4444" />
              <Field label="Pag-IBIG" field="pagibig" tint="#ef4444" />
              <Field label="Tax" field="tax" tint="#ef4444" />
              <div className="col-span-2"><Field label="Other Deductions" field="otherDeductions" tint="#ef4444" /></div>

              <div className="col-span-2 mt-2 pt-3" style={{ borderTop: `1.5px solid ${theme.primaryBg}` }}>
                <Field label="Net Pay (Take Home)" field="netPay" tint="#16a34a" />
              </div>
            </div>

            <button onClick={handleSave} className="w-full mt-5 btn-pill text-white font-bold flex items-center justify-center gap-2" style={{ backgroundColor: theme.primary }}>
              <Check size={16} /> {editingId ? 'Update Record' : 'Save Income Record'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
