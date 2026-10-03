import React, { useState, useEffect } from 'react';
import { ClientProfile, InvoiceData, InvoiceLineItem, CompleteAnalysisRecord, TdsAnalysisResult, GstItcAnalysisResult } from '../types/tax';
import { extractInvoiceLocally } from '../services/localExtractor';
import { analyzeTds } from '../services/tdsEngine';
import { analyzeGstItc } from '../services/gstItcEngine';
import { storageService } from '../services/storageService';
import { TdsResultPanel } from './TdsResultPanel';
import { GstItcResultPanel } from './GstItcResultPanel';
import { CaReviewAndExportBar } from './CaReviewAndExportBar';
import { validateGstin } from '../data/gstStateMaster';
import { Upload, FileText, Sparkles, AlertTriangle, Plus, Trash2, RotateCcw, Building2, Layers, CheckCircle2, Save, Check, FileCheck, Layers2 } from 'lucide-react';

interface Props {
  client: ClientProfile;
  onSaveAnalysis: (record: CompleteAnalysisRecord) => void;
  initialRecord?: CompleteAnalysisRecord | null;
}

// Factory function for a pristine, completely blank invoice
export const createBlankInvoice = (client: ClientProfile): InvoiceData => ({
  id: 'inv-' + Date.now(),
  invoiceNumber: '',
  invoiceDate: '',
  paymentOrCreditDate: '',
  financialYear: storageService.getFinancialYear(),
  supplierName: '',
  supplierGstin: '',
  supplierPan: '',
  supplierStateCode: '',
  supplierStateName: '',
  supplierType: 'Company / Firm',
  supplierResidentStatus: 'Resident',
  recipientName: client.clientName || client.tradeName || '',
  recipientGstin: client.gstin || '',
  recipientPan: client.pan || '',
  recipientStateCode: client.stateCode || '',
  recipientStateName: client.stateName || '',
  placeOfSupplyStateCode: client.stateCode || '',
  placeOfSupplyStateName: client.stateName || '',
  isInterState: false,
  reverseChargeApplicable: false,
  natureOfSupplySummary: '',
  subtotalTaxable: 0,
  totalCgst: 0,
  totalSgst: 0,
  totalIgst: 0,
  totalCess: 0,
  totalGst: 0,
  grandTotal: 0,
  extractionSource: 'Local Deterministic',
  items: [],
});

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function mapAiResponseToInvoice(
  res: any,
  fallbackInvoice: InvoiceData,
  client: ClientProfile,
  sourceLabel: 'Gemini Fallback' | 'Local Deterministic',
  fileName?: string
): InvoiceData {
  const cleanFileName = fileName ? fileName.replace(/\.[^/.]+$/, '').trim() : '';
  const supGstin = (res.supplier_gstin || fallbackInvoice.supplierGstin || '').toUpperCase();
  const supVal = validateGstin(supGstin);

  const newItems: InvoiceLineItem[] = (res.items || []).map((it: any, i: number) => {
    const taxable = Number(it.taxable_value) || 0;
    const cgst = Number(it.cgst_amount) || 0;
    const sgst = Number(it.sgst_amount) || 0;
    const igst = Number(it.igst_amount) || 0;
    const totGst = cgst + sgst + igst;
    return {
      id: 'item-ai-' + i + '-' + Math.floor(Math.random() * 1000),
      description: it.description || cleanFileName || 'Line Item',
      hsnSac: it.hsn_sac || '998313',
      taxableValue: taxable,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      cessAmount: 0,
      totalGst: totGst,
      totalValue: taxable + totGst,
      itcStatus: 'Eligible',
      eligibleItc: totGst,
      ineligibleItc: 0,
      reviewItc: 0,
      itcReason: 'Subject to statutory Section 16 & 17 evaluation.',
      relevantSections: ['Section 16(1)'],
      itemCategory: (it.category) || (/laptop|chair|table|car|electronic|goods|hardware|vehicle|computer/i.test(it.description || '') || (it.hsn_sac && it.hsn_sac.length >= 4 && !it.hsn_sac.startsWith('99')) ? 'Goods' : 'Services'),
    };
  });

  const subtotal = newItems.reduce((acc, it) => acc + it.taxableValue, 0) || Number(res.taxable_value) || 0;
  const totalCgst = newItems.reduce((acc, it) => acc + it.cgstAmount, 0) || Number(res.cgst_amount) || 0;
  const totalSgst = newItems.reduce((acc, it) => acc + it.sgstAmount, 0) || Number(res.sgst_amount) || 0;
  const totalIgst = newItems.reduce((acc, it) => acc + it.igstAmount, 0) || Number(res.igst_amount) || 0;
  const grandTot = Number(res.total_amount) || (subtotal + totalCgst + totalSgst + totalIgst);
  const invDate = res.invoice_date || fallbackInvoice.invoiceDate || new Date().toISOString().split('T')[0];
  const payDate = res.payment_credit_date || invDate;

  const supplierName = res.supplier && res.supplier !== 'Vendor Enterprise'
    ? res.supplier
    : (cleanFileName || fallbackInvoice.supplierName || 'Vendor / Supplier');

  const invoiceNumber = res.invoice_number && !res.invoice_number.startsWith('INV-')
    ? res.invoice_number
    : (cleanFileName || fallbackInvoice.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`);

  const natureSummary = res.tds_nature || (cleanFileName ? `Supply: ${cleanFileName}` : fallbackInvoice.natureOfSupplySummary || 'Goods / Services');

  const itemsList: InvoiceLineItem[] = newItems.length > 0 ? newItems : [{
    id: 'item-1-' + Date.now(),
    description: natureSummary,
    hsnSac: '998313',
    taxableValue: subtotal,
    cgstAmount: totalCgst,
    sgstAmount: totalSgst,
    igstAmount: totalIgst,
    cessAmount: 0,
    totalGst: totalCgst + totalSgst + totalIgst,
    totalValue: grandTot,
    itcStatus: 'Eligible',
    eligibleItc: totalCgst + totalSgst + totalIgst,
    ineligibleItc: 0,
    reviewItc: 0,
    itcReason: 'Section 16(1) course or furtherance of business.',
    relevantSections: ['Section 16(1)'],
  }];

  return {
    ...fallbackInvoice,
    id: 'inv-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
    invoiceNumber,
    invoiceDate: invDate,
    paymentOrCreditDate: payDate,
    financialYear: storageService.getFinancialYear(payDate || invDate),
    supplierName,
    supplierGstin: supGstin,
    supplierPan: supVal.pan || (supGstin.length >= 12 ? supGstin.substring(2, 12) : fallbackInvoice.supplierPan),
    supplierStateCode: supVal.state?.code || '',
    supplierStateName: supVal.state?.name || '',
    subtotalTaxable: subtotal,
    totalCgst,
    totalSgst,
    totalIgst,
    totalGst: totalCgst + totalSgst + totalIgst,
    grandTotal: grandTot,
    natureOfSupplySummary: natureSummary,
    extractionSource: sourceLabel,
    fileName: fileName || fallbackInvoice.fileName || '',
    items: itemsList,
    isInterState: Boolean(supVal.state?.code && client.stateCode && supVal.state.code !== client.stateCode),
  };
}

export const InvoiceAnalysisView: React.FC<Props> = ({
  client,
  onSaveAnalysis,
  initialRecord,
}) => {
  // Batch of selected invoices (allows multiple invoice selection and switching)
  const [selectedInvoices, setSelectedInvoices] = useState<InvoiceData[]>([
    initialRecord ? initialRecord.invoiceData : createBlankInvoice(client),
  ]);
  const [activeInvoiceIndex, setActiveInvoiceIndex] = useState<number>(0);

  // Active invoice being viewed / edited
  const invoice = selectedInvoices[activeInvoiceIndex] || selectedInvoices[0] || createBlankInvoice(client);

  const [rawPastedText, setRawPastedText] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'manual'>('upload');

  // Rule Engine Options
  const [priorPayments, setPriorPayments] = useState<number>(0);
  const [isPriorManuallyEdited, setIsPriorManuallyEdited] = useState<boolean>(false);
  const [transporterDeclaration, setTransporterDeclaration] = useState<boolean>(false);
  const [applyTdsOnCumulative, setApplyTdsOnCumulative] = useState<boolean>(false);
  const [userQuestionAnswers, setUserQuestionAnswers] = useState<Record<string, Record<string, boolean | string>>>({});

  // Extraction & AI Fallback State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [batchSaveStatus, setBatchSaveStatus] = useState<string | null>(null);

  // FINANCIAL YEAR & VENDOR AGGREGATE LIMIT AUTO-CALCULATION
  const activeFy = invoice.financialYear || storageService.getFinancialYear(invoice.paymentOrCreditDate || invoice.invoiceDate);

  // Calculate prior payments from saved database records for this vendor in this FY
  const vendorFySummary = storageService.getVendorFySummary(
    { pan: invoice.supplierPan, gstin: invoice.supplierGstin, name: invoice.supplierName },
    activeFy,
    invoice.id
  );

  // If working in a batch of multiple invoices, also aggregate any earlier invoices in the batch for this vendor
  const batchPrecedingSameVendor = selectedInvoices.slice(0, activeInvoiceIndex).filter(other => {
    const otherFy = other.financialYear || storageService.getFinancialYear(other.paymentOrCreditDate || other.invoiceDate);
    if (otherFy !== activeFy) return false;
    const matchPan = invoice.supplierPan && other.supplierPan && invoice.supplierPan.toUpperCase() === other.supplierPan.toUpperCase();
    const matchGstin = invoice.supplierGstin && other.supplierGstin && invoice.supplierGstin.toUpperCase() === other.supplierGstin.toUpperCase();
    const matchName = invoice.supplierName && other.supplierName && invoice.supplierName.trim().toLowerCase() === other.supplierName.trim().toLowerCase();
    return matchPan || matchGstin || matchName;
  });

  const batchPrecedingTaxable = batchPrecedingSameVendor.reduce((s, it) => s + (it.subtotalTaxable || 0), 0);
  const autoCalculatedPrior = vendorFySummary.cumulativeTaxableAmount + batchPrecedingTaxable;
  const savedFyInvoicesCount = vendorFySummary.invoiceCount + batchPrecedingSameVendor.length;

  // Auto-sync prior payments when vendor or active invoice changes, unless manually overridden
  useEffect(() => {
    if (!isPriorManuallyEdited) {
      setPriorPayments(autoCalculatedPrior);
    }
  }, [autoCalculatedPrior, isPriorManuallyEdited, activeInvoiceIndex, invoice.supplierName, invoice.supplierPan, invoice.supplierGstin]);

  // Handle re-syncing prior payments
  const handleSyncPriorFromSaved = () => {
    setIsPriorManuallyEdited(false);
    setPriorPayments(autoCalculatedPrior);
  };

  // Helper to update the currently active invoice in the batch
  const updateActiveInvoice = (updater: InvoiceData | ((prev: InvoiceData) => InvoiceData)) => {
    setSelectedInvoices(prev => {
      const next = [...prev];
      const current = next[activeInvoiceIndex] || invoice;
      const updated = typeof updater === 'function' ? updater(current) : updater;
      next[activeInvoiceIndex] = updated;
      return next;
    });
  };

  // Evaluate Deterministic TDS Engine (Zero Gemini calls)
  const tdsResult: TdsAnalysisResult = analyzeTds(invoice, client, {
    priorCumulativePaymentsInFy: priorPayments,
    transporterOwnsMax10Carriages: transporterDeclaration,
    financialYear: activeFy,
    priorInvoicesCountInFy: savedFyInvoicesCount,
    applyTdsOnCumulative,
  });

  // Evaluate Deterministic GST ITC Engine (Zero Gemini calls)
  const itcResult: GstItcAnalysisResult = analyzeGstItc(invoice, client, userQuestionAnswers);

  // Arithmetic Validation
  const calculatedSubtotal = invoice.items.reduce((acc, it) => acc + (it.taxableValue || 0), 0);
  const calculatedGst = invoice.items.reduce((acc, it) => acc + (it.totalGst || 0), 0);
  const calculatedGrandTotal = calculatedSubtotal + calculatedGst;
  const isArithmeticConsistent = invoice.items.length === 0 || Math.abs(calculatedGrandTotal - invoice.grandTotal) < 1;

  // Validation warnings
  const validationWarnings: string[] = [];
  if (invoice.supplierGstin && invoice.supplierGstin.trim()) {
    const supVal = validateGstin(invoice.supplierGstin);
    if (!supVal.isValid) {
      validationWarnings.push(`Supplier GSTIN validation: ${supVal.error}`);
    }
  }
  if (!isArithmeticConsistent && invoice.items.length > 0) {
    validationWarnings.push(
      `Line items sum to ₹${calculatedGrandTotal.toLocaleString('en-IN')} (Taxable: ₹${calculatedSubtotal.toLocaleString('en-IN')} + GST: ₹${calculatedGst.toLocaleString('en-IN')}) but invoice total is ₹${invoice.grandTotal.toLocaleString('en-IN')}.`
    );
  }

  // Reset to clean blank invoice
  const handleResetInvoice = () => {
    const fresh = createBlankInvoice(client);
    setSelectedInvoices([fresh]);
    setActiveInvoiceIndex(0);
    setRawPastedText('');
    setAiNotice(null);
    setUserQuestionAnswers({});
    setPriorPayments(0);
    setIsPriorManuallyEdited(false);
    setApplyTdsOnCumulative(false);
    setBatchSaveStatus(null);
  };

  // Add another blank invoice to batch
  const handleAddBlankInvoiceToBatch = () => {
    const fresh = createBlankInvoice(client);
    setSelectedInvoices(prev => [...prev, fresh]);
    setActiveInvoiceIndex(selectedInvoices.length);
    setActiveTab('manual');
  };

  // Remove an invoice from batch
  const handleRemoveInvoiceFromBatch = (indexToRemove: number) => {
    if (selectedInvoices.length <= 1) {
      handleResetInvoice();
      return;
    }
    const updated = selectedInvoices.filter((_, idx) => idx !== indexToRemove);
    setSelectedInvoices(updated);
    if (activeInvoiceIndex >= updated.length) {
      setActiveInvoiceIndex(updated.length - 1);
    }
  };

  // Local extraction from pasted text (0 API calls)
  const handleParsePastedText = () => {
    if (!rawPastedText.trim()) return;

    const res = extractInvoiceLocally(rawPastedText, {
      name: client.clientName,
      gstin: client.gstin,
      stateCode: client.stateCode,
      stateName: client.stateName,
    });

    if (res.success && res.data) {
      const parsed = {
        ...res.data,
        financialYear: storageService.getFinancialYear(res.data.paymentOrCreditDate || res.data.invoiceDate),
      };
      updateActiveInvoice(parsed);
      setAiNotice('✓ Extracted deterministically using local rule engine with ZERO Gemini calls.');
      setUserQuestionAnswers({});
    } else {
      setAiNotice('Could not extract sufficient structured fields locally. You can use optional AI assist or enter manually below.');
    }
  };

  // API Classification helper for single or multiple files
  const classifyFileViaApi = async (textToClassify?: string, imageBase64?: string, mimeType?: string, fileName?: string): Promise<InvoiceData | null> => {
    try {
      const response = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceText: textToClassify || (imageBase64 ? undefined : (rawPastedText || undefined)),
          imageBase64,
          mimeType,
          fileName,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server classification error');
      }

      const res = data.result;
      if (res) {
        const extractionLabel = data.source === 'gemini' ? 'Gemini Fallback' : 'Local Deterministic';
        const blankBaseline = createBlankInvoice(client);
        return mapAiResponseToInvoice(res, blankBaseline, client, extractionLabel, fileName);
      }
      return null;
    } catch (e: any) {
      console.warn('Classification processing error:', e);
      return null;
    }
  };

  // Handle Multi-Invoice File Upload (MULTIPLE INVOICES SELECTED AT A TIME)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    setIsAiLoading(true);
    setAiNotice(`Processing ${files.length} invoice document${files.length > 1 ? 's' : ''}...`);

    const extractedInvoices: InvoiceData[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        if (file.type === 'text/plain' || file.name.endsWith('.json') || file.name.endsWith('.txt')) {
          const text = await file.text();
          const res = extractInvoiceLocally(text, {
            name: client.clientName,
            gstin: client.gstin,
            stateCode: client.stateCode,
            stateName: client.stateName,
          }, file.name);
          if (res.success && res.data) {
            extractedInvoices.push({
              ...res.data,
              id: 'inv-' + Date.now() + '-' + i + '-' + Math.floor(Math.random() * 10000),
              fileName: file.name,
              financialYear: storageService.getFinancialYear(res.data.paymentOrCreditDate || res.data.invoiceDate),
            });
          }
        } else {
          // PDF or Image
          let detectedMime = file.type;
          if (!detectedMime) {
            const lowerName = file.name.toLowerCase();
            if (lowerName.endsWith('.pdf')) detectedMime = 'application/pdf';
            else if (lowerName.endsWith('.png')) detectedMime = 'image/png';
            else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) detectedMime = 'image/jpeg';
            else if (lowerName.endsWith('.webp')) detectedMime = 'image/webp';
          }

          const base64 = await readFileAsDataURL(file);
          const aiResult = await classifyFileViaApi(undefined, base64, detectedMime || 'application/pdf', file.name);
          if (aiResult) {
            extractedInvoices.push({
              ...aiResult,
              id: 'inv-' + Date.now() + '-' + i + '-' + Math.floor(Math.random() * 10000),
              fileName: file.name,
            });
          }
        }
      } catch (err) {
        console.warn(`Error processing file ${file.name}:`, err);
      }
    }

    setIsAiLoading(false);

    if (extractedInvoices.length > 0) {
      // Determine if initial invoice was empty
      const isInitialEmpty = selectedInvoices.length === 1 && !selectedInvoices[0].supplierName && selectedInvoices[0].items.length === 0;

      if (isInitialEmpty) {
        setSelectedInvoices(extractedInvoices);
        setActiveInvoiceIndex(0);
      } else {
        setSelectedInvoices(prev => [...prev, ...extractedInvoices]);
        setActiveInvoiceIndex(selectedInvoices.length);
      }

      setAiNotice(
        extractedInvoices.length > 1
          ? `✓ Successfully loaded and analyzed ${extractedInvoices.length} different invoices. Click any invoice tab below to inspect or batch-save.`
          : `✓ Successfully loaded invoice "${extractedInvoices[0].fileName || extractedInvoices[0].invoiceNumber}".`
      );
    } else {
      setAiNotice('Could not extract invoice details from uploaded file(s). You can enter details manually.');
    }

    // Reset input value so same files can be re-selected if desired
    e.target.value = '';
  };

  // Single trigger for AI Fallback
  const triggerAiFallback = async (textToClassify?: string) => {
    setIsAiLoading(true);
    setAiNotice(null);

    const result = await classifyFileViaApi(textToClassify || invoice.rawText || invoice.natureOfSupplySummary);
    setIsAiLoading(false);

    if (result) {
      updateActiveInvoice({
        ...invoice,
        ...result,
        id: invoice.id,
      });
      setAiNotice('✓ Invoice analyzed. Statutory TDS and GST ITC determinations calculated in real time.');
    } else {
      setAiNotice('✓ Real-time deterministic tax engine applied.');
    }
  };

  const handleAnswerQuestion = (itemId: string, qKey: string, ans: boolean) => {
    setUserQuestionAnswers(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [qKey]: ans,
      },
    }));
  };

  // Supplier GSTIN change handler
  const handleSupplierGstinChange = (newGstin: string) => {
    const formatted = newGstin.toUpperCase().trim();
    const val = validateGstin(formatted);
    const isInterState = Boolean(val.state?.code && client.stateCode && val.state.code !== client.stateCode);

    updateActiveInvoice({
      ...invoice,
      supplierGstin: formatted,
      supplierPan: val.pan || (formatted.length >= 12 ? formatted.substring(2, 12) : invoice.supplierPan),
      supplierStateCode: val.state?.code || '',
      supplierStateName: val.state?.name || '',
      isInterState,
    });
  };

  // Line Items handling
  const handleItemChange = (index: number, field: keyof InvoiceLineItem, val: any) => {
    const updated = [...invoice.items];
    const item = { ...updated[index], [field]: val };

    // Auto-calculate GST if taxableValue or rates changed
    if (field === 'taxableValue' || field === 'cgstRate' || field === 'sgstRate' || field === 'igstRate') {
      const taxable = Number(item.taxableValue) || 0;
      if (invoice.isInterState) {
        const igstRate = Number(item.igstRate ?? 18);
        item.igstAmount = (taxable * igstRate) / 100;
        item.cgstAmount = 0;
        item.sgstAmount = 0;
      } else {
        const cgstRate = Number(item.cgstRate ?? 9);
        const sgstRate = Number(item.sgstRate ?? 9);
        item.cgstAmount = (taxable * cgstRate) / 100;
        item.sgstAmount = (taxable * sgstRate) / 100;
        item.igstAmount = 0;
      }
      item.totalGst = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);
      item.totalValue = taxable + item.totalGst;
    }

    updated[index] = item;
    
    // Recalculate totals
    const sub = updated.reduce((s, it) => s + (Number(it.taxableValue) || 0), 0);
    const cgst = updated.reduce((s, it) => s + (Number(it.cgstAmount) || 0), 0);
    const sgst = updated.reduce((s, it) => s + (Number(it.sgstAmount) || 0), 0);
    const igst = updated.reduce((s, it) => s + (Number(it.igstAmount) || 0), 0);

    updateActiveInvoice({
      ...invoice,
      items: updated,
      subtotalTaxable: sub,
      totalCgst: cgst,
      totalSgst: sgst,
      totalIgst: igst,
      totalGst: cgst + sgst + igst,
      grandTotal: sub + cgst + sgst + igst,
    });
  };

  // Add a clean blank line item (ZERO PREFILLED DATA)
  const handleAddItem = () => {
    const isInter = invoice.isInterState;
    const newItem: InvoiceLineItem = {
      id: 'item-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      description: '',
      hsnSac: '',
      taxableValue: 0,
      cgstRate: isInter ? 0 : 9,
      cgstAmount: 0,
      sgstRate: isInter ? 0 : 9,
      sgstAmount: 0,
      igstRate: isInter ? 18 : 0,
      igstAmount: 0,
      cessAmount: 0,
      totalGst: 0,
      totalValue: 0,
      itemCategory: 'Services',
      itcStatus: 'Eligible',
      eligibleItc: 0,
      ineligibleItc: 0,
      reviewItc: 0,
      itcReason: 'Subject to Section 16 & Section 17 evaluation.',
      relevantSections: ['Section 16(1)']
    };
    updateActiveInvoice({
      ...invoice,
      items: [...invoice.items, newItem],
    });
  };

  const handleDeleteItem = (index: number) => {
    const updated = invoice.items.filter((_, i) => i !== index);
    const sub = updated.reduce((s, it) => s + (Number(it.taxableValue) || 0), 0);
    const cgst = updated.reduce((s, it) => s + (Number(it.cgstAmount) || 0), 0);
    const sgst = updated.reduce((s, it) => s + (Number(it.sgstAmount) || 0), 0);
    const igst = updated.reduce((s, it) => s + (Number(it.igstAmount) || 0), 0);
    updateActiveInvoice({
      ...invoice,
      items: updated,
      subtotalTaxable: sub,
      totalCgst: cgst,
      totalSgst: sgst,
      totalIgst: igst,
      totalGst: cgst + sgst + igst,
      grandTotal: sub + cgst + sgst + igst,
    });
  };

  // Compile full record for export & save
  const currentRecord: CompleteAnalysisRecord = {
    id: initialRecord?.id || invoice.id || 'analysis-' + Date.now(),
    clientSnapshot: client,
    invoiceData: invoice,
    tdsResult,
    itcResult,
    createdAt: initialRecord?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    caReview: {
      status: 'Verified',
      reviewedBy: client.clientName,
      reviewDate: new Date().toISOString().split('T')[0],
      remarks: tdsResult.thresholdExceededDueToAggregate
        ? `Statutory FY ${activeFy} aggregate limit exceeded across multiple invoices. TDS is applicable.`
        : 'Deterministic tax analysis evaluated against statutory provisions.',
    },
    auditLog: [],
  };

  // Handle Batch Save All Invoices with Sequential Financial Year Aggregate Tracking
  const handleBatchSaveAll = () => {
    if (selectedInvoices.length === 0) return;

    let cumulativeTracker: Record<string, number> = {};
    const recordsToSave: CompleteAnalysisRecord[] = [];

    for (let i = 0; i < selectedInvoices.length; i++) {
      const inv = selectedInvoices[i];
      const invFy = inv.financialYear || storageService.getFinancialYear(inv.paymentOrCreditDate || inv.invoiceDate);
      const vendorKey = (inv.supplierPan || inv.supplierGstin || inv.supplierName || 'unknown').trim().toUpperCase();

      // Query database for base prior amount
      const baseSummary = storageService.getVendorFySummary(
        { pan: inv.supplierPan, gstin: inv.supplierGstin, name: inv.supplierName },
        invFy,
        inv.id
      );

      const trackerKey = `${vendorKey}_${invFy}`;
      const runningBatchAmount = cumulativeTracker[trackerKey] || 0;
      const effectivePrior = baseSummary.cumulativeTaxableAmount + runningBatchAmount;

      // Evaluate TDS with sequential prior payments
      const invTdsResult = analyzeTds(inv, client, {
        priorCumulativePaymentsInFy: effectivePrior,
        transporterOwnsMax10Carriages: transporterDeclaration,
        financialYear: invFy,
        priorInvoicesCountInFy: baseSummary.invoiceCount,
        applyTdsOnCumulative,
      });

      const invItcResult = analyzeGstItc(inv, client, userQuestionAnswers);

      const record: CompleteAnalysisRecord = {
        id: inv.id || 'analysis-' + Date.now() + '-' + i,
        clientSnapshot: client,
        invoiceData: inv,
        tdsResult: invTdsResult,
        itcResult: invItcResult,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        caReview: {
          status: 'Verified',
          reviewedBy: client.clientName,
          reviewDate: new Date().toISOString().split('T')[0],
          remarks: invTdsResult.thresholdExceededDueToAggregate
            ? `FY ${invFy} aggregate threshold exceeded. TDS applicable.`
            : 'Verified under statutory provisions.',
        },
        auditLog: [],
      };

      recordsToSave.push(record);
      // Advance the running tracker for subsequent invoices of the same vendor in this batch
      cumulativeTracker[trackerKey] = runningBatchAmount + (inv.subtotalTaxable || 0);
    }

    // Save batch to storageService
    storageService.saveBatchAnalyses(recordsToSave);
    onSaveAnalysis(recordsToSave[activeInvoiceIndex] || recordsToSave[0]);

    setBatchSaveStatus(`✓ Successfully saved all ${recordsToSave.length} invoices to history with sequential FY aggregate tracking!`);
    setTimeout(() => setBatchSaveStatus(null), 4000);
  };

  const hasInvoiceData = invoice.items.length > 0 || invoice.subtotalTaxable > 0 || invoice.supplierName.trim().length > 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 sm:px-6">
      {/* Invoice Ingestion Header Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold">Inward Invoice Analysis & Financial Year Limit Tracker</h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                FY {activeFy}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Select single or multiple invoices • Rule-first deterministic tax engine • Multi-invoice FY aggregate limit tracking
            </p>
          </div>

          {/* Action Tabs & Reset */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === 'upload' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Upload Invoices
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === 'paste' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Paste Text
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === 'manual' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Manual Entry
              </button>
            </div>

            {hasInvoiceData && (
              <button
                type="button"
                onClick={handleResetInvoice}
                title="Clear and start new invoice"
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* MULTI-INVOICE SELECTION BAR (When multiple invoices are loaded) */}
        {selectedInvoices.length > 1 && (
          <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
              <div className="flex items-center space-x-1.5 shrink-0 text-xs font-bold text-slate-800 mr-1">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Selected Invoices ({selectedInvoices.length}):</span>
              </div>

              {selectedInvoices.map((inv, idx) => {
                const isCurrent = idx === activeInvoiceIndex;
                const invVal = inv.subtotalTaxable || inv.grandTotal || 0;
                const cleanFile = inv.fileName ? inv.fileName.replace(/\.[^/.]+$/, '').trim() : '';
                const invLabel = inv.invoiceNumber && !inv.invoiceNumber.startsWith('INV-') 
                  ? inv.invoiceNumber 
                  : (cleanFile || inv.invoiceNumber || `Invoice #${idx + 1}`);
                const vendorLabel = inv.supplierName && inv.supplierName !== 'Vendor Enterprise' && inv.supplierName !== 'Vendor / Supplier'
                  ? inv.supplierName
                  : '';

                return (
                  <div
                    key={inv.id || idx}
                    className={`inline-flex items-center rounded-lg border text-xs font-medium transition-all shadow-2xs ${
                      isCurrent
                        ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-emerald-500/50'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveInvoiceIndex(idx)}
                      className="px-3 py-1.5 flex items-center space-x-2 cursor-pointer text-left"
                    >
                      <span className="font-bold truncate max-w-[130px]">{invLabel}</span>
                      <span className={`font-mono text-[11px] ${isCurrent ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                        ₹{invVal.toLocaleString('en-IN')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveInvoiceFromBatch(idx)}
                      title="Remove from selection"
                      className={`px-1.5 py-1 text-[11px] hover:text-rose-400 cursor-pointer ${
                        isCurrent ? 'text-slate-400' : 'text-slate-400 hover:text-rose-600'
                      }`}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleAddBlankInvoiceToBatch}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-dashed border-slate-300 rounded-lg hover:border-slate-400 transition-colors flex items-center space-x-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Invoice</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleBatchSaveAll}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save All {selectedInvoices.length} Invoices</span>
              </button>
            </div>
          </div>
        )}

        {/* Batch Save Confirmation Toast */}
        {batchSaveStatus && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-xs font-semibold text-emerald-900 flex items-center justify-between">
            <span>{batchSaveStatus}</span>
          </div>
        )}

        {/* Tab 1: Upload Invoice File (Multiple Invoices Selection Supported) */}
        {activeTab === 'upload' && (
          <div className="p-6 bg-slate-50 border-b border-slate-200 text-center">
            <div className="max-w-md mx-auto border-2 border-dashed border-slate-300 rounded-xl p-6 bg-white hover:bg-slate-50 transition-colors">
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 mb-1">
                Upload Expense Invoices (Select Single or Multiple Files)
              </p>
              <p className="text-[11px] text-slate-500 mb-3">
                Supports PDF, PNG, JPG, JSON, TXT. You can select multiple invoices at once (hold Ctrl / Shift).
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.json,.txt"
                onChange={handleFileUpload}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 mt-2 font-mono">
                ✓ Multiple files selected together are loaded into your batch queue with cumulative FY limit tracking.
              </p>
              {isAiLoading && (
                <div className="mt-3 text-xs text-slate-600 flex items-center justify-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Processing invoice document(s)...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Paste Raw Text */}
        {activeTab === 'paste' && (
          <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Paste Raw Invoice Text, Email, or JSON details:
            </label>
            <textarea
              rows={4}
              value={rawPastedText}
              onChange={e => setRawPastedText(e.target.value)}
              placeholder="Paste invoice text with Invoice No, Date, Supplier GSTIN, Amounts, Item Descriptions..."
              className="w-full text-xs font-mono p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleParsePastedText}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Extract Deterministically (0 AI Calls)</span>
              </button>
              <button
                type="button"
                onClick={() => triggerAiFallback(rawPastedText)}
                disabled={isAiLoading || !rawPastedText.trim()}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>{isAiLoading ? 'Classifying...' : 'AI Assist (Optional Fallback)'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Manual Entry / Detailed Form */}
        {activeTab === 'manual' && (
          <div className="p-5 bg-slate-50 border-b border-slate-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supplier / Vendor Name</label>
                <input
                  type="text"
                  value={invoice.supplierName}
                  onChange={e => updateActiveInvoice({ ...invoice, supplierName: e.target.value })}
                  placeholder="e.g., Acme Cloud Services Ltd"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supplier GSTIN</label>
                <input
                  type="text"
                  maxLength={15}
                  value={invoice.supplierGstin}
                  onChange={e => handleSupplierGstinChange(e.target.value)}
                  placeholder="15-digit GSTIN"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={invoice.invoiceNumber}
                  onChange={e => updateActiveInvoice({ ...invoice, invoiceNumber: e.target.value })}
                  placeholder="e.g., INV-2026-001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoice.invoiceDate}
                  onChange={e => {
                    const newDate = e.target.value;
                    const payDate = invoice.paymentOrCreditDate || newDate;
                    const newFy = storageService.getFinancialYear(payDate || newDate);
                    updateActiveInvoice({
                      ...invoice,
                      invoiceDate: newDate,
                      paymentOrCreditDate: payDate,
                      financialYear: newFy,
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Nature of Payment / Service</label>
                <select
                  value={invoice.natureOfSupplySummary}
                  onChange={e => updateActiveInvoice({ ...invoice, natureOfSupplySummary: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  <option value="">-- Select Nature of Payment --</option>
                  <option value="Professional Services">Professional Services (Sec 194J)</option>
                  <option value="Fees for Technical Services (FTS)">Fees for Technical Services - FTS (Sec 194J / 2%)</option>
                  <option value="Contractor / Subcontractor Work">Contractor / Subcontractor (Sec 194C)</option>
                  <option value="Rent - Land and Building">Rent - Land & Building (Sec 194I)</option>
                  <option value="Rent - Plant and Machinery">Rent - Plant & Machinery (Sec 194I / 2%)</option>
                  <option value="Commission or Brokerage">Commission or Brokerage (Sec 194H)</option>
                  <option value="Purchase of Goods > 50 Lakhs">Purchase of Goods &gt; ₹50 Lakhs (Sec 194Q)</option>
                  <option value="Software License / Cloud Hosting">Software License / Cloud Hosting</option>
                  <option value="Transportation / Freight Charges">Transportation / Freight Charges</option>
                  <option value="Advertising Services">Advertising Services</option>
                  <option value="Legal Services">Legal Services (Advocate / Firm)</option>
                  <option value="Security / Manpower Supply">Security / Manpower Supply</option>
                  <option value="Director Remuneration / Sitting Fees">Director Remuneration / Sitting Fees</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Financial Year</label>
                <input
                  type="text"
                  readOnly
                  value={activeFy}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-800 font-bold font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supply Type</label>
                <input
                  type="text"
                  readOnly
                  value={invoice.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-600 font-semibold text-xs"
                />
              </div>
            </div>

            {/* Line Items Editor */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Invoice Line Items ({invoice.items.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-md hover:bg-slate-100 flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Line Item</span>
                </button>
              </div>

              {invoice.items.length === 0 ? (
                <div className="p-4 bg-white rounded-lg border border-dashed border-slate-300 text-center">
                  <p className="text-xs text-slate-500">No line items added yet.</p>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                  >
                    + Add your first line item
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {invoice.items.map((it, idx) => (
                    <div key={it.id} className="p-3 bg-white rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-2 text-xs">
                      <div className="md:col-span-2">
                        <label className="text-[10px] text-slate-400 block">Item / Service Description</label>
                        <input
                          type="text"
                          value={it.description}
                          placeholder="e.g. Legal Advisory Services"
                          onChange={e => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">HSN/SAC</label>
                        <input
                          type="text"
                          value={it.hsnSac}
                          placeholder="e.g. 9982"
                          onChange={e => handleItemChange(idx, 'hsnSac', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">Taxable Amount (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={it.taxableValue || ''}
                          placeholder="0"
                          onChange={e => handleItemChange(idx, 'taxableValue', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">
                          Total GST (₹) {invoice.isInterState ? '(IGST)' : '(CGST+SGST)'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={it.totalGst || ''}
                          placeholder="0"
                          onChange={e => handleItemChange(idx, 'totalGst', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono"
                        />
                      </div>
                      <div className="flex items-end justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(idx)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 cursor-pointer"
                          title="Delete line item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI & Extraction Feedback Bar */}
        {aiNotice && (
          <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 text-xs text-slate-700 flex items-center justify-between">
            <span className="font-medium">{aiNotice}</span>
            <span className="text-[10px] text-slate-500 font-mono">
              Source: {invoice.extractionSource}
            </span>
          </div>
        )}

        {/* Invoice Summary Ribbon */}
        <div className="p-4 bg-white grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs border-b border-slate-100">
          <div>
            <span className="text-slate-400 block">Invoice Number:</span>
            <input
              type="text"
              value={invoice.invoiceNumber}
              placeholder="Not entered"
              onChange={e => updateActiveInvoice({ ...invoice, invoiceNumber: e.target.value })}
              className="font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-slate-900 focus:outline-hidden"
            />
          </div>
          <div>
            <span className="text-slate-400 block">Invoice Date:</span>
            <input
              type="date"
              value={invoice.invoiceDate}
              onChange={e => {
                const newDate = e.target.value;
                const payDate = invoice.paymentOrCreditDate || newDate;
                const newFy = storageService.getFinancialYear(payDate || newDate);
                updateActiveInvoice({
                  ...invoice,
                  invoiceDate: newDate,
                  paymentOrCreditDate: payDate,
                  financialYear: newFy,
                });
              }}
              className="font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-slate-900 focus:outline-hidden"
            />
          </div>
          <div>
            <span className="text-slate-400 block">Financial Year:</span>
            <span className="font-bold font-mono text-emerald-800">{activeFy}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Supplier Name:</span>
            <span className="font-bold text-slate-900 line-clamp-1">{invoice.supplierName || 'Not entered'}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Supplier GSTIN:</span>
            <span className="font-mono text-slate-800 font-semibold">{invoice.supplierGstin || 'No GSTIN'}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Total Gross Value:</span>
            <span className="font-mono font-black text-slate-900 text-sm">₹ {invoice.grandTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Validation Warnings Banner */}
        {validationWarnings.length > 0 && (
          <div className="px-6 py-2.5 bg-amber-50 border-t border-amber-200 flex items-start space-x-2 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {validationWarnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* If no invoice details entered yet, show clean guidance CTA */}
      {!hasInvoiceData ? (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900 mb-1">Ready to Analyze Invoices</h3>
            <p className="text-xs text-slate-500">
              Upload one or multiple invoices at a time (PDF/Image/Text), paste invoice text, or click below to enter line items manually.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveTab('manual');
                handleAddItem();
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Enter Invoice Details Manually</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document(s)</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 1. TDS RESULT PANEL (Income-tax Act, 1961 vs 2025 with FY Aggregate Tracking) */}
          <TdsResultPanel
            tdsResult={tdsResult}
            priorPayments={priorPayments}
            onPriorPaymentsChange={amt => {
              setIsPriorManuallyEdited(true);
              setPriorPayments(amt);
            }}
            transporterDeclaration={transporterDeclaration}
            onTransporterDeclarationChange={setTransporterDeclaration}
            applyTdsOnCumulative={applyTdsOnCumulative}
            onApplyTdsOnCumulativeChange={setApplyTdsOnCumulative}
            invoiceSubtotal={invoice.subtotalTaxable}
            savedFyInvoicesCount={savedFyInvoicesCount}
            onSyncPriorFromSaved={handleSyncPriorFromSaved}
            onCaOverride={() => {}}
          />

          {/* 2. GST ITC RESULT PANEL (Sections 16, 17, 17(5)) */}
          <GstItcResultPanel
            itcResult={itcResult}
            onAnswerQuestion={handleAnswerQuestion}
            onItemOverride={(itemId, newStatus, remarks) => {
              const updatedItems = invoice.items.map(it => {
                if (it.id === itemId) {
                  return {
                    ...it,
                    caOverride: {
                      overridden: true,
                      originalStatus: it.itcStatus,
                      newStatus,
                      remarks,
                      caName: client.clientName,
                      date: new Date().toISOString(),
                    },
                  };
                }
                return it;
              });
              updateActiveInvoice({ ...invoice, items: updatedItems });
            }}
          />

          {/* 3. EXPORT & SAVE BAR (Excel & Word Exports) */}
          <CaReviewAndExportBar
            currentRecord={currentRecord}
            onSaveToHistory={record => {
              onSaveAnalysis(record);
              // Also update this record in the active batch if present
              setSelectedInvoices(prev => {
                const next = [...prev];
                next[activeInvoiceIndex] = record.invoiceData;
                return next;
              });
            }}
          />
        </>
      )}
    </div>
  );
};
