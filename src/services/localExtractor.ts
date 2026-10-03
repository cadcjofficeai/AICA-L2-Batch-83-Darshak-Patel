import { InvoiceData, InvoiceLineItem } from '../types/tax';
import { validateGstin, GST_STATE_MASTER } from '../data/gstStateMaster';

function cleanCurrency(str: string): number {
  if (!str) return 0;
  // Strip font-substituted rupee 'n' or '₹' or 'Rs' or commas
  const cleaned = str.replace(/[n₹\s,]|rs\.?/gi, '').trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function parseFlexibleDate(str: string): string {
  try {
    const trimmed = str.trim();
    // Month names (e.g. 15 Sep 2026 or 15-September-2026)
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const monthWordMatch = trimmed.match(/^(\d{1,2})[\s,.-]+([a-zA-Z]{3,9})[\s,.-]+(\d{2,4})$/);
    if (monthWordMatch) {
      const day = monthWordMatch[1].padStart(2, '0');
      const mStr = monthWordMatch[2].toLowerCase().slice(0, 3);
      const month = monthMap[mStr] || '01';
      const rawYear = monthWordMatch[3];
      const year = rawYear.length === 2 ? '20' + rawYear : rawYear;
      return `${year}-${month}-${day}`;
    }

    const parts = trimmed.split(/[-\/.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        // DD-MM-YYYY
        const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
        return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  } catch {
    // fallback
  }
  return new Date().toISOString().split('T')[0];
}

function getFinancialYear(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '2026-27';
  const month = d.getMonth() + 1; // 1-12
  const year = d.getFullYear();
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}

/**
 * Local Deterministic Invoice Extractor
 * Robust multi-format parsing for Indian Tax Invoices (PDF streams, text, and JSON).
 * Handles multi-line key-value headers, line items tables, and font-substituted rupee symbols.
 */
export function extractInvoiceLocally(
  rawText: string,
  defaultRecipient?: { name: string; gstin: string; stateCode: string; stateName: string },
  fileName?: string
): {
  success: boolean;
  data?: InvoiceData;
  error?: string;
  isAmbiguous?: boolean;
} {
  if (!rawText || rawText.trim().length === 0) {
    return { success: false, error: 'Empty invoice text' };
  }

  const text = rawText.trim();

  // Try JSON parse first (if user imported structured data or JSON invoice)
  try {
    if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
      const parsed = JSON.parse(text);
      const jsonTarget = Array.isArray(parsed) ? parsed[0] : parsed;
      if (jsonTarget && (jsonTarget.invoiceNumber || jsonTarget.invoice_number || jsonTarget.supplier || jsonTarget.taxable_value !== undefined)) {
        return {
          success: true,
          data: normalizeParsedJsonInvoice(jsonTarget, defaultRecipient, fileName),
        };
      }
    }
  } catch {
    // continue to text parsing
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let supplierName = '';
  let invoiceNumber = '';
  let invoiceDate = new Date().toISOString().split('T')[0];
  let supplierGstin = '';
  let recipientName = defaultRecipient?.name || '';
  let recipientGstin = defaultRecipient?.gstin || '';
  let placeOfSupply = defaultRecipient?.stateName || '';
  let subtotalTaxable = 0;
  let totalGst = 0;
  let grandTotal = 0;
  const items: InvoiceLineItem[] = [];

  // 1. Supplier Name: usually top non-title line
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (!/^(tax\s*invoice|bill\s*of\s*supply|invoice\s*for\s*media|invoice|bill)/i.test(lines[i])) {
      supplierName = lines[i];
      break;
    }
  }

  // 2. Multi-line & Single-line Key-Value Header Scanning
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Invoice Number
    if (!invoiceNumber) {
      if (/^invoice\s*(?:no|num|number|#)\.?$/i.test(line) && i + 1 < lines.length) {
        const candidate = lines[i + 1].trim();
        if (!/^(invoice\s*date|dated|date|supplier|gstin)$/i.test(candidate)) {
          invoiceNumber = candidate;
        }
      } else {
        const m = line.match(/(?:tax\s*invoice\s*(?:no|num|number|#)?|invoice\s*(?:no|num|number|#)?|bill\s*(?:no|number|#)?|inv\s*(?:no|#)?|doc\s*no|ref\s*no)[ \t:.-]+([a-zA-Z0-9_\-\/]{2,35})/i);
        if (m && !/^(no|num|number|date|dated|gstin|pan|total|amount|rs|inr|is|this)$/i.test(m[1].trim())) {
          invoiceNumber = m[1].trim();
        }
      }
    }

    // Invoice Date
    if (/^invoice\s*date$/i.test(line) && i + 1 < lines.length) {
      const candidate = lines[i + 1].trim();
      const p = parseFlexibleDate(candidate);
      if (p) invoiceDate = p;
    } else {
      const dm = line.match(/(?:invoice\s*date|dated|bill\s*date|date\s*of\s*issue|date)[ \t:]+(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/i);
      if (dm && dm[1]) {
        invoiceDate = parseFlexibleDate(dm[1]);
      }
    }

    // Supplier GSTIN
    if (!supplierGstin) {
      if (/^supplier\s*gstin$/i.test(line) && i + 1 < lines.length) {
        const cand = lines[i + 1].trim().toUpperCase();
        if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cand)) {
          supplierGstin = cand;
        }
      } else {
        const gm = line.match(/(?:supplier|seller|vendor|from|billed\s*by)[\s\S]{0,30}?gstin[\s:.-]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i);
        if (gm) supplierGstin = gm[1].toUpperCase();
      }
    }

    // Bill To / Recipient Name
    if (/^bill\s*to$/i.test(line) && i + 1 < lines.length) {
      recipientName = lines[i + 1].trim();
    }

    // Recipient GSTIN
    if (/(?:bill\s*to|recipient|buyer|customer|client)[\s\S]{0,30}?gstin[\s:.-]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i.test(line)) {
      recipientGstin = line.match(/gstin[\s:.-]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i)![1].toUpperCase();
    } else if (/gstin[:\s]+([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i.test(line)) {
      const g = line.match(/gstin[:\s]+([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i)![1].toUpperCase();
      if (g !== supplierGstin && !recipientGstin) {
        recipientGstin = g;
      }
    }

    // Place of Supply
    if (/^place\s*of\s*supply$/i.test(line) && i + 1 < lines.length) {
      placeOfSupply = lines[i + 1].trim();
    }
  }

  // 3. Tabular Line Items Parsing
  // Format: # Description HSN/SAC Qty Rate Taxable Value GST
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const itemMatch = line.match(/^(\d+)\s+(.+?)(?:(?:\s+|\b)([0-9]{6,8}))?\s+(\d+)\s+[n₹]?([0-9,]+(?:\.[0-9]{2})?)\s+[n₹]?([0-9,]+(?:\.[0-9]{2})?)\s+([0-9.]+%)\s*=\s*[n₹]?([0-9,]+(?:\.[0-9]{2})?)/i);
    if (itemMatch) {
      const lineNum = itemMatch[1];
      let desc = itemMatch[2].trim();
      let hsn = itemMatch[3] || '';

      // Separate stuck HSN/SAC codes from description
      // e.g. "Professional consultancy services – September 2026998311" -> SAC: 998311
      const stuckMatch = desc.match(/(?:[0-9]{4})?(99\d{4}|\d{8})$/);
      if (stuckMatch) {
        const foundCode = stuckMatch[1];
        if (!hsn || hsn.length < 6) {
          hsn = foundCode;
        }
        desc = desc.slice(0, -foundCode.length).trim();
      }

      const qty = parseInt(itemMatch[4], 10) || 1;
      const rate = cleanCurrency(itemMatch[5]);
      const taxable = cleanCurrency(itemMatch[6]);
      const gstRate = parseFloat(itemMatch[7]) || 18;
      const gstAmt = cleanCurrency(itemMatch[8]);

      items.push({
        id: `item-${lineNum}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        description: desc,
        hsnSac: hsn || '998313',
        quantity: qty,
        unitPrice: rate,
        taxableValue: taxable,
        cgstRate: gstRate / 2,
        cgstAmount: gstAmt / 2,
        sgstRate: gstRate / 2,
        sgstAmount: gstAmt / 2,
        igstRate: 0,
        igstAmount: 0,
        cessAmount: 0,
        totalGst: gstAmt,
        totalValue: taxable + gstAmt,
        itemCategory: (hsn && hsn.length >= 4 && !hsn.startsWith('99') && !hsn.startsWith('00')) || /laptop|chair|table|car|electronic|goods|hardware|vehicle|computer|desk|material|steel|coil/i.test(desc) ? 'Goods' : 'Services',
        itcStatus: 'Eligible',
        eligibleItc: gstAmt,
        ineligibleItc: 0,
        reviewItc: 0,
        itcReason: 'Evaluated under Section 16(1) in the course or furtherance of business.',
        relevantSections: ['Section 16(1)'],
      });
    }
  }

  // 4. Subtotal and Grand Total Parsing from bottom summary lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const subGstMatch = line.match(/^[n₹]?([0-9,]+(?:\.[0-9]{2})?)\s+[n₹]?([0-9,]+(?:\.[0-9]{2})?)$/);
    if (subGstMatch) {
      const v1 = cleanCurrency(subGstMatch[1]);
      const v2 = cleanCurrency(subGstMatch[2]);
      if (v1 > 0 && v2 > 0) {
        subtotalTaxable = v1;
        totalGst = v2;
        if (i + 1 < lines.length) {
          const grandMatch = lines[i + 1].match(/^[n₹]?([0-9,]+(?:\.[0-9]{2})?)$/);
          if (grandMatch) {
            grandTotal = cleanCurrency(grandMatch[1]);
          }
        }
      }
    }
  }

  // Fallback single-line amount patterns if bottom summary line wasn't present
  if (subtotalTaxable === 0) {
    const subMatch = text.match(/(?:taxable\s*(?:value|amount|val)|sub\s*total|subtotal|base\s*(?:amount|value)|total\s*before\s*tax|assessable\s*value)[ \t:n₹rs.]*([0-9,]+(?:\.[0-9]{2})?)/i);
    if (subMatch) subtotalTaxable = cleanCurrency(subMatch[1]);
  }

  if (totalGst === 0) {
    const gstMatch = text.match(/(?:total\s*gst|gst\s*amount|total\s*tax)[ \t:n₹rs.]*([0-9,]+(?:\.[0-9]{2})?)/i);
    if (gstMatch) totalGst = cleanCurrency(gstMatch[1]);
  }

  if (grandTotal === 0) {
    const grandMatch = text.match(/(?:grand\s*total|invoice\s*total|total\s*(?:amount|value|payable)|net\s*(?:amount|payable))[ \t:n₹rs.]*([0-9,]+(?:\.[0-9]{2})?)/i);
    if (grandMatch) grandTotal = cleanCurrency(grandMatch[1]);
  }

  // Derive amounts from items if items exist
  if (items.length > 0) {
    if (subtotalTaxable === 0) {
      subtotalTaxable = items.reduce((s, it) => s + it.taxableValue, 0);
    }
    if (totalGst === 0) {
      totalGst = items.reduce((s, it) => s + it.totalGst, 0);
    }
    if (grandTotal === 0) {
      grandTotal = subtotalTaxable + totalGst;
    }
  } else {
    // If no table lines matched, synthesize 1 item from subtotal
    const descMatch = text.match(/(?:description|particulars|service|item)[:\s]+([a-zA-Z0-9\s.,&'()-]{4,80})/i);
    const mainDesc = descMatch ? descMatch[1].trim().split('\n')[0] : (supplierName ? `Commercial Supply from ${supplierName}` : 'Commercial Business Supply');

    items.push({
      id: `item-1-${Date.now()}`,
      description: mainDesc,
      hsnSac: '998313',
      quantity: 1,
      unitPrice: subtotalTaxable,
      taxableValue: subtotalTaxable,
      cgstRate: 9,
      cgstAmount: totalGst / 2,
      sgstRate: 9,
      sgstAmount: totalGst / 2,
      igstRate: 0,
      igstAmount: 0,
      cessAmount: 0,
      totalGst: totalGst,
      totalValue: grandTotal || (subtotalTaxable + totalGst),
      itemCategory: /laptop|chair|table|car|electronic|goods|hardware|vehicle|computer|desk|material|steel|coil/i.test(mainDesc) ? 'Goods' : 'Services',
      itcStatus: 'Eligible',
      eligibleItc: totalGst,
      ineligibleItc: 0,
      reviewItc: 0,
      itcReason: 'Evaluated under Section 16(1) in the course or furtherance of business.',
      relevantSections: ['Section 16(1)'],
    });
  }

  // Fallback for invoice number and supplier name if still missing
  if (!invoiceNumber && fileName) {
    invoiceNumber = fileName.replace(/\.[^/.]+$/, '').trim();
  }
  if (!invoiceNumber) {
    invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
  }

  if (!supplierName && fileName) {
    supplierName = fileName.replace(/\.[^/.]+$/, '').replace(/[_0-9]/g, ' ').trim();
  }
  if (!supplierName) {
    supplierName = 'Vendor / Supplier';
  }

  // Derive State Codes & Names
  const supVal = validateGstin(supplierGstin);
  const recVal = validateGstin(recipientGstin);

  const supplierStateCode = supVal.state?.code || (supplierGstin.length >= 2 ? supplierGstin.slice(0, 2) : '24');
  const supplierStateName = supVal.state?.name || placeOfSupply || 'Gujarat';
  const supplierPan = supVal.pan || (supplierGstin.length >= 12 ? supplierGstin.substring(2, 12) : '');

  const recipientStateCode = recVal.state?.code || defaultRecipient?.stateCode || '24';
  const recipientStateName = recVal.state?.name || defaultRecipient?.stateName || placeOfSupply || 'Gujarat';
  const recipientPan = recVal.pan || defaultRecipient?.gstin?.substring(2, 12) || '';

  const isInterState = Boolean(supplierStateCode) && Boolean(recipientStateCode) && supplierStateCode !== recipientStateCode;

  // Split GST between CGST/SGST or IGST
  const totalCgst = isInterState ? 0 : totalGst / 2;
  const totalSgst = isInterState ? 0 : totalGst / 2;
  const totalIgst = isInterState ? totalGst : 0;

  // Sync line item GST rates and amounts
  items.forEach(it => {
    if (isInterState) {
      it.igstAmount = it.totalGst;
      it.cgstAmount = 0;
      it.sgstAmount = 0;
      it.igstRate = it.cgstRate + it.sgstRate || 18;
      it.cgstRate = 0;
      it.sgstRate = 0;
    } else {
      it.igstAmount = 0;
      it.cgstAmount = it.totalGst / 2;
      it.sgstAmount = it.totalGst / 2;
      it.cgstRate = 9;
      it.sgstRate = 9;
      it.igstRate = 0;
    }
  });

  const natureSummary = items.map(it => it.description).join('; ');

  const invoiceData: InvoiceData = {
    id: 'inv-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
    invoiceNumber,
    invoiceDate,
    paymentOrCreditDate: invoiceDate,
    financialYear: getFinancialYear(invoiceDate),
    supplierName,
    supplierGstin,
    supplierPan,
    supplierStateCode,
    supplierStateName,
    supplierType: supplierPan.charAt(3) === 'P' ? 'Individual / HUF' : 'Company / Firm',
    supplierResidentStatus: 'Resident',
    recipientName: recipientName || defaultRecipient?.name || 'Demo Manufacturing Pvt. Ltd.',
    recipientGstin: recipientGstin || defaultRecipient?.gstin || '',
    recipientPan,
    recipientStateCode,
    recipientStateName,
    placeOfSupplyStateCode: recipientStateCode,
    placeOfSupplyStateName: recipientStateName,
    isInterState,
    reverseChargeApplicable: false,
    items,
    subtotalTaxable,
    totalCgst,
    totalSgst,
    totalIgst,
    totalCess: 0,
    totalGst,
    grandTotal: grandTotal || (subtotalTaxable + totalGst),
    natureOfSupplySummary: natureSummary,
    rawText: text,
    fileName: fileName || '',
    extractionSource: 'Local Deterministic',
  };

  return {
    success: true,
    data: invoiceData,
    isAmbiguous: !supplierGstin || subtotalTaxable <= 0,
  };
}

function normalizeParsedJsonInvoice(json: any, defaultRecipient?: any, fileName?: string): InvoiceData {
  const cleanFile = fileName ? fileName.replace(/\.[^/.]+$/, '').trim() : '';
  const invoiceNumber = json.invoiceNumber || json.invoice_number || cleanFile || 'INV-001';
  const invoiceDate = json.invoiceDate || json.invoice_date || new Date().toISOString().split('T')[0];
  const supplierGstin = (json.supplierGstin || json.supplier_gstin || '').toUpperCase();
  const supVal = validateGstin(supplierGstin);

  const items: InvoiceLineItem[] = (json.items || []).map((it: any, i: number) => {
    const taxVal = Number(it.taxableValue || it.taxable_value || it.amount || 0);
    const cgst = Number(it.cgstAmount || it.cgst_amount || 0);
    const sgst = Number(it.sgstAmount || it.sgst_amount || 0);
    const igst = Number(it.igstAmount || it.igst_amount || 0);
    const totGst = cgst + sgst + igst;
    return {
      id: 'item-' + i + '-' + Date.now(),
      description: it.description || cleanFile || 'Line Item',
      hsnSac: it.hsnSac || it.hsn_sac || '998313',
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice || taxVal,
      taxableValue: taxVal,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      cessAmount: 0,
      totalGst: totGst,
      totalValue: taxVal + totGst,
      itcStatus: 'Eligible',
      eligibleItc: totGst,
      ineligibleItc: 0,
      reviewItc: 0,
      itcReason: 'Section 16(1) course or furtherance of business.',
      relevantSections: ['Section 16(1)'],
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.taxableValue, 0) || Number(json.taxableValue || json.taxable_value || 0);
  const totalCgst = items.reduce((sum, item) => sum + item.cgstAmount, 0) || Number(json.totalCgst || json.cgst_amount || 0);
  const totalSgst = items.reduce((sum, item) => sum + item.sgstAmount, 0) || Number(json.totalSgst || json.sgst_amount || 0);
  const totalIgst = items.reduce((sum, item) => sum + item.igstAmount, 0) || Number(json.totalIgst || json.igst_amount || 0);
  const grandTotal = Number(json.grandTotal || json.total_amount) || (subtotal + totalCgst + totalSgst + totalIgst);

  return {
    id: 'inv-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
    invoiceNumber,
    invoiceDate,
    paymentOrCreditDate: json.paymentOrCreditDate || invoiceDate,
    financialYear: getFinancialYear(invoiceDate),
    supplierName: json.supplierName || json.supplier_name || json.supplier || cleanFile || 'Vendor Enterprise',
    supplierGstin,
    supplierPan: supVal.pan || (supplierGstin.length >= 12 ? supplierGstin.substring(2, 12) : ''),
    supplierStateCode: supVal.state?.code || '24',
    supplierStateName: supVal.state?.name || 'Gujarat',
    supplierType: 'Company / Firm',
    supplierResidentStatus: 'Resident',
    recipientName: defaultRecipient?.name || json.recipientName || 'Client Enterprise',
    recipientGstin: defaultRecipient?.gstin || json.recipientGstin || '',
    recipientPan: defaultRecipient?.gstin ? defaultRecipient.gstin.substring(2, 12) : '',
    recipientStateCode: defaultRecipient?.stateCode || '24',
    recipientStateName: defaultRecipient?.stateName || 'Gujarat',
    placeOfSupplyStateCode: defaultRecipient?.stateCode || '24',
    placeOfSupplyStateName: defaultRecipient?.stateName || 'Gujarat',
    isInterState: totalIgst > 0,
    reverseChargeApplicable: Boolean(json.reverseChargeApplicable),
    items: items.length > 0 ? items : [{
      id: 'item-1',
      description: cleanFile || 'Professional Services',
      hsnSac: '998313',
      taxableValue: subtotal,
      cgstAmount: totalCgst,
      sgstAmount: totalSgst,
      igstAmount: totalIgst,
      cessAmount: 0,
      totalGst: totalCgst + totalSgst + totalIgst,
      totalValue: grandTotal,
      itcStatus: 'Eligible',
      eligibleItc: totalCgst + totalSgst + totalIgst,
      ineligibleItc: 0,
      reviewItc: 0,
      itcReason: 'Section 16(1) course or furtherance of business.',
      relevantSections: ['Section 16(1)'],
    }],
    subtotalTaxable: subtotal,
    totalCgst,
    totalSgst,
    totalIgst,
    totalCess: 0,
    totalGst: totalCgst + totalSgst + totalIgst,
    grandTotal,
    natureOfSupplySummary: json.natureOfSupplySummary || json.tds_nature || cleanFile || 'Commercial Business Supply',
    fileName: fileName || '',
    extractionSource: 'Local Deterministic',
  };
}
