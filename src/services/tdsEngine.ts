import { InvoiceData, TdsAnalysisResult, ApplicableAct, ClientProfile, InvoiceLineItem, TdsRule } from '../types/tax';
import { TDS_RULES_MASTER, determineApplicableAct } from '../data/tdsRulesMaster';

/**
 * Classifies an individual line item or invoice description into its statutory TDS Rule.
 */
function classifyItemTdsRule(itemDesc: string, hsnSac: string, itemCategory?: string): { rule: TdsRule; isAmbiguousSoftware?: boolean } {
  const lower = (itemDesc || '').toLowerCase();
  const code = (hsnSac || '').trim();

  // 1. Ambiguous software licensing / usage rights without clear development facts (Invoice 06 test case)
  if (
    /\b(software licence|software license|usage rights|licence rights|enterprise licence|enterprise license)\b/i.test(lower) &&
    !/\b(consultan|advisory|development|devops|support)\b/i.test(lower)
  ) {
    const rule = TDS_RULES_MASTER.find(r => r.ruleId === 'TDS_194J_TECHNICAL_FTS') || TDS_RULES_MASTER[2];
    return { rule, isAmbiguousSoftware: true };
  }

  // 2. Purchase of Goods (HSN Chapters 01-98 or goods keywords)
  const isGoods =
    itemCategory === 'Goods' ||
    (code.length >= 4 && !code.startsWith('99') && !code.startsWith('00')) ||
    /\b(chair|table|furniture|laptop|desktop|computer|hardware|motor car|passenger vehicle|vehicle|car|automobile|electronic|accessories|appliance|mobile|goods|material|steel|coil|desk|trading goods|raw material)\b/i.test(lower);

  if (isGoods) {
    const rule = TDS_RULES_MASTER.find(r => r.ruleId === 'TDS_194Q_PURCHASE_GOODS') || TDS_RULES_MASTER[5];
    return { rule };
  }

  // 3. Professional Services (Legal, Medical, Accountancy, Consultancy, Advisory, Audit) - 10%
  if (/\b(consultan|advisory|professional|legal|audit|accountan|doctor|architect|advocate|tax\s*advisory)\b/i.test(lower)) {
    const rule = TDS_RULES_MASTER.find(r => r.ruleId === 'TDS_194J_PROFESSIONAL') || TDS_RULES_MASTER[1];
    return { rule };
  }

  // 4. Technical Services / FTS / SaaS / IT Technical Support - 2%
  if (/\b(technical|fts|devops|software development|saas|subscription|cloud|hosting|call cent)\b/i.test(lower)) {
    const rule = TDS_RULES_MASTER.find(r => r.ruleId === 'TDS_194J_TECHNICAL_FTS') || TDS_RULES_MASTER[2];
    return { rule };
  }

  // 5. Rent - Plant & Machinery / Equipment - 2%
  if (/\b(rent|lease|hire)\b/i.test(lower) && /\b(machinery|plant|equipment|generator|crane|vehicle hire)\b/i.test(lower)) {
    const rule = TDS_RULES_MASTER.find(r => r.ruleId === 'TDS_194I_RENT_PLANT_MACHINERY') || TDS_RULES_MASTER[3];
    return { rule };
  }

  // 6. Rent - Land & Building / Office Space / Warehouse - 10%
  if (/\b(rent|lease)\b/i.test(lower) && /\b(building|office|premises|warehouse|land|property|space)\b/i.test(lower)) {
    const rule = TDS_RULES_MASTER.find(r => r.ruleId === 'TDS_194I_RENT_LAND_BUILDING') || TDS_RULES_MASTER[4];
    return { rule };
  }

  // 7. Commission / Brokerage - 2%
  if (/\b(commission|brokerage)\b/i.test(lower)) {
    const rule = TDS_RULES_MASTER.find(r => r.ruleId === 'TDS_194H_COMMISSION') || TDS_RULES_MASTER[6];
    return { rule };
  }

  // 8. Contractor / Works / Catering / Transport / Maintenance - 2% Company / 1% Ind
  if (/\b(contract|civil|catering|lunch|buffet|canteen|transport|carriage|maintenance|housekeeping|facility|cleaning|security)\b/i.test(lower)) {
    const rule = TDS_RULES_MASTER.find(r => r.ruleId === 'TDS_194C_CONTRACT') || TDS_RULES_MASTER[0];
    return { rule };
  }

  // Default contractor works rule
  return { rule: TDS_RULES_MASTER.find(r => r.ruleId === 'TDS_194C_CONTRACT') || TDS_RULES_MASTER[0] };
}

/**
 * Deterministic TDS Decision Engine
 * Evaluates TDS liability, thresholds, rates, Section 206AA PAN condition,
 * line-item statutory analysis, and generates statutory comparison between
 * Income-tax Act, 1961 and Income-tax Act, 2025.
 */
export function analyzeTds(
  invoice: InvoiceData,
  client: ClientProfile,
  options?: {
    priorCumulativePaymentsInFy?: number; // For aggregate threshold tracking
    transporterOwnsMax10Carriages?: boolean; // For 194C(6) NIL rate
    isForm15Gor15HSubmitted?: boolean;
    applyTdsOnCumulative?: boolean; // Option to deduct on cumulative FY amount when aggregate threshold is crossed
    priorInvoicesCountInFy?: number;
    financialYear?: string;
  }
): TdsAnalysisResult {
  const { act: applicableAct, reason: actDeterminationReason } = determineApplicableAct(invoice.paymentOrCreditDate || invoice.invoiceDate);

  const priorAmount = options?.priorCumulativePaymentsInFy || 0;
  const aggregateAmount = priorAmount + invoice.subtotalTaxable;
  const fyLabel = options?.financialYear || invoice.financialYear || 'FY';
  const isPayeeIndHuf = invoice.supplierType === 'Individual / HUF' || (invoice.supplierPan && invoice.supplierPan.charAt(3) === 'P');
  const panAvailable = Boolean(invoice.supplierPan && invoice.supplierPan.length === 10);

  // Check if invoice has multiple items with different natures (Mixed Invoice, e.g., Invoice 05)
  const hasMultipleItems = invoice.items && invoice.items.length > 1;
  const itemClassifications = (invoice.items || []).map(it => ({
    item: it,
    ...classifyItemTdsRule(it.description, it.hsnSac, it.itemCategory),
  }));

  const distinctRuleIds = new Set(itemClassifications.map(ic => ic.rule.ruleId));
  const isMixedMultiLine = hasMultipleItems && distinctRuleIds.size > 1;

  if (isMixedMultiLine) {
    // Multi-line Item Analysis (such as Mixed Invoice 05)
    let totalTdsAmount = 0;
    let totalTdsBase = 0;
    let anyReviewRequired = false;
    let anyTdsApplicable = false;
    const lineItemDetails: string[] = [];

    // Track goods cumulative threshold in this multi-line batch
    let runningGoodsInFy = priorAmount;

    for (let i = 0; i < itemClassifications.length; i++) {
      const { item, rule, isAmbiguousSoftware } = itemClassifications[i];
      const val = item.taxableValue || 0;
      let itemRate = isPayeeIndHuf ? rule.oldRateIndHuf : rule.oldRateOther;
      if (applicableAct === 'Income-tax Act, 2025') {
        itemRate = isPayeeIndHuf ? rule.newRateIndHuf : rule.newRateOther;
      }
      if (!panAvailable) itemRate = rule.panConditionRate;

      if (isAmbiguousSoftware) {
        anyReviewRequired = true;
        lineItemDetails.push(`Line ${i + 1} (${item.description}: ₹${val.toLocaleString('en-IN')}) requires factual review of licensing agreement terms`);
        continue;
      }

      if (rule.ruleId === 'TDS_194Q_PURCHASE_GOODS') {
        const totalGoods = runningGoodsInFy + val;
        runningGoodsInFy += val;
        if (totalGoods > 5000000) {
          const taxableExcess = runningGoodsInFy >= 5000000 && (runningGoodsInFy - val) >= 5000000 ? val : totalGoods - 5000000;
          const itemTds = Math.round(taxableExcess * (itemRate / 100));
          totalTdsBase += taxableExcess;
          totalTdsAmount += itemTds;
          anyTdsApplicable = true;
          lineItemDetails.push(`Line ${i + 1} (${item.description}: ₹${val.toLocaleString('en-IN')}) TDS applicable at ${itemRate}% on excess (₹${itemTds.toLocaleString('en-IN')})`);
        } else {
          lineItemDetails.push(`Line ${i + 1} (${item.description}: ₹${val.toLocaleString('en-IN')}) is purchase of goods below ₹50 Lakhs statutory limit (TDS NIL)`);
        }
      } else {
        // Services: Check single threshold
        const threshold = applicableAct === 'Income-tax Act, 2025' ? rule.newSingleThreshold : rule.oldSingleThreshold;
        if (val > threshold) {
          const itemTds = Math.round(val * (itemRate / 100));
          totalTdsBase += val;
          totalTdsAmount += itemTds;
          anyTdsApplicable = true;
          lineItemDetails.push(`Line ${i + 1} (${item.description}: ₹${val.toLocaleString('en-IN')}) TDS mandatory at ${itemRate}% (₹${itemTds.toLocaleString('en-IN')} under ${applicableAct === 'Income-tax Act, 2025' ? rule.newTable + ' ' + rule.newTableItem : rule.oldSection})`);
        } else {
          lineItemDetails.push(`Line ${i + 1} (${item.description}: ₹${val.toLocaleString('en-IN')}) is within single threshold of ₹${threshold.toLocaleString('en-IN')} (TDS NIL)`);
        }
      }
    }

    const dominantRule = itemClassifications.find(ic => ic.rule.ruleId === 'TDS_194J_PROFESSIONAL')?.rule ||
      itemClassifications.find(ic => ic.rule.ruleId !== 'TDS_194Q_PURCHASE_GOODS')?.rule ||
      itemClassifications[0].rule;

    const singleThreshold = applicableAct === 'Income-tax Act, 2025' ? dominantRule.newSingleThreshold : dominantRule.oldSingleThreshold;
    const aggregateThreshold = applicableAct === 'Income-tax Act, 2025' ? dominantRule.newAggregateThreshold : dominantRule.oldAggregateThreshold;
    const headroomRemainingInFy = Math.max(0, aggregateThreshold - aggregateAmount);

    let tdsApplicable: 'YES' | 'NO' | 'REVIEW REQUIRED' = anyTdsApplicable ? 'YES' : (anyReviewRequired ? 'REVIEW REQUIRED' : 'NO');
    const effectiveRate = totalTdsBase > 0 ? Number(((totalTdsAmount / totalTdsBase) * 100).toFixed(2)) : (isPayeeIndHuf ? dominantRule.newRateIndHuf : dominantRule.newRateOther);

    const reason = `Multi-line mixed invoice analyzed item-by-item: ${lineItemDetails.join('; ')}. Total TDS deductible: ₹${totalTdsAmount.toLocaleString('en-IN')}.`;

    return {
      tdsApplicable,
      applicableAct,
      actDeterminationReason,
      comparison: constructComparison(dominantRule, isPayeeIndHuf),
      operativeAct: applicableAct,
      operativeSection: applicableAct === 'Income-tax Act, 2025' ? 'Section 393 (Mixed Items)' : 'Section 194 (Mixed Items)',
      operativeTableItem: applicableAct === 'Income-tax Act, 2025' ? 'Table 1 (Multi-item Evaluation)' : 'N/A',
      natureOfPayment: 'Mixed Supply / Multi-line Invoice Items',
      thresholdAmount: singleThreshold,
      thresholdType: 'Both',
      thresholdStatus: anyTdsApplicable ? 'Exceeded' : 'Within Limits',
      cumulativePaidThisYear: priorAmount,
      tdsRate: effectiveRate,
      tdsBase: totalTdsBase,
      tdsAmount: totalTdsAmount,
      triggerCondition: dominantRule.triggerTiming,
      deductionDate: invoice.paymentOrCreditDate || invoice.invoiceDate,
      depositDueDate: calculateDepositDueDate(invoice.paymentOrCreditDate || invoice.invoiceDate),
      reason,
      legalSource: dominantRule.legalSource,
      sourceReference: dominantRule.sourceReference,
      panAvailable,
      higherRateApplied: !panAvailable,
      exceptionsChecked: dominantRule.exceptions,
      financialYear: fyLabel,
      singleThresholdExceeded: anyTdsApplicable,
      aggregateThresholdExceeded: false,
      thresholdExceededDueToAggregate: false,
      priorCumulativeInFy: priorAmount,
      totalCumulativeInFy: aggregateAmount,
      aggregateThresholdAmount: aggregateThreshold,
      headroomRemainingInFy,
      priorInvoicesCountInFy: options?.priorInvoicesCountInFy || 0,
      tdsOnCumulativeOptionAvailable: false,
      cumulativeTdsBase: aggregateAmount,
      cumulativeTdsAmount: Math.round(aggregateAmount * (effectiveRate / 100)),
      applyTdsOnCumulative: Boolean(options?.applyTdsOnCumulative),
    };
  }

  // Single-item or uniform invoice analysis
  const dominantItem = invoice.items[0];
  const invoiceNature = invoice.natureOfSupplySummary || dominantItem?.natureOfPayment || dominantItem?.description || '';
  const { rule: matchedRule, isAmbiguousSoftware } = classifyItemTdsRule(invoiceNature, dominantItem?.hsnSac || '', dominantItem?.itemCategory);

  // Ambiguous Software Licence (Invoice 06 test scenario)
  if (isAmbiguousSoftware) {
    const singleThreshold = applicableAct === 'Income-tax Act, 2025' ? matchedRule.newSingleThreshold : matchedRule.oldSingleThreshold;
    const aggregateThreshold = applicableAct === 'Income-tax Act, 2025' ? matchedRule.newAggregateThreshold : matchedRule.oldAggregateThreshold;
    const standardRate = isPayeeIndHuf ? matchedRule.newRateIndHuf : matchedRule.newRateOther;

    const reason = 'Software licence / usage rights require factual and legal verification of the licensing agreement. Post-Supreme Court judgment in Engineering Analysis Centre of Excellence, standard packaged/off-the-shelf software licensing without transfer of underlying copyright does not constitute royalty under Section 9(1)(vi)/Section 194J. However, if customized development, implementation or maintenance services are bundled, Section 393 Table 1 Item 10(b) (FTS at 2%) applies, or if treated as pure goods purchase, Section 393 Table 1 Item 16 (194Q) applies only if annual purchases exceed ₹50 Lakhs. Contract terms must be reviewed before tax deduction.';

    return {
      tdsApplicable: 'REVIEW REQUIRED',
      applicableAct,
      actDeterminationReason,
      comparison: constructComparison(matchedRule, isPayeeIndHuf),
      operativeAct: applicableAct,
      operativeSection: applicableAct === 'Income-tax Act, 2025' ? matchedRule.newSection : matchedRule.oldSection,
      operativeTableItem: applicableAct === 'Income-tax Act, 2025' ? `${matchedRule.newTable} – ${matchedRule.newTableItem}` : 'N/A',
      natureOfPayment: matchedRule.natureOfPayment,
      thresholdAmount: singleThreshold,
      thresholdType: 'Single Transaction',
      thresholdStatus: 'Within Limits',
      cumulativePaidThisYear: priorAmount,
      tdsRate: standardRate,
      tdsBase: 0,
      tdsAmount: 0,
      triggerCondition: matchedRule.triggerTiming,
      deductionDate: invoice.paymentOrCreditDate || invoice.invoiceDate,
      depositDueDate: calculateDepositDueDate(invoice.paymentOrCreditDate || invoice.invoiceDate),
      reason,
      legalSource: 'Supreme Court in Engineering Analysis (2021) / Income-tax Act, 2025 s. 393 Table 1 Item 10(b)',
      sourceReference: 'CBDT Circular No. 23/2017 & SC Civil Appeal Nos. 8733-8734 of 2018',
      panAvailable,
      higherRateApplied: false,
      exceptionsChecked: matchedRule.exceptions,
      financialYear: fyLabel,
      singleThresholdExceeded: false,
      aggregateThresholdExceeded: false,
      thresholdExceededDueToAggregate: false,
      priorCumulativeInFy: priorAmount,
      totalCumulativeInFy: aggregateAmount,
      aggregateThresholdAmount: aggregateThreshold,
      headroomRemainingInFy: Math.max(0, aggregateThreshold - aggregateAmount),
      priorInvoicesCountInFy: options?.priorInvoicesCountInFy || 0,
      tdsOnCumulativeOptionAvailable: false,
      cumulativeTdsBase: aggregateAmount,
      cumulativeTdsAmount: 0,
      applyTdsOnCumulative: false,
    };
  }

  // Base for TDS calculation
  let tdsBase = invoice.subtotalTaxable;
  if (matchedRule.ruleId === 'TDS_194Q_PURCHASE_GOODS') {
    // For 194Q / Section 393 Table 1 Item 16: TDS applies ONLY on value exceeding ₹50,00,000 in the FY
    const totalPurchases = priorAmount + invoice.subtotalTaxable;
    if (totalPurchases > 5000000) {
      if (priorAmount >= 5000000) {
        tdsBase = invoice.subtotalTaxable;
      } else {
        tdsBase = totalPurchases - 5000000;
      }
    } else {
      tdsBase = 0;
    }
  }

  // Threshold Check
  const singleThreshold = applicableAct === 'Income-tax Act, 2025' ? matchedRule.newSingleThreshold : matchedRule.oldSingleThreshold;
  const aggregateThreshold = applicableAct === 'Income-tax Act, 2025' ? matchedRule.newAggregateThreshold : matchedRule.oldAggregateThreshold;

  let thresholdType: 'Single Transaction' | 'Aggregate Annual' | 'Both' | 'No Threshold' = 'Single Transaction';
  if (singleThreshold !== aggregateThreshold) {
    thresholdType = 'Both';
  } else if (singleThreshold >= 5000000) {
    thresholdType = 'Aggregate Annual';
  }

  const headroomRemainingInFy = Math.max(0, aggregateThreshold - aggregateAmount);
  const singleThresholdExceeded = singleThreshold > 0 && invoice.subtotalTaxable > singleThreshold;
  const aggregateThresholdExceeded = aggregateThreshold > 0 && aggregateAmount > aggregateThreshold;

  let thresholdExceeded = false;
  let thresholdExceededDueToAggregate = false;
  let thresholdStatus: 'Exceeded' | 'Within Limits' | 'Aggregate History Required' = 'Within Limits';

  if (matchedRule.ruleId === 'TDS_194C_CONTRACT') {
    // Single contract > 30,000 OR Aggregate > 1,00,000
    if (singleThresholdExceeded) {
      thresholdExceeded = true;
      thresholdStatus = 'Exceeded';
    } else if (aggregateThresholdExceeded) {
      thresholdExceeded = true;
      thresholdExceededDueToAggregate = true;
      thresholdStatus = 'Exceeded';
    } else {
      thresholdStatus = 'Within Limits';
    }
  } else if (matchedRule.ruleId === 'TDS_194Q_PURCHASE_GOODS') {
    // Purchase of goods: strictly aggregate annual threshold > 50,00,000
    if (aggregateThresholdExceeded) {
      thresholdExceeded = true;
      thresholdExceededDueToAggregate = true;
      thresholdStatus = 'Exceeded';
    } else {
      thresholdStatus = 'Within Limits';
    }
  } else {
    // 194J, 194I, 194H
    if (singleThresholdExceeded) {
      thresholdExceeded = true;
      thresholdStatus = 'Exceeded';
    } else if (aggregateThresholdExceeded) {
      thresholdExceeded = true;
      thresholdExceededDueToAggregate = true;
      thresholdStatus = 'Exceeded';
    } else {
      thresholdStatus = 'Within Limits';
    }
  }

  // Rate Determination
  let standardRate = isPayeeIndHuf ? matchedRule.oldRateIndHuf : matchedRule.oldRateOther;
  if (applicableAct === 'Income-tax Act, 2025') {
    standardRate = isPayeeIndHuf ? matchedRule.newRateIndHuf : matchedRule.newRateOther;
  }

  let appliedRate = standardRate;
  let higherRateApplied = false;
  if (!panAvailable) {
    appliedRate = matchedRule.panConditionRate;
    higherRateApplied = true;
  }

  // Transporter Declaration Exception under 194C(6)
  let exceptionTriggered: string | null = null;
  if (matchedRule.ruleId === 'TDS_194C_CONTRACT' && options?.transporterOwnsMax10Carriages && panAvailable) {
    appliedRate = 0;
    exceptionTriggered = 'Transporter owning <= 10 goods carriages furnished valid PAN and declaration under Section 194C(6) / Section 393 Table 1 Item 3 proviso (NIL deduction).';
  }

  // Option to deduct on cumulative FY amount when aggregate threshold is breached
  const cumulativeTdsBase = aggregateAmount;
  const cumulativeTdsAmount = Math.round(cumulativeTdsBase * (appliedRate / 100));

  if (options?.applyTdsOnCumulative && thresholdExceededDueToAggregate && !exceptionTriggered) {
    tdsBase = cumulativeTdsBase;
  }

  // Final Applicability Decision
  let tdsApplicable: 'YES' | 'NO' = 'YES';
  let reason = '';

  if (exceptionTriggered) {
    tdsApplicable = 'NO';
    reason = exceptionTriggered;
  } else if (matchedRule.ruleId === 'TDS_194Q_PURCHASE_GOODS' && !aggregateThresholdExceeded) {
    tdsApplicable = 'NO';
    reason = `Transaction value (₹${invoice.subtotalTaxable.toLocaleString('en-IN')}) is for purchase of goods under ${applicableAct === 'Income-tax Act, 2025' ? 'Section 393 (' + matchedRule.newTable + ' ' + matchedRule.newTableItem + ')' : matchedRule.oldSection} and is within the statutory aggregate threshold of ₹50,00,000 (FY aggregate: ₹${aggregateAmount.toLocaleString('en-IN')}; ₹${headroomRemainingInFy.toLocaleString('en-IN')} headroom remaining). TDS is NOT applicable.`;
  } else if (thresholdExceededDueToAggregate) {
    tdsApplicable = 'YES';
    reason = `Financial Year (${fyLabel}) Aggregate Threshold of ₹${aggregateThreshold.toLocaleString('en-IN')} is EXCEEDED! Prior cumulative amount in FY: ₹${priorAmount.toLocaleString('en-IN')}. With current invoice (₹${invoice.subtotalTaxable.toLocaleString('en-IN')}), total FY aggregate reaches ₹${aggregateAmount.toLocaleString('en-IN')}. TDS deduction is mandatory under ${applicableAct === 'Income-tax Act, 2025' ? 'Section 393 (' + matchedRule.newTable + ' ' + matchedRule.newTableItem + ')' : matchedRule.oldSection}.`;
  } else if (thresholdExceeded) {
    tdsApplicable = 'YES';
    reason = `Single invoice threshold of ₹${singleThreshold.toLocaleString('en-IN')} exceeded. Current invoice taxable value is ₹${invoice.subtotalTaxable.toLocaleString('en-IN')}. TDS deduction is mandatory at ${appliedRate}% under ${applicableAct === 'Income-tax Act, 2025' ? 'Section 393 (' + matchedRule.newTable + ' ' + matchedRule.newTableItem + ')' : matchedRule.oldSection}.`;
  } else {
    tdsApplicable = 'NO';
    reason = `Transaction value (₹${invoice.subtotalTaxable.toLocaleString('en-IN')}) is below single threshold (₹${singleThreshold.toLocaleString('en-IN')}), and total cumulative amount in ${fyLabel} (₹${aggregateAmount.toLocaleString('en-IN')}) has not exceeded the statutory aggregate limit of ₹${aggregateThreshold.toLocaleString('en-IN')} (₹${headroomRemainingInFy.toLocaleString('en-IN')} headroom remaining). TDS is NOT applicable.`;
  }

  const tdsAmount = tdsApplicable === 'YES' ? Math.round(tdsBase * (appliedRate / 100)) : 0;
  const deductionDate = invoice.paymentOrCreditDate || invoice.invoiceDate;
  const depositDueDate = calculateDepositDueDate(deductionDate);

  return {
    tdsApplicable,
    applicableAct,
    actDeterminationReason,
    comparison: constructComparison(matchedRule, isPayeeIndHuf),
    operativeAct: applicableAct,
    operativeSection: applicableAct === 'Income-tax Act, 2025' ? matchedRule.newSection : matchedRule.oldSection,
    operativeTableItem: applicableAct === 'Income-tax Act, 2025' ? `${matchedRule.newTable} – ${matchedRule.newTableItem}` : 'N/A',
    natureOfPayment: matchedRule.natureOfPayment,
    thresholdAmount: singleThreshold,
    thresholdType,
    thresholdStatus,
    cumulativePaidThisYear: priorAmount,
    tdsRate: appliedRate,
    tdsBase,
    tdsAmount,
    triggerCondition: matchedRule.triggerTiming,
    deductionDate,
    depositDueDate,
    reason,
    legalSource: matchedRule.legalSource,
    sourceReference: matchedRule.sourceReference,
    panAvailable,
    higherRateApplied,
    exceptionsChecked: matchedRule.exceptions,
    financialYear: fyLabel,
    singleThresholdExceeded,
    aggregateThresholdExceeded,
    thresholdExceededDueToAggregate,
    priorCumulativeInFy: priorAmount,
    totalCumulativeInFy: aggregateAmount,
    aggregateThresholdAmount: aggregateThreshold,
    headroomRemainingInFy,
    priorInvoicesCountInFy: options?.priorInvoicesCountInFy || 0,
    tdsOnCumulativeOptionAvailable: thresholdExceededDueToAggregate,
    cumulativeTdsBase,
    cumulativeTdsAmount,
    applyTdsOnCumulative: Boolean(options?.applyTdsOnCumulative),
  };
}

function calculateDepositDueDate(deductionDate?: string): string {
  if (!deductionDate) return '7th of subsequent month';
  const d = new Date(deductionDate);
  if (isNaN(d.getTime())) return '7th of subsequent month';
  const month = d.getMonth();
  const year = d.getFullYear();
  if (month === 2) {
    return `${year}-04-30 (Special March statutory deadline)`;
  }
  const nextMonth = (month + 1) % 12;
  const nextYear = month === 11 ? year + 1 : year;
  const padMonth = String(nextMonth + 1).padStart(2, '0');
  return `${nextYear}-${padMonth}-07`;
}

function constructComparison(rule: TdsRule, isPayeeIndHuf: boolean) {
  return [
    {
      particular: 'Statutory Act',
      act1961: 'Income-tax Act, 1961',
      act2025: 'Income-tax Act, 2025',
    },
    {
      particular: 'Applicable Provision / Section',
      act1961: rule.oldSection,
      act2025: rule.newSection,
    },
    {
      particular: 'Schedule / Table / Item',
      act1961: 'N/A (Direct Section)',
      act2025: `${rule.newTable} – ${rule.newTableItem}`,
    },
    {
      particular: 'Nature of Payment',
      act1961: rule.natureOfPayment,
      act2025: rule.newDescription,
    },
    {
      particular: 'Single Transaction Threshold',
      act1961: `₹${rule.oldSingleThreshold.toLocaleString('en-IN')}`,
      act2025: `₹${rule.newSingleThreshold.toLocaleString('en-IN')}`,
    },
    {
      particular: 'Aggregate Annual Threshold',
      act1961: `₹${rule.oldAggregateThreshold.toLocaleString('en-IN')}`,
      act2025: `₹${rule.newAggregateThreshold.toLocaleString('en-IN')}`,
    },
    {
      particular: 'Standard TDS Rate',
      act1961: `${isPayeeIndHuf ? rule.oldRateIndHuf : rule.oldRateOther}% (${isPayeeIndHuf ? 'Individual/HUF' : 'Company/Other'})`,
      act2025: `${isPayeeIndHuf ? rule.newRateIndHuf : rule.newRateOther}% (${isPayeeIndHuf ? 'Individual/HUF' : 'Company/Other'})`,
    },
    {
      particular: 'Rate without PAN (Section 206AA / 2025 Corresp.)',
      act1961: `${rule.panConditionRate}%`,
      act2025: `${rule.panConditionRate}%`,
    },
    {
      particular: 'Tax Deduction Base',
      act1961: rule.oldBase,
      act2025: rule.newBase,
    },
    {
      particular: 'Statutory Exceptions',
      act1961: rule.exceptions.join('; '),
      act2025: rule.exceptions.join('; '),
    },
  ];
}
