/**
 * Type definitions for CA Decision-Support System:
 * TDS Applicability (Income-tax Act, 1961 vs Income-tax Act, 2025)
 * & GST ITC Eligibility (Sections 16, 17, 17(5))
 */

export type NatureOfBusiness =
  | 'Manufacturing'
  | 'Trading'
  | 'Wholesale'
  | 'Retail'
  | 'Import'
  | 'Export'
  | 'Professional Services'
  | 'Consultancy'
  | 'IT / Software'
  | 'Financial Services'
  | 'Insurance'
  | 'Real Estate'
  | 'Construction'
  | 'Advertising'
  | 'Hospitality'
  | 'Transportation / Logistics'
  | 'Education'
  | 'Healthcare'
  | 'Other';

export type RegistrationStatus =
  | 'Regular'
  | 'Composition'
  | 'SEZ Unit'
  | 'SEZ Developer'
  | 'Non-Resident Taxable'
  | 'Casual Taxable'
  | 'Unregistered'
  | 'Government Entity';

export interface ClientProfile {
  id: string;
  clientName: string;
  legalName: string;
  tradeName?: string;
  pan: string;
  gstin: string;
  stateCode: string;
  stateName: string;
  registrationStatus: RegistrationStatus;
  mobile: string;
  email: string;
  address: string;
  
  // Mandatory Nature of Business (multi-select + custom)
  natureOfBusiness: NatureOfBusiness[];
  customNatureOfBusiness?: string;

  // Business & Tax Profile
  mainBusinessActivity: string;
  otherBusinessActivities: string[];
  taxableSupplies: boolean;
  exemptSupplies: boolean;
  zeroRatedSupplies: boolean;
  nonGstSupplies: boolean;
  exportSupplies: boolean;
  sezSupplies: boolean;
  rcmActivities: boolean;
  capitalGoodsUsage: boolean;
  employeeRelatedExpenses: boolean;
  motorVehicleUsage: boolean;
  constructionPropertyActivities: boolean;

  // Apportionment percentages if known by CA (default optional)
  exemptTurnoverRatioPercent?: number; // for Rule 42/43 if applicable
  
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  hsnSac: string;
  quantity?: number;
  unitPrice?: number;
  taxableValue: number;
  cgstRate?: number;
  cgstAmount: number;
  sgstRate?: number;
  sgstAmount: number;
  igstRate?: number;
  igstAmount: number;
  cessAmount: number;
  totalGst: number;
  totalValue: number;

  // Nature classification for Tax
  itemCategory?: 'Goods' | 'Services' | 'Capital Goods' | 'Works Contract' | 'Motor Vehicle' | 'Food & Beverage' | 'Club / Fitness' | 'Employee Travel' | 'Other';
  natureOfPayment?: string; // e.g. "Professional Fees", "Contractor", "Rent - Machinery"
  
  // ITC Result on Line-Item Level
  itcStatus: 'Eligible' | 'Not Eligible' | 'Partially Eligible' | 'Requires Verification' | 'Insufficient Information';
  eligibleItc: number;
  ineligibleItc: number;
  reviewItc: number;
  itcReason: string;
  relevantSections: string[];
  
  // User/CA answers to conditional questions
  businessUseAnswers?: Record<string, boolean | string>;
  caOverride?: {
    overridden: boolean;
    originalStatus: string;
    newStatus: string;
    remarks: string;
    caName: string;
    date: string;
  };
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  paymentOrCreditDate: string; // YYYY-MM-DD (determines statutory Act & deduction timing)
  financialYear: string; // e.g. "2024-25", "2025-26", "2026-27"
  
  supplierName: string;
  supplierGstin: string;
  supplierPan: string;
  supplierStateCode: string;
  supplierStateName: string;
  supplierType: 'Company / Firm' | 'Individual / HUF' | 'Transporter' | 'Foreign Entity' | 'Unknown';
  supplierResidentStatus: 'Resident' | 'Non-Resident';
  
  recipientName: string;
  recipientGstin: string;
  recipientPan: string;
  recipientStateCode: string;
  recipientStateName: string;

  placeOfSupplyStateCode: string;
  placeOfSupplyStateName: string;
  isInterState: boolean;
  reverseChargeApplicable: boolean;

  items: InvoiceLineItem[];
  
  subtotalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalGst: number;
  grandTotal: number;

  natureOfSupplySummary: string; // e.g., "Professional & Technical Consultancy Services"
  rawText?: string;
  extractionSource: 'Local Deterministic' | 'Gemini Fallback' | 'Manual CA Entry';
  fileName?: string;
  batchId?: string;
}

export type ApplicableAct = 'Income-tax Act, 1961' | 'Income-tax Act, 2025';

export interface TdsRule {
  ruleId: string;
  natureOfPayment: string;
  
  // Act 1961 details
  oldSection: string;
  oldDescription: string;
  oldSingleThreshold: number;
  oldAggregateThreshold: number;
  oldRateIndHuf: number;
  oldRateOther: number;
  oldBase: string;

  // Act 2025 details
  newSection: string; // usually "Section 393"
  newTable: string; // e.g. "Table 1"
  newTableItem: string; // e.g. "Item 10"
  newDescription: string;
  newSingleThreshold: number;
  newAggregateThreshold: number;
  newRateIndHuf: number;
  newRateOther: number;
  newBase: string;

  // General conditions
  payerTypeCondition?: string;
  payeeTypeCondition?: string;
  panConditionRate: number; // Section 206AA (usually 20%, 5% for 194Q)
  exceptions: string[];
  specialConditions: string[];
  triggerTiming: string; // e.g., "Earlier of credit to payee's account or payment"
  depositDueRule: string; // e.g., "7th of the following month (30th April for March)"
  legalSource: string;
  sourceReference: string;
  lastVerified: string;
}

export interface TdsAnalysisResult {
  tdsApplicable: 'YES' | 'NO' | 'REVIEW REQUIRED' | 'INSUFFICIENT INFORMATION';
  applicableAct: ApplicableAct;
  actDeterminationReason: string;
  
  // Statutory Comparison
  comparison: {
    particular: string;
    act1961: string;
    act2025: string;
  }[];

  // Operative provision highlight
  operativeAct: ApplicableAct;
  operativeSection: string;
  operativeTableItem: string;
  natureOfPayment: string;

  thresholdAmount: number;
  thresholdType: 'Single Transaction' | 'Aggregate Annual' | 'Both' | 'No Threshold';
  thresholdStatus: 'Exceeded' | 'Within Limits' | 'Aggregate History Required';
  cumulativePaidThisYear?: number;

  // Financial Year Aggregate Tracking
  financialYear?: string;
  singleThresholdExceeded?: boolean;
  aggregateThresholdExceeded?: boolean;
  thresholdExceededDueToAggregate?: boolean;
  priorCumulativeInFy?: number;
  totalCumulativeInFy?: number;
  aggregateThresholdAmount?: number;
  headroomRemainingInFy?: number;
  priorInvoicesCountInFy?: number;
  tdsOnCumulativeOptionAvailable?: boolean;
  cumulativeTdsBase?: number;
  cumulativeTdsAmount?: number;
  applyTdsOnCumulative?: boolean;

  tdsRate: number;
  tdsBase: number;
  tdsAmount: number;

  triggerCondition: string;
  deductionDate: string;
  depositDueDate: string;
  
  reason: string;
  legalSource: string;
  sourceReference: string;

  panAvailable: boolean;
  higherRateApplied: boolean;
  exceptionsChecked: string[];

  caOverride?: {
    overridden: boolean;
    originalApplicability: string;
    newApplicability: string;
    remarks: string;
    caName: string;
    date: string;
  };
}

export interface GstItcAnalysisResult {
  overallStatus: 'Eligible' | 'Partially Eligible' | 'Not Eligible' | 'Requires Verification' | 'Insufficient Information';
  totalGst: number;
  eligibleItc: number;
  ineligibleItc: number;
  reviewItc: number;
  summaryReason: string;
  
  relevantProvisions: string[];
  blockedCreditsSummary: string[];
  conditionsChecked: {
    condition: string;
    satisfied: boolean | 'Requires Verification';
    provision: string;
    note: string;
  }[];

  lineItemResults: InvoiceLineItem[];
  
  rcmLiabilityPayableByRecipient: number;
  rcmItcEligibility: 'Eligible' | 'Ineligible' | 'Not Applicable';

  caOverride?: {
    overridden: boolean;
    originalStatus: string;
    newStatus: string;
    remarks: string;
    caName: string;
    date: string;
  };
}

export interface CompleteAnalysisRecord {
  id: string;
  clientSnapshot: ClientProfile;
  invoiceData: InvoiceData;
  tdsResult: TdsAnalysisResult;
  itcResult: GstItcAnalysisResult;
  
  createdAt: string;
  updatedAt: string;
  
  caReview: {
    status: 'Verified' | 'Pending' | 'Requires Further Verification';
    remarks: string;
    reviewedBy: string;
    reviewDate: string;
  };

  auditLog: {
    timestamp: string;
    action: string;
    performedBy: string;
    details: string;
  }[];
}
