import React from 'react';
import { ClientProfile, CompleteAnalysisRecord } from '../types/tax';
import { Building2, MapPin, Mail, Phone, ShieldCheck, CheckCircle2, XCircle, FileSpreadsheet, ArrowRight, History } from 'lucide-react';

interface Props {
  client: ClientProfile;
  analyses: CompleteAnalysisRecord[];
  onNewAnalysis: () => void;
  onViewPrevious: () => void;
  onEditClient: () => void;
}

export const ClientSummaryView: React.FC<Props> = ({
  client,
  analyses,
  onNewAnalysis,
  onViewPrevious,
  onEditClient,
}) => {
  const totalInvoices = analyses.length;
  const totalGstAnalyzed = analyses.reduce((acc, a) => acc + a.itcResult.totalGst, 0);
  const totalEligibleItc = analyses.reduce((acc, a) => acc + a.itcResult.eligibleItc, 0);
  const totalTdsDeducted = analyses.reduce((acc, a) => acc + a.tdsResult.tdsAmount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shrink-0">
              {client.clientName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{client.clientName}</h2>
              {client.tradeName && (
                <p className="text-xs text-slate-500 font-medium">Trade Name: {client.tradeName}</p>
              )}
              <div className="flex items-center space-x-3 mt-1 text-xs text-slate-600 font-mono">
                <span>PAN: <strong className="text-slate-900">{client.pan}</strong></span>
                <span>•</span>
                <span>GSTIN: <strong className="text-slate-900">{client.gstin || 'Unregistered'}</strong></span>
                <span>•</span>
                <span className="font-sans font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {client.registrationStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onNewAnalysis}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <span>+ New Analysis</span>
            </button>
            <button
              onClick={onEditClient}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* Aggregate Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Invoices</span>
            <p className="text-2xl font-black text-slate-900">{totalInvoices}</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total GST Evaluated</span>
            <p className="text-xl font-black text-slate-900 font-mono">₹ {totalGstAnalyzed.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3.5 bg-emerald-50 rounded-lg border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase block">Total Eligible ITC</span>
            <p className="text-xl font-black text-emerald-700 font-mono">₹ {totalEligibleItc.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total TDS Deducted</span>
            <p className="text-xl font-black text-slate-900 font-mono">₹ {totalTdsDeducted.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Nature & Activity */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Business Nature & Operational Scope</span>
          </h3>

          <div>
            <span className="text-xs text-slate-500 block mb-1">Mandatory Business Nature Categories</span>
            <div className="flex flex-wrap gap-1.5">
              {client.natureOfBusiness.map(nature => (
                <span
                  key={nature}
                  className="px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-semibold rounded-md border border-slate-200"
                >
                  {nature}
                </span>
              ))}
            </div>
          </div>

          {client.customNatureOfBusiness && (
            <div>
              <span className="text-xs text-slate-500 block mb-1">Custom Business Activity Specification</span>
              <p className="text-xs font-medium text-slate-800 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200">
                {client.customNatureOfBusiness}
              </p>
            </div>
          )}

          <div>
            <span className="text-xs text-slate-500 block mb-1">Main Business Activity</span>
            <p className="text-xs text-slate-800 font-medium">{client.mainBusinessActivity || 'Not specified'}</p>
          </div>

          {client.otherBusinessActivities && client.otherBusinessActivities.length > 0 && (
            <div>
              <span className="text-xs text-slate-500 block mb-1">Other Business Activities</span>
              <p className="text-xs text-slate-600">{client.otherBusinessActivities.join(', ')}</p>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{client.address || 'Address not entered'}</span>
          </div>
        </div>

        {/* GST & Statutory Tax Profile */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Statutory GST Taxability Profile</span>
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded border border-slate-200">
              {client.taxableSupplies ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className={client.taxableSupplies ? 'font-semibold text-slate-900' : 'text-slate-400'}>Taxable Supplies</span>
            </div>

            <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded border border-slate-200">
              {client.exemptSupplies ? <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" /> : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className={client.exemptSupplies ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                Exempt Supplies {client.exemptTurnoverRatioPercent ? `(${client.exemptTurnoverRatioPercent}%)` : ''}
              </span>
            </div>

            <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded border border-slate-200">
              {client.exportSupplies ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className={client.exportSupplies ? 'font-semibold text-slate-900' : 'text-slate-400'}>Export Supplies</span>
            </div>

            <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded border border-slate-200">
              {client.sezSupplies ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className={client.sezSupplies ? 'font-semibold text-slate-900' : 'text-slate-400'}>SEZ Supplies</span>
            </div>

            <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded border border-slate-200">
              {client.rcmActivities ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className={client.rcmActivities ? 'font-semibold text-slate-900' : 'text-slate-400'}>RCM Activities</span>
            </div>

            <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded border border-slate-200">
              {client.capitalGoodsUsage ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className={client.capitalGoodsUsage ? 'font-semibold text-slate-900' : 'text-slate-400'}>Capital Goods Usage</span>
            </div>

            <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded border border-slate-200">
              {client.employeeRelatedExpenses ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className={client.employeeRelatedExpenses ? 'font-semibold text-slate-900' : 'text-slate-400'}>Employee Expenses</span>
            </div>

            <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded border border-slate-200">
              {client.motorVehicleUsage ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className={client.motorVehicleUsage ? 'font-semibold text-slate-900' : 'text-slate-400'}>Motor Vehicles Used</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Profile Version: v{client.version}</span>
            <button
              onClick={onViewPrevious}
              className="text-slate-900 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>View All Past Analyses ({analyses.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
