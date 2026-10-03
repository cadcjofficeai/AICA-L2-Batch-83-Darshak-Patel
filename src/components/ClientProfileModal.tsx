import React, { useState, useEffect } from 'react';
import { ClientProfile, NatureOfBusiness, RegistrationStatus } from '../types/tax';
import { GST_STATE_MASTER, validateGstin } from '../data/gstStateMaster';
import { X, CheckCircle2, AlertCircle, Building2, Save } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: any) => void;
  initialClient?: ClientProfile | null;
}

const ALL_BUSINESS_NATURES: NatureOfBusiness[] = [
  'Manufacturing',
  'Trading',
  'Wholesale',
  'Retail',
  'Import',
  'Export',
  'Professional Services',
  'Consultancy',
  'IT / Software',
  'Financial Services',
  'Insurance',
  'Real Estate',
  'Construction',
  'Advertising',
  'Hospitality',
  'Transportation / Logistics',
  'Education',
  'Healthcare',
  'Other',
];

const REGISTRATION_STATUSES: RegistrationStatus[] = [
  'Regular',
  'Composition',
  'SEZ Unit',
  'SEZ Developer',
  'Non-Resident Taxable',
  'Casual Taxable',
  'Unregistered',
  'Government Entity',
];

export const ClientProfileModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialClient }) => {
  const [clientName, setClientName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [pan, setPan] = useState('');
  const [gstin, setGstin] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [stateName, setStateName] = useState('');
  const [isStateAutoDerived, setIsStateAutoDerived] = useState(false);
  const [gstinError, setGstinError] = useState<string | null>(null);

  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>('Regular');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Mandatory Nature of Business
  const [natureOfBusiness, setNatureOfBusiness] = useState<NatureOfBusiness[]>([]);
  const [customNatureOfBusiness, setCustomNatureOfBusiness] = useState('');

  // Business & Tax Profile
  const [mainBusinessActivity, setMainBusinessActivity] = useState('');
  const [otherBusinessActivities, setOtherBusinessActivities] = useState('');
  const [taxableSupplies, setTaxableSupplies] = useState(false);
  const [exemptSupplies, setExemptSupplies] = useState(false);
  const [zeroRatedSupplies, setZeroRatedSupplies] = useState(false);
  const [nonGstSupplies, setNonGstSupplies] = useState(false);
  const [exportSupplies, setExportSupplies] = useState(false);
  const [sezSupplies, setSezSupplies] = useState(false);
  const [rcmActivities, setRcmActivities] = useState(false);
  const [capitalGoodsUsage, setCapitalGoodsUsage] = useState(false);
  const [employeeRelatedExpenses, setEmployeeRelatedExpenses] = useState(false);
  const [motorVehicleUsage, setMotorVehicleUsage] = useState(false);
  const [constructionPropertyActivities, setConstructionPropertyActivities] = useState(false);
  const [exemptTurnoverRatioPercent, setExemptTurnoverRatioPercent] = useState<number | ''>('');

  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  useEffect(() => {
    if (initialClient) {
      setClientName(initialClient.clientName || '');
      setLegalName(initialClient.legalName || '');
      setTradeName(initialClient.tradeName || '');
      setPan(initialClient.pan || '');
      setGstin(initialClient.gstin || '');
      setStateCode(initialClient.stateCode || '');
      setStateName(initialClient.stateName || '');
      setIsStateAutoDerived(Boolean(initialClient.gstin));
      setRegistrationStatus(initialClient.registrationStatus || 'Regular');
      setMobile(initialClient.mobile || '');
      setEmail(initialClient.email || '');
      setAddress(initialClient.address || '');
      setNatureOfBusiness(initialClient.natureOfBusiness || []);
      setCustomNatureOfBusiness(initialClient.customNatureOfBusiness || '');
      setMainBusinessActivity(initialClient.mainBusinessActivity || '');
      setOtherBusinessActivities(initialClient.otherBusinessActivities?.join(', ') || '');
      setTaxableSupplies(initialClient.taxableSupplies ?? true);
      setExemptSupplies(initialClient.exemptSupplies ?? false);
      setZeroRatedSupplies(initialClient.zeroRatedSupplies ?? false);
      setNonGstSupplies(initialClient.nonGstSupplies ?? false);
      setExportSupplies(initialClient.exportSupplies ?? false);
      setSezSupplies(initialClient.sezSupplies ?? false);
      setRcmActivities(initialClient.rcmActivities ?? false);
      setCapitalGoodsUsage(initialClient.capitalGoodsUsage ?? true);
      setEmployeeRelatedExpenses(initialClient.employeeRelatedExpenses ?? true);
      setMotorVehicleUsage(initialClient.motorVehicleUsage ?? false);
      setConstructionPropertyActivities(initialClient.constructionPropertyActivities ?? false);
      setExemptTurnoverRatioPercent(initialClient.exemptTurnoverRatioPercent ?? '');
    } else {
      // Reset form for fresh client
      setClientName('');
      setLegalName('');
      setTradeName('');
      setPan('');
      setGstin('');
      setStateCode('');
      setStateName('');
      setIsStateAutoDerived(false);
      setGstinError(null);
      setRegistrationStatus('Regular');
      setMobile('');
      setEmail('');
      setAddress('');
      setNatureOfBusiness([]); // Prompt: Do not automatically select any business category
      setCustomNatureOfBusiness('');
      setMainBusinessActivity('');
      setOtherBusinessActivities('');
      setTaxableSupplies(false);
      setExemptSupplies(false);
      setZeroRatedSupplies(false);
      setNonGstSupplies(false);
      setExportSupplies(false);
      setSezSupplies(false);
      setRcmActivities(false);
      setCapitalGoodsUsage(false);
      setEmployeeRelatedExpenses(false);
      setMotorVehicleUsage(false);
      setConstructionPropertyActivities(false);
      setExemptTurnoverRatioPercent('');
    }
    setFormError(null);
    setSaveSuccessMsg(false);
  }, [initialClient, isOpen]);

  // Handle GSTIN change: Validate structure, auto-derive State, make State read-only
  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/\s+/g, '');
    setGstin(val);

    if (!val) {
      setGstinError(null);
      setIsStateAutoDerived(false);
      return;
    }

    if (val.length === 15) {
      const validation = validateGstin(val);
      if (validation.isValid && validation.state) {
        setStateCode(validation.state.code);
        setStateName(validation.state.name);
        setIsStateAutoDerived(true);
        setGstinError(null);
        if (validation.pan && !pan) {
          setPan(validation.pan);
        }
      } else {
        setGstinError(validation.error || 'Invalid GSTIN');
        setIsStateAutoDerived(false);
      }
    } else {
      setGstinError(`GSTIN must be 15 characters (${val.length}/15)`);
      setIsStateAutoDerived(false);
    }
  };

  const toggleBusinessNature = (nature: NatureOfBusiness) => {
    if (natureOfBusiness.includes(nature)) {
      setNatureOfBusiness(natureOfBusiness.filter(n => n !== nature));
    } else {
      setNatureOfBusiness([...natureOfBusiness, nature]);
    }
  };

  const handleManualStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setStateCode(code);
    setStateName(GST_STATE_MASTER[code]?.name || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!clientName.trim()) {
      setFormError('Client Name is required.');
      return;
    }

    if (natureOfBusiness.length === 0 && !customNatureOfBusiness.trim()) {
      setFormError('Mandatory: Please select at least one Nature of Client / Business or enter a Custom Business Nature.');
      return;
    }

    if (gstin && gstinError) {
      setFormError('Please correct the invalid GSTIN or leave it blank if unregistered.');
      return;
    }

    if (!stateCode) {
      setFormError('Please select or specify the State for tax jurisdiction.');
      return;
    }

    const payload = {
      ...(initialClient ? { id: initialClient.id } : {}),
      clientName: clientName.trim(),
      legalName: legalName.trim() || clientName.trim(),
      tradeName: tradeName.trim(),
      pan: pan.trim().toUpperCase(),
      gstin: gstin.trim().toUpperCase(),
      stateCode,
      stateName,
      registrationStatus,
      mobile: mobile.trim(),
      email: email.trim(),
      address: address.trim(),
      natureOfBusiness,
      customNatureOfBusiness: customNatureOfBusiness.trim(),
      mainBusinessActivity: mainBusinessActivity.trim(),
      otherBusinessActivities: otherBusinessActivities.split(',').map(s => s.trim()).filter(Boolean),
      taxableSupplies,
      exemptSupplies,
      zeroRatedSupplies,
      nonGstSupplies,
      exportSupplies,
      sezSupplies,
      rcmActivities,
      capitalGoodsUsage,
      employeeRelatedExpenses,
      motorVehicleUsage,
      constructionPropertyActivities,
      exemptTurnoverRatioPercent: exemptTurnoverRatioPercent !== '' ? Number(exemptTurnoverRatioPercent) : undefined,
    };

    setSaveSuccessMsg(true);
    setTimeout(() => {
      onSave(payload);
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {initialClient ? 'Edit Client Profile' : 'Add New Client Profile'}
              </h2>
              <p className="text-xs text-slate-300">
                Statutory GST & Income-tax profile management. Save once and reuse across analyses.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center space-x-2 text-emerald-800 text-sm font-semibold animate-pulse">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Client Profile Saved Successfully! Loading dashboard...</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              1. Basic Identification & Tax Registration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Client Display Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Infotech Solutions Private Limited"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trade Name (if any)</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Technologies"
                  value={tradeName}
                  onChange={e => setTradeName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Legal Name</label>
                <input
                  type="text"
                  placeholder="Official legal name"
                  value={legalName}
                  onChange={e => setLegalName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GSTIN (15 Digits)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 27AABCA1234F1Z8"
                  value={gstin}
                  onChange={handleGstinChange}
                  className={`w-full text-sm font-mono px-3 py-2 border rounded-md focus:ring-2 focus:outline-hidden ${
                    gstinError ? 'border-rose-400 bg-rose-50 focus:ring-rose-400' : 'border-slate-300 focus:ring-slate-900'
                  }`}
                />
                {gstinError ? (
                  <p className="text-[11px] text-rose-600 mt-1">{gstinError}</p>
                ) : isStateAutoDerived ? (
                  <p className="text-[11px] text-emerald-700 mt-1 font-medium">✓ Valid GSTIN: State derived automatically</p>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Permanent Account Number (PAN)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. AABCA1234F"
                  value={pan}
                  onChange={e => setPan(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  className="w-full text-sm font-mono px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GST State <span className="text-rose-500">*</span>
                  {isStateAutoDerived && <span className="ml-1 text-[10px] text-emerald-600 font-normal">(Auto-derived from GSTIN)</span>}
                </label>
                {isStateAutoDerived ? (
                  <input
                    type="text"
                    readOnly
                    value={`${stateCode} - ${stateName}`}
                    className="w-full text-sm px-3 py-2 bg-slate-100 border border-slate-300 rounded-md text-slate-700 font-medium cursor-not-allowed"
                  />
                ) : (
                  <select
                    value={stateCode}
                    onChange={handleManualStateChange}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  >
                    <option value="">-- Select State --</option>
                    {Object.values(GST_STATE_MASTER).map(s => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GST Registration Status</label>
                <select
                  value={registrationStatus}
                  onChange={e => setRegistrationStatus(e.target.value as RegistrationStatus)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  {REGISTRATION_STATUSES.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  placeholder="+91 98XXX XXXXX"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="accounts@client.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Business Address</label>
                <input
                  type="text"
                  placeholder="Complete office/factory address"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Mandatory Nature of Client / Business */}
          <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                2. Nature of Client / Business <span className="text-rose-600">* MANDATORY</span>
              </h3>
              <span className="text-xs text-amber-800">
                {natureOfBusiness.length} category selected (Multi-select allowed)
              </span>
            </div>
            <p className="text-xs text-amber-800 mb-3">
              This classification directly influences statutory GST ITC eligibility (e.g. Sections 16, 17(2), and 17(5) exceptions).
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-3">
              {ALL_BUSINESS_NATURES.map(nature => {
                const isSelected = natureOfBusiness.includes(nature);
                return (
                  <button
                    type="button"
                    key={nature}
                    onClick={() => toggleBusinessNature(nature)}
                    className={`px-3 py-2 text-xs font-medium rounded-md text-left transition-all border flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>{nature}</span>
                    {isSelected && <span className="text-[10px] text-emerald-400 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Other / Custom Nature of Business (CA Detailed Activity Specification)
              </label>
              <input
                type="text"
                placeholder="Specify precise activity (e.g., Enterprise Software Development & Cloud Operations)"
                value={customNatureOfBusiness}
                onChange={e => setCustomNatureOfBusiness(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Section 3: Business & Tax Profile */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              3. Statutory Business & GST Taxability Profile
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Configure supplies and operational attributes to accurately evaluate Section 17 apportionment and Section 17(5) blocks.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Main Business Activity</label>
                <input
                  type="text"
                  placeholder="Primary core revenue-generating activity"
                  value={mainBusinessActivity}
                  onChange={e => setMainBusinessActivity(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Other Business Activities (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="Secondary activities, ancillary operations"
                  value={otherBusinessActivities}
                  onChange={e => setOtherBusinessActivities(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs text-slate-700">
              <label className="flex items-center space-x-2 p-2 bg-white rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={taxableSupplies} onChange={e => setTaxableSupplies(e.target.checked)} className="rounded text-slate-900" />
                <span className="font-medium">Taxable Supplies</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-white rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={exemptSupplies} onChange={e => setExemptSupplies(e.target.checked)} className="rounded text-slate-900" />
                <span className="font-medium">Exempt Supplies</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-white rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={exportSupplies} onChange={e => setExportSupplies(e.target.checked)} className="rounded text-slate-900" />
                <span className="font-medium">Export Supplies</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-white rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={sezSupplies} onChange={e => setSezSupplies(e.target.checked)} className="rounded text-slate-900" />
                <span className="font-medium">SEZ Supplies</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-white rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={rcmActivities} onChange={e => setRcmActivities(e.target.checked)} className="rounded text-slate-900" />
                <span className="font-medium">RCM Activities</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-white rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={capitalGoodsUsage} onChange={e => setCapitalGoodsUsage(e.target.checked)} className="rounded text-slate-900" />
                <span className="font-medium">Capital Goods Used</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-white rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={employeeRelatedExpenses} onChange={e => setEmployeeRelatedExpenses(e.target.checked)} className="rounded text-slate-900" />
                <span className="font-medium">Employee Expenses</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-white rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={motorVehicleUsage} onChange={e => setMotorVehicleUsage(e.target.checked)} className="rounded text-slate-900" />
                <span className="font-medium">Motor Vehicle Usage</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-white rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={constructionPropertyActivities} onChange={e => setConstructionPropertyActivities(e.target.checked)} className="rounded text-slate-900" />
                <span className="font-medium">Construction/Property</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-white rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={zeroRatedSupplies} onChange={e => setZeroRatedSupplies(e.target.checked)} className="rounded text-slate-900" />
                <span className="font-medium">Zero-Rated Supplies</span>
              </label>
            </div>

            {exemptSupplies && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  Exempt Turnover Ratio (%) for Rule 42/43 Apportionment (Optional)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 20"
                    value={exemptTurnoverRatioPercent}
                    onChange={e => setExemptTurnoverRatioPercent(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-32 text-sm px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                  <span className="text-xs text-amber-800">
                    If known, common input services will be apportioned according to Section 17(2).
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-all flex items-center space-x-2"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>Save Client Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
