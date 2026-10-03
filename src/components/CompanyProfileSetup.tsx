import React, { useState } from 'react';
import { ClientProfile, NatureOfBusiness, RegistrationStatus } from '../types/tax';
import { GST_STATE_MASTER, validateGstin } from '../data/gstStateMaster';
import { Building2, CheckCircle2, AlertCircle, Save } from 'lucide-react';

interface Props {
  onSaveProfile: (profile: any) => void;
  initialProfile?: ClientProfile | null;
  onCancel?: () => void;
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

export const CompanyProfileSetup: React.FC<Props> = ({
  onSaveProfile,
  initialProfile,
  onCancel,
}) => {
  // ZERO PREFILLED DATA: Everything starts strictly empty / false
  const [clientName, setClientName] = useState(initialProfile?.clientName || '');
  const [legalName, setLegalName] = useState(initialProfile?.legalName || '');
  const [tradeName, setTradeName] = useState(initialProfile?.tradeName || '');
  const [pan, setPan] = useState(initialProfile?.pan || '');
  const [gstin, setGstin] = useState(initialProfile?.gstin || '');
  const [stateCode, setStateCode] = useState(initialProfile?.stateCode || '');
  const [stateName, setStateName] = useState(initialProfile?.stateName || '');
  const [isStateAutoDerived, setIsStateAutoDerived] = useState(Boolean(initialProfile?.gstin));
  const [gstinError, setGstinError] = useState<string | null>(null);

  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>(
    initialProfile?.registrationStatus || 'Regular'
  );
  const [mobile, setMobile] = useState(initialProfile?.mobile || '');
  const [email, setEmail] = useState(initialProfile?.email || '');
  const [address, setAddress] = useState(initialProfile?.address || '');

  // Nature of Business (Do not automatically select any category)
  const [natureOfBusiness, setNatureOfBusiness] = useState<NatureOfBusiness[]>(
    initialProfile?.natureOfBusiness || []
  );
  const [customNatureOfBusiness, setCustomNatureOfBusiness] = useState(
    initialProfile?.customNatureOfBusiness || ''
  );

  // Business Activities (All start as false)
  const [mainBusinessActivity, setMainBusinessActivity] = useState(
    initialProfile?.mainBusinessActivity || ''
  );
  const [otherBusinessActivities, setOtherBusinessActivities] = useState(
    initialProfile?.otherBusinessActivities?.join(', ') || ''
  );
  const [taxableSupplies, setTaxableSupplies] = useState(initialProfile?.taxableSupplies ?? false);
  const [exemptSupplies, setExemptSupplies] = useState(initialProfile?.exemptSupplies ?? false);
  const [zeroRatedSupplies, setZeroRatedSupplies] = useState(initialProfile?.zeroRatedSupplies ?? false);
  const [nonGstSupplies, setNonGstSupplies] = useState(initialProfile?.nonGstSupplies ?? false);
  const [exportSupplies, setExportSupplies] = useState(initialProfile?.exportSupplies ?? false);
  const [sezSupplies, setSezSupplies] = useState(initialProfile?.sezSupplies ?? false);
  const [rcmActivities, setRcmActivities] = useState(initialProfile?.rcmActivities ?? false);
  const [capitalGoodsUsage, setCapitalGoodsUsage] = useState(initialProfile?.capitalGoodsUsage ?? false);
  const [employeeRelatedExpenses, setEmployeeRelatedExpenses] = useState(initialProfile?.employeeRelatedExpenses ?? false);
  const [motorVehicleUsage, setMotorVehicleUsage] = useState(initialProfile?.motorVehicleUsage ?? false);
  const [constructionPropertyActivities, setConstructionPropertyActivities] = useState(initialProfile?.constructionPropertyActivities ?? false);

  const [formError, setFormError] = useState<string | null>(null);

  // GSTIN input handler: Auto-populates State & PAN deterministically
  const handleGstinChange = (value: string) => {
    const formatted = value.toUpperCase().trim();
    setGstin(formatted);

    if (!formatted) {
      setGstinError(null);
      setStateCode('');
      setStateName('');
      setIsStateAutoDerived(false);
      return;
    }

    const validation = validateGstin(formatted);
    if (!validation.isValid) {
      setGstinError(validation.error || 'Invalid GSTIN');
    } else {
      setGstinError(null);
    }

    if (validation.state) {
      setStateCode(validation.state.code);
      setStateName(validation.state.name);
      setIsStateAutoDerived(true);
    }

    if (validation.pan && !pan) {
      setPan(validation.pan);
    }
  };

  const toggleNature = (item: NatureOfBusiness) => {
    if (natureOfBusiness.includes(item)) {
      setNatureOfBusiness(natureOfBusiness.filter(n => n !== item));
    } else {
      setNatureOfBusiness([...natureOfBusiness, item]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!clientName.trim()) {
      setFormError('Company / Client Name is mandatory.');
      return;
    }

    if (natureOfBusiness.length === 0 && !customNatureOfBusiness.trim()) {
      setFormError('Nature of Business is mandatory. Please select at least one category or enter a custom nature.');
      return;
    }

    if (gstin && gstinError) {
      setFormError('Please enter a valid 15-character GSTIN or leave blank if unregistered.');
      return;
    }

    const profileData = {
      clientName: clientName.trim(),
      legalName: legalName.trim() || clientName.trim(),
      tradeName: tradeName.trim() || clientName.trim(),
      pan: pan.toUpperCase().trim(),
      gstin: gstin.toUpperCase().trim(),
      stateCode,
      stateName,
      registrationStatus,
      mobile: mobile.trim(),
      email: email.trim(),
      address: address.trim(),
      natureOfBusiness,
      customNatureOfBusiness: customNatureOfBusiness.trim(),
      mainBusinessActivity: mainBusinessActivity.trim(),
      otherBusinessActivities: otherBusinessActivities
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
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
    };

    onSaveProfile(profileData);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">
                {initialProfile ? 'Edit Company Profile' : 'Set Up Company Profile'}
              </h1>
              <p className="text-xs text-slate-300">
                Enter your company information once. Inward invoices will be analyzed against this profile.
              </p>
            </div>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200">
              1. Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Company / Client Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="e.g., Apex Infotech Solutions Private Limited"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Legal Name</label>
                <input
                  type="text"
                  value={legalName}
                  onChange={e => setLegalName(e.target.value)}
                  placeholder="As per PAN card"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trade Name</label>
                <input
                  type="text"
                  value={tradeName}
                  onChange={e => setTradeName(e.target.value)}
                  placeholder="Brand / Trade Name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">PAN</label>
                <input
                  type="text"
                  maxLength={10}
                  value={pan}
                  onChange={e => setPan(e.target.value.toUpperCase())}
                  placeholder="e.g. AABCA1234F"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  GSTIN (15 Digits)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={gstin}
                  onChange={e => handleGstinChange(e.target.value)}
                  placeholder="e.g. 27AABCA1234F1Z8"
                  className={`w-full px-3 py-2 border rounded-lg font-mono uppercase focus:ring-2 focus:outline-hidden ${
                    gstinError ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-300 focus:ring-slate-900'
                  }`}
                />
                {gstinError && <p className="text-[11px] text-rose-600 mt-1">{gstinError}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  State (Auto-derived from GSTIN)
                </label>
                <input
                  type="text"
                  readOnly
                  value={stateName ? `${stateCode} - ${stateName}` : 'Will auto-detect from first 2 digits of GSTIN'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-600 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">GST Registration Status</label>
                <select
                  value={registrationStatus}
                  onChange={e => setRegistrationStatus(e.target.value as RegistrationStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  {REGISTRATION_STATUSES.map(st => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Mobile</label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="accounts@company.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Registered Business Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Office / Unit No., Building, Street, City, Pincode"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Nature of Business (Mandatory) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                2. Nature of Business <span className="text-rose-500">*</span>
              </h2>
              <span className="text-[11px] text-slate-500">Select all applicable categories</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
              {ALL_BUSINESS_NATURES.map(nature => (
                <label
                  key={nature}
                  className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    natureOfBusiness.includes(nature)
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={natureOfBusiness.includes(nature)}
                    onChange={() => toggleNature(nature)}
                    className="rounded text-emerald-500 focus:ring-0"
                  />
                  <span className="truncate">{nature}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Other / Custom Nature of Business
              </label>
              <input
                type="text"
                value={customNatureOfBusiness}
                onChange={e => setCustomNatureOfBusiness(e.target.value)}
                placeholder="Enter exact business activity if not covered above"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Section 3: Tax Profile & Activities (Optional) */}
          <div className="space-y-3 pt-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200">
              3. Business & Tax Activities (Optional)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Main Business Activity</label>
                <input
                  type="text"
                  value={mainBusinessActivity}
                  onChange={e => setMainBusinessActivity(e.target.value)}
                  placeholder="Primary source of revenue"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Other Activities (comma-separated)</label>
                <input
                  type="text"
                  value={otherBusinessActivities}
                  onChange={e => setOtherBusinessActivities(e.target.value)}
                  placeholder="e.g. Maintenance, Technical Support"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2 text-xs">
              <label className="flex items-center space-x-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxableSupplies}
                  onChange={e => setTaxableSupplies(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span className="text-slate-700 font-medium">Makes Taxable Supplies</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={exemptSupplies}
                  onChange={e => setExemptSupplies(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span className="text-slate-700 font-medium">Makes Exempt Supplies</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportSupplies}
                  onChange={e => setExportSupplies(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span className="text-slate-700 font-medium">Exports Goods or Services</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={rcmActivities}
                  onChange={e => setRcmActivities(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span className="text-slate-700 font-medium">Inward Supplies under RCM</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={capitalGoodsUsage}
                  onChange={e => setCapitalGoodsUsage(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span className="text-slate-700 font-medium">Capital Goods Purchases</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={motorVehicleUsage}
                  onChange={e => setMotorVehicleUsage(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span className="text-slate-700 font-medium">Commercial Vehicles / Fleet</span>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>{initialProfile ? 'Update Company Profile' : 'Save Company Profile & Continue'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
