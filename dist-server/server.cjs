var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.prod.ts
var server_prod_exports = {};
__export(server_prod_exports, {
  createExpressApp: () => createExpressApp,
  extractInvoiceLocally: () => extractInvoiceLocally,
  startServer: () => startServer
});
module.exports = __toCommonJS(server_prod_exports);
var import_express = __toESM(require("express"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_genai = require("@google/genai");
var import_pdf_parse = require("pdf-parse");

// src/data/gstStateMaster.ts
var GST_STATE_MASTER = {
  "01": { code: "01", name: "Jammu and Kashmir", isUnionTerritory: true },
  "02": { code: "02", name: "Himachal Pradesh", isUnionTerritory: false },
  "03": { code: "03", name: "Punjab", isUnionTerritory: false },
  "04": { code: "04", name: "Chandigarh", isUnionTerritory: true },
  "05": { code: "05", name: "Uttarakhand", isUnionTerritory: false },
  "06": { code: "06", name: "Haryana", isUnionTerritory: false },
  "07": { code: "07", name: "Delhi", isUnionTerritory: true },
  "08": { code: "08", name: "Rajasthan", isUnionTerritory: false },
  "09": { code: "09", name: "Uttar Pradesh", isUnionTerritory: false },
  "10": { code: "10", name: "Bihar", isUnionTerritory: false },
  "11": { code: "11", name: "Sikkim", isUnionTerritory: false },
  "12": { code: "12", name: "Arunachal Pradesh", isUnionTerritory: false },
  "13": { code: "13", name: "Nagaland", isUnionTerritory: false },
  "14": { code: "14", name: "Manipur", isUnionTerritory: false },
  "15": { code: "15", name: "Mizoram", isUnionTerritory: false },
  "16": { code: "16", name: "Tripura", isUnionTerritory: false },
  "17": { code: "17", name: "Meghalaya", isUnionTerritory: false },
  "18": { code: "18", name: "Assam", isUnionTerritory: false },
  "19": { code: "19", name: "West Bengal", isUnionTerritory: false },
  "20": { code: "20", name: "Jharkhand", isUnionTerritory: false },
  "21": { code: "21", name: "Odisha", isUnionTerritory: false },
  "22": { code: "22", name: "Chhattisgarh", isUnionTerritory: false },
  "23": { code: "23", name: "Madhya Pradesh", isUnionTerritory: false },
  "24": { code: "24", name: "Gujarat", isUnionTerritory: false },
  "25": { code: "25", name: "Daman and Diu (Pre-Merger)", isUnionTerritory: true },
  "26": { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu", isUnionTerritory: true },
  "27": { code: "27", name: "Maharashtra", isUnionTerritory: false },
  "28": { code: "28", name: "Andhra Pradesh (Old)", isUnionTerritory: false },
  "29": { code: "29", name: "Karnataka", isUnionTerritory: false },
  "30": { code: "30", name: "Goa", isUnionTerritory: false },
  "31": { code: "31", name: "Lakshadweep", isUnionTerritory: true },
  "32": { code: "32", name: "Kerala", isUnionTerritory: false },
  "33": { code: "33", name: "Tamil Nadu", isUnionTerritory: false },
  "34": { code: "34", name: "Puducherry", isUnionTerritory: true },
  "35": { code: "35", name: "Andaman and Nicobar Islands", isUnionTerritory: true },
  "36": { code: "36", name: "Telangana", isUnionTerritory: false },
  "37": { code: "37", name: "Andhra Pradesh (New)", isUnionTerritory: false },
  "38": { code: "38", name: "Ladakh", isUnionTerritory: true },
  "97": { code: "97", name: "Other Territory", isUnionTerritory: true },
  "99": { code: "99", name: "Centre Jurisdiction", isUnionTerritory: false }
};
var GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
function validateGstin(gstin) {
  if (!gstin) {
    return { isValid: false, error: "GSTIN cannot be empty" };
  }
  const clean = gstin.trim().toUpperCase();
  if (clean.length !== 15) {
    return { isValid: false, error: `GSTIN must be 15 characters (currently ${clean.length})` };
  }
  if (!GSTIN_REGEX.test(clean)) {
    return { isValid: false, error: "Invalid GSTIN structure. Expected format: 24ABCDE1234F1Z5" };
  }
  const stateCode = clean.substring(0, 2);
  const state = GST_STATE_MASTER[stateCode];
  if (!state) {
    return { isValid: false, error: `Invalid GST state code '${stateCode}' in GSTIN` };
  }
  const pan = clean.substring(2, 12);
  return { isValid: true, state, pan };
}

// src/services/localExtractor.ts
function cleanCurrency(str) {
  if (!str) return 0;
  const cleaned = str.replace(/[n₹\s,]|rs\.?/gi, "").trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}
function parseFlexibleDate(str) {
  try {
    const trimmed = str.trim();
    const monthMap = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12"
    };
    const monthWordMatch = trimmed.match(/^(\d{1,2})[\s,.-]+([a-zA-Z]{3,9})[\s,.-]+(\d{2,4})$/);
    if (monthWordMatch) {
      const day = monthWordMatch[1].padStart(2, "0");
      const mStr = monthWordMatch[2].toLowerCase().slice(0, 3);
      const month = monthMap[mStr] || "01";
      const rawYear = monthWordMatch[3];
      const year = rawYear.length === 2 ? "20" + rawYear : rawYear;
      return `${year}-${month}-${day}`;
    }
    const parts = trimmed.split(/[-\/.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      } else {
        const year = parts[2].length === 2 ? "20" + parts[2] : parts[2];
        return `${year}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }
  } catch {
  }
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
function getFinancialYear(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "2026-27";
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}
function extractInvoiceLocally(rawText, defaultRecipient, fileName) {
  if (!rawText || rawText.trim().length === 0) {
    return { success: false, error: "Empty invoice text" };
  }
  const text = rawText.trim();
  try {
    if (text.startsWith("{") && text.endsWith("}") || text.startsWith("[") && text.endsWith("]")) {
      const parsed = JSON.parse(text);
      const jsonTarget = Array.isArray(parsed) ? parsed[0] : parsed;
      if (jsonTarget && (jsonTarget.invoiceNumber || jsonTarget.invoice_number || jsonTarget.supplier || jsonTarget.taxable_value !== void 0)) {
        return {
          success: true,
          data: normalizeParsedJsonInvoice(jsonTarget, defaultRecipient, fileName)
        };
      }
    }
  } catch {
  }
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let supplierName = "";
  let invoiceNumber = "";
  let invoiceDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  let supplierGstin = "";
  let recipientName = defaultRecipient?.name || "";
  let recipientGstin = defaultRecipient?.gstin || "";
  let placeOfSupply = defaultRecipient?.stateName || "";
  let subtotalTaxable = 0;
  let totalGst = 0;
  let grandTotal = 0;
  const items = [];
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (!/^(tax\s*invoice|bill\s*of\s*supply|invoice\s*for\s*media|invoice|bill)/i.test(lines[i])) {
      supplierName = lines[i];
      break;
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
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
    if (/^bill\s*to$/i.test(line) && i + 1 < lines.length) {
      recipientName = lines[i + 1].trim();
    }
    if (/(?:bill\s*to|recipient|buyer|customer|client)[\s\S]{0,30}?gstin[\s:.-]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i.test(line)) {
      recipientGstin = line.match(/gstin[\s:.-]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i)[1].toUpperCase();
    } else if (/gstin[:\s]+([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i.test(line)) {
      const g = line.match(/gstin[:\s]+([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i)[1].toUpperCase();
      if (g !== supplierGstin && !recipientGstin) {
        recipientGstin = g;
      }
    }
    if (/^place\s*of\s*supply$/i.test(line) && i + 1 < lines.length) {
      placeOfSupply = lines[i + 1].trim();
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const itemMatch = line.match(/^(\d+)\s+(.+?)(?:(?:\s+|\b)([0-9]{6,8}))?\s+(\d+)\s+[n₹]?([0-9,]+(?:\.[0-9]{2})?)\s+[n₹]?([0-9,]+(?:\.[0-9]{2})?)\s+([0-9.]+%)\s*=\s*[n₹]?([0-9,]+(?:\.[0-9]{2})?)/i);
    if (itemMatch) {
      const lineNum = itemMatch[1];
      let desc = itemMatch[2].trim();
      let hsn = itemMatch[3] || "";
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
        id: `item-${lineNum}-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
        description: desc,
        hsnSac: hsn || "998313",
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
        itemCategory: hsn && hsn.length >= 4 && !hsn.startsWith("99") && !hsn.startsWith("00") || /laptop|chair|table|car|electronic|goods|hardware|vehicle|computer|desk|material|steel|coil/i.test(desc) ? "Goods" : "Services",
        itcStatus: "Eligible",
        eligibleItc: gstAmt,
        ineligibleItc: 0,
        reviewItc: 0,
        itcReason: "Evaluated under Section 16(1) in the course or furtherance of business.",
        relevantSections: ["Section 16(1)"]
      });
    }
  }
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
    const descMatch = text.match(/(?:description|particulars|service|item)[:\s]+([a-zA-Z0-9\s.,&'()-]{4,80})/i);
    const mainDesc = descMatch ? descMatch[1].trim().split("\n")[0] : supplierName ? `Commercial Supply from ${supplierName}` : "Commercial Business Supply";
    items.push({
      id: `item-1-${Date.now()}`,
      description: mainDesc,
      hsnSac: "998313",
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
      totalGst,
      totalValue: grandTotal || subtotalTaxable + totalGst,
      itemCategory: /laptop|chair|table|car|electronic|goods|hardware|vehicle|computer|desk|material|steel|coil/i.test(mainDesc) ? "Goods" : "Services",
      itcStatus: "Eligible",
      eligibleItc: totalGst,
      ineligibleItc: 0,
      reviewItc: 0,
      itcReason: "Evaluated under Section 16(1) in the course or furtherance of business.",
      relevantSections: ["Section 16(1)"]
    });
  }
  if (!invoiceNumber && fileName) {
    invoiceNumber = fileName.replace(/\.[^/.]+$/, "").trim();
  }
  if (!invoiceNumber) {
    invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
  }
  if (!supplierName && fileName) {
    supplierName = fileName.replace(/\.[^/.]+$/, "").replace(/[_0-9]/g, " ").trim();
  }
  if (!supplierName) {
    supplierName = "Vendor / Supplier";
  }
  const supVal = validateGstin(supplierGstin);
  const recVal = validateGstin(recipientGstin);
  const supplierStateCode = supVal.state?.code || (supplierGstin.length >= 2 ? supplierGstin.slice(0, 2) : "24");
  const supplierStateName = supVal.state?.name || placeOfSupply || "Gujarat";
  const supplierPan = supVal.pan || (supplierGstin.length >= 12 ? supplierGstin.substring(2, 12) : "");
  const recipientStateCode = recVal.state?.code || defaultRecipient?.stateCode || "24";
  const recipientStateName = recVal.state?.name || defaultRecipient?.stateName || placeOfSupply || "Gujarat";
  const recipientPan = recVal.pan || defaultRecipient?.gstin?.substring(2, 12) || "";
  const isInterState = Boolean(supplierStateCode) && Boolean(recipientStateCode) && supplierStateCode !== recipientStateCode;
  const totalCgst = isInterState ? 0 : totalGst / 2;
  const totalSgst = isInterState ? 0 : totalGst / 2;
  const totalIgst = isInterState ? totalGst : 0;
  items.forEach((it) => {
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
  const natureSummary = items.map((it) => it.description).join("; ");
  const invoiceData = {
    id: "inv-" + Date.now() + "-" + Math.floor(Math.random() * 1e5),
    invoiceNumber,
    invoiceDate,
    paymentOrCreditDate: invoiceDate,
    financialYear: getFinancialYear(invoiceDate),
    supplierName,
    supplierGstin,
    supplierPan,
    supplierStateCode,
    supplierStateName,
    supplierType: supplierPan.charAt(3) === "P" ? "Individual / HUF" : "Company / Firm",
    supplierResidentStatus: "Resident",
    recipientName: recipientName || defaultRecipient?.name || "Demo Manufacturing Pvt. Ltd.",
    recipientGstin: recipientGstin || defaultRecipient?.gstin || "",
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
    grandTotal: grandTotal || subtotalTaxable + totalGst,
    natureOfSupplySummary: natureSummary,
    rawText: text,
    fileName: fileName || "",
    extractionSource: "Local Deterministic"
  };
  return {
    success: true,
    data: invoiceData,
    isAmbiguous: !supplierGstin || subtotalTaxable <= 0
  };
}
function normalizeParsedJsonInvoice(json, defaultRecipient, fileName) {
  const cleanFile = fileName ? fileName.replace(/\.[^/.]+$/, "").trim() : "";
  const invoiceNumber = json.invoiceNumber || json.invoice_number || cleanFile || "INV-001";
  const invoiceDate = json.invoiceDate || json.invoice_date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const supplierGstin = (json.supplierGstin || json.supplier_gstin || "").toUpperCase();
  const supVal = validateGstin(supplierGstin);
  const items = (json.items || []).map((it, i) => {
    const taxVal = Number(it.taxableValue || it.taxable_value || it.amount || 0);
    const cgst = Number(it.cgstAmount || it.cgst_amount || 0);
    const sgst = Number(it.sgstAmount || it.sgst_amount || 0);
    const igst = Number(it.igstAmount || it.igst_amount || 0);
    const totGst = cgst + sgst + igst;
    return {
      id: "item-" + i + "-" + Date.now(),
      description: it.description || cleanFile || "Line Item",
      hsnSac: it.hsnSac || it.hsn_sac || "998313",
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice || taxVal,
      taxableValue: taxVal,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      cessAmount: 0,
      totalGst: totGst,
      totalValue: taxVal + totGst,
      itcStatus: "Eligible",
      eligibleItc: totGst,
      ineligibleItc: 0,
      reviewItc: 0,
      itcReason: "Section 16(1) course or furtherance of business.",
      relevantSections: ["Section 16(1)"]
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.taxableValue, 0) || Number(json.taxableValue || json.taxable_value || 0);
  const totalCgst = items.reduce((sum, item) => sum + item.cgstAmount, 0) || Number(json.totalCgst || json.cgst_amount || 0);
  const totalSgst = items.reduce((sum, item) => sum + item.sgstAmount, 0) || Number(json.totalSgst || json.sgst_amount || 0);
  const totalIgst = items.reduce((sum, item) => sum + item.igstAmount, 0) || Number(json.totalIgst || json.igst_amount || 0);
  const grandTotal = Number(json.grandTotal || json.total_amount) || subtotal + totalCgst + totalSgst + totalIgst;
  return {
    id: "inv-" + Date.now() + "-" + Math.floor(Math.random() * 1e5),
    invoiceNumber,
    invoiceDate,
    paymentOrCreditDate: json.paymentOrCreditDate || invoiceDate,
    financialYear: getFinancialYear(invoiceDate),
    supplierName: json.supplierName || json.supplier_name || json.supplier || cleanFile || "Vendor Enterprise",
    supplierGstin,
    supplierPan: supVal.pan || (supplierGstin.length >= 12 ? supplierGstin.substring(2, 12) : ""),
    supplierStateCode: supVal.state?.code || "24",
    supplierStateName: supVal.state?.name || "Gujarat",
    supplierType: "Company / Firm",
    supplierResidentStatus: "Resident",
    recipientName: defaultRecipient?.name || json.recipientName || "Client Enterprise",
    recipientGstin: defaultRecipient?.gstin || json.recipientGstin || "",
    recipientPan: defaultRecipient?.gstin ? defaultRecipient.gstin.substring(2, 12) : "",
    recipientStateCode: defaultRecipient?.stateCode || "24",
    recipientStateName: defaultRecipient?.stateName || "Gujarat",
    placeOfSupplyStateCode: defaultRecipient?.stateCode || "24",
    placeOfSupplyStateName: defaultRecipient?.stateName || "Gujarat",
    isInterState: totalIgst > 0,
    reverseChargeApplicable: Boolean(json.reverseChargeApplicable),
    items: items.length > 0 ? items : [{
      id: "item-1",
      description: cleanFile || "Professional Services",
      hsnSac: "998313",
      taxableValue: subtotal,
      cgstAmount: totalCgst,
      sgstAmount: totalSgst,
      igstAmount: totalIgst,
      cessAmount: 0,
      totalGst: totalCgst + totalSgst + totalIgst,
      totalValue: grandTotal,
      itcStatus: "Eligible",
      eligibleItc: totalCgst + totalSgst + totalIgst,
      ineligibleItc: 0,
      reviewItc: 0,
      itcReason: "Section 16(1) course or furtherance of business.",
      relevantSections: ["Section 16(1)"]
    }],
    subtotalTaxable: subtotal,
    totalCgst,
    totalSgst,
    totalIgst,
    totalCess: 0,
    totalGst: totalCgst + totalSgst + totalIgst,
    grandTotal,
    natureOfSupplySummary: json.natureOfSupplySummary || json.tds_nature || cleanFile || "Commercial Business Supply",
    fileName: fileName || "",
    extractionSource: "Local Deterministic"
  };
}

// server.prod.ts
import_dotenv.default.config();
function mapLocalInvoiceToAiSchema(localInvoice) {
  return {
    supplier: localInvoice.supplierName || "Vendor / Supplier",
    supplier_gstin: localInvoice.supplierGstin || "",
    recipient: localInvoice.recipientName || "",
    recipient_gstin: localInvoice.recipientGstin || "",
    invoice_number: localInvoice.invoiceNumber || "",
    invoice_date: localInvoice.invoiceDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    payment_credit_date: localInvoice.paymentOrCreditDate || localInvoice.invoiceDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    place_of_supply: localInvoice.placeOfSupplyStateName || "",
    taxable_value: localInvoice.subtotalTaxable || 0,
    cgst_amount: localInvoice.totalCgst || 0,
    sgst_amount: localInvoice.totalSgst || 0,
    igst_amount: localInvoice.totalIgst || 0,
    total_amount: localInvoice.grandTotal || localInvoice.subtotalTaxable + localInvoice.totalCgst + localInvoice.totalSgst + localInvoice.totalIgst,
    tds_nature: localInvoice.natureOfSupplySummary || "Goods & Services",
    items: (localInvoice.items || []).map((it) => ({
      description: it.description || "Line Item",
      hsn_sac: it.hsnSac || "",
      taxable_value: it.taxableValue || 0,
      cgst_amount: it.cgstAmount || 0,
      sgst_amount: it.sgstAmount || 0,
      igst_amount: it.igstAmount || 0,
      category: it.itemCategory || "",
      nature: it.description || "Goods / Services"
    })),
    ambiguities: []
  };
}
function createExpressApp(distPath) {
  const app = (0, import_express.default)();
  app.use(import_express.default.json({ limit: "50mb" }));
  const classificationCache = /* @__PURE__ */ new Map();
  const apiKey = process.env.GEMINI_API_KEY;
  let aiClient = null;
  if (apiKey) {
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  app.post("/api/ai/classify", async (req, res) => {
    const { invoiceText, imageBase64, mimeType, fileName } = req.body;
    if (!invoiceText && !imageBase64) {
      return res.status(400).json({
        error: "Either invoiceText or imageBase64 must be provided."
      });
    }
    const contentToHash = (invoiceText || "") + (imageBase64 || "") + (fileName || "");
    const hash = import_crypto.default.createHash("sha256").update(contentToHash).digest("hex");
    if (classificationCache.has(hash)) {
      return res.json({
        source: "cache",
        result: classificationCache.get(hash)
      });
    }
    let cleanBase64 = imageBase64;
    let effectiveMimeType = mimeType || "application/pdf";
    let extractedPdfText = "";
    if (cleanBase64) {
      cleanBase64 = cleanBase64.trim();
      const commaIdx = cleanBase64.indexOf(",");
      if (cleanBase64.startsWith("data:") && commaIdx !== -1) {
        const meta = cleanBase64.slice(5, commaIdx);
        const mimeMatch = meta.match(/^([^;]+)/);
        if (mimeMatch && mimeMatch[1]) {
          effectiveMimeType = mimeMatch[1].trim();
        }
        cleanBase64 = cleanBase64.slice(commaIdx + 1);
      }
      cleanBase64 = cleanBase64.replace(/\s+/g, "");
      if (effectiveMimeType.includes("pdf") || effectiveMimeType === "application/pdf" || fileName && fileName.toLowerCase().endsWith(".pdf")) {
        try {
          const pdfBuffer = Buffer.from(cleanBase64, "base64");
          const parser = new import_pdf_parse.PDFParse({ data: pdfBuffer });
          const parsedPdf = await parser.getText();
          if (parsedPdf && parsedPdf.text && parsedPdf.text.trim().length > 0) {
            extractedPdfText = parsedPdf.text.trim();
          }
        } catch (pdfErr) {
          console.warn("PDF stream extraction warning:", pdfErr);
        }
      }
    }
    const effectiveInvoiceText = (extractedPdfText ? `${extractedPdfText}
` : "") + (invoiceText || "");
    if (!aiClient) {
      if (effectiveInvoiceText || fileName) {
        const localResult = extractInvoiceLocally(effectiveInvoiceText || fileName || "", void 0, fileName);
        if (localResult.success && localResult.data) {
          const mapped2 = mapLocalInvoiceToAiSchema(localResult.data);
          classificationCache.set(hash, mapped2);
          return res.json({
            source: "deterministic_engine",
            result: mapped2
          });
        }
      }
      const defaultInv = extractInvoiceLocally(fileName || "", void 0, fileName).data;
      const mapped = defaultInv ? mapLocalInvoiceToAiSchema(defaultInv) : {
        supplier: fileName ? fileName.replace(/\.[^/.]+$/, "") : "Vendor Enterprise",
        supplier_gstin: "",
        recipient: "",
        recipient_gstin: "",
        invoice_number: fileName ? fileName.replace(/\.[^/.]+$/, "") : `INV-${Date.now().toString().slice(-6)}`,
        invoice_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        payment_credit_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        place_of_supply: "",
        taxable_value: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        total_amount: 0,
        tds_nature: "Goods / Services",
        items: [],
        ambiguities: []
      };
      return res.status(200).json({
        source: "default_baseline",
        result: mapped
      });
    }
    try {
      const prompt = `You are a specialized tax invoice data extractor for Indian Chartered Accountants.
Extract the structured invoice data strictly into JSON according to the schema.
Do NOT invent numbers or GSTINs. If a field is missing, leave it as an empty string or 0.

Key rules:
- Extract supplier name, GSTIN, PAN (characters 3-12 of GSTIN).
- Extract recipient name, GSTIN.
- Extract invoice number, date (YYYY-MM-DD), payment/credit date if visible.
- Extract line items with item descriptions, HSN/SAC codes, taxable values, CGST, SGST, IGST amounts.
- Classify the predominant nature of payment (e.g., "Professional Services", "Contractor", "Rent - Machinery", "Rent - Land/Building", "Purchase of Goods > 50L", "Commission").
- Note any ambiguities.`;
      const contents = [];
      if (effectiveInvoiceText) {
        contents.push({
          text: `INVOICE TEXT:
${effectiveInvoiceText}

${prompt}`
        });
      } else if (cleanBase64) {
        contents.push({
          inlineData: {
            mimeType: effectiveMimeType,
            data: cleanBase64
          }
        });
        contents.push({ text: prompt });
      } else {
        contents.push({ text: prompt });
      }
      const schemaConfig = {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            supplier: { type: import_genai.Type.STRING },
            supplier_gstin: { type: import_genai.Type.STRING },
            recipient: { type: import_genai.Type.STRING },
            recipient_gstin: { type: import_genai.Type.STRING },
            invoice_number: { type: import_genai.Type.STRING },
            invoice_date: { type: import_genai.Type.STRING },
            payment_credit_date: { type: import_genai.Type.STRING },
            place_of_supply: { type: import_genai.Type.STRING },
            taxable_value: { type: import_genai.Type.NUMBER },
            cgst_amount: { type: import_genai.Type.NUMBER },
            sgst_amount: { type: import_genai.Type.NUMBER },
            igst_amount: { type: import_genai.Type.NUMBER },
            total_amount: { type: import_genai.Type.NUMBER },
            tds_nature: { type: import_genai.Type.STRING },
            items: {
              type: import_genai.Type.ARRAY,
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  description: { type: import_genai.Type.STRING },
                  hsn_sac: { type: import_genai.Type.STRING },
                  taxable_value: { type: import_genai.Type.NUMBER },
                  cgst_amount: { type: import_genai.Type.NUMBER },
                  sgst_amount: { type: import_genai.Type.NUMBER },
                  igst_amount: { type: import_genai.Type.NUMBER },
                  nature: { type: import_genai.Type.STRING }
                }
              }
            },
            ambiguities: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING }
            }
          }
        }
      };
      const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
      let lastError = null;
      let response = null;
      for (const model of modelsToTry) {
        try {
          response = await aiClient.models.generateContent({
            model,
            contents,
            config: schemaConfig
          });
          if (response && response.text) {
            break;
          }
        } catch (err) {
          lastError = err;
          console.warn(`Model ${model} failed:`, err?.message || err);
          await new Promise((r) => setTimeout(r, 400));
        }
      }
      if (!response || !response.text) {
        throw lastError || new Error("No response returned from AI models");
      }
      let textOutput = response.text || "";
      textOutput = textOutput.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsedResult = JSON.parse(textOutput);
      classificationCache.set(hash, parsedResult);
      return res.json({
        source: "gemini",
        result: parsedResult
      });
    } catch (error) {
      console.warn("Gemini classification fallback triggered:", error?.message || error);
      if (effectiveInvoiceText || fileName) {
        const localRes = extractInvoiceLocally(effectiveInvoiceText || fileName || "", void 0, fileName);
        if (localRes.success && localRes.data) {
          const mapped2 = mapLocalInvoiceToAiSchema(localRes.data);
          classificationCache.set(hash, mapped2);
          return res.json({
            source: "deterministic_engine",
            result: mapped2
          });
        }
      }
      const defaultInv = extractInvoiceLocally(fileName || "", void 0, fileName).data;
      const mapped = defaultInv ? mapLocalInvoiceToAiSchema(defaultInv) : {
        supplier: fileName ? fileName.replace(/\.[^/.]+$/, "") : "Vendor Enterprise",
        supplier_gstin: "",
        recipient: "",
        recipient_gstin: "",
        invoice_number: fileName ? fileName.replace(/\.[^/.]+$/, "") : `INV-${Date.now().toString().slice(-6)}`,
        invoice_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        payment_credit_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        place_of_supply: "",
        taxable_value: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        total_amount: 0,
        tds_nature: "Goods / Services",
        items: [],
        ambiguities: []
      };
      return res.json({
        source: "deterministic_engine",
        result: mapped
      });
    }
  });
  if (distPath) {
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  return app;
}
function startServer(preferredPort = 0, distPath) {
  return new Promise((resolve, reject) => {
    const app = createExpressApp(distPath);
    const server = app.listen(preferredPort, "127.0.0.1", () => {
      const addr = server.address();
      const actualPort = typeof addr === "object" && addr ? addr.port : preferredPort;
      const url = `http://127.0.0.1:${actualPort}`;
      resolve({ server, port: actualPort, url });
    });
    server.on("error", (err) => {
      reject(err);
    });
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createExpressApp,
  extractInvoiceLocally,
  startServer
});
