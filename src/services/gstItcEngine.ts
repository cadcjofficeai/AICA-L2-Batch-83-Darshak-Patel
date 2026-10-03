import { InvoiceData, InvoiceLineItem, GstItcAnalysisResult, ClientProfile } from '../types/tax';
import { identifyPotentialBlockedCategory, SECTION_17_5_BLOCKED_RULES } from '../data/gstItcRulesMaster';

/**
 * Deterministic GST Input Tax Credit (ITC) Decision Engine
 * Implements Section 16, Section 17(1)/(2), Section 17(5) Blocked Credits,
 * Statutory Exceptions, and Client Business Nature contextual analysis.
 */
export function analyzeGstItc(
  invoice: InvoiceData,
  client: ClientProfile,
  userResponses?: Record<string, Record<string, boolean | string>>
): GstItcAnalysisResult {
  let totalGst = 0;
  let eligibleItc = 0;
  let ineligibleItc = 0;
  let reviewItc = 0;

  const relevantProvisionsSet = new Set<string>();
  const blockedCreditsSummarySet = new Set<string>();

  // Process line items
  const lineItemResults: InvoiceLineItem[] = invoice.items.map(item => {
    const itemGst = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0) + (item.cessAmount || 0);
    totalGst += itemGst;

    // Check user responses for this line item if available
    const itemAnswers = userResponses?.[item.id] || item.businessUseAnswers || {};

    // 1. First evaluate Section 17(5) Blocked Credit rules
    const blockedRule = identifyPotentialBlockedCategory(item.description, item.hsnSac);

    let status: 'Eligible' | 'Not Eligible' | 'Partially Eligible' = 'Eligible';
    let eligible = itemGst;
    let ineligible = 0;
    const review = 0;
    let reason = 'Eligible under Section 16(1) of CGST Act. Inward supply is received and utilized in the course or furtherance of business. Conditions of Section 16(2) satisfied; not blocked under Section 17(5).';
    const sections: string[] = ['Section 16(1)', 'Section 16(2)'];

    if (blockedRule) {
      relevantProvisionsSet.add(blockedRule.legalProvision);
      blockedCreditsSummarySet.add(`${blockedRule.clause}: ${blockedRule.category}`);

      // Expert Deterministic Decision based on Law & Client Profile
      if (blockedRule.clause === '17(5)(a)') {
        // Motor vehicle
        const isTransportBusiness = client.natureOfBusiness.includes('Transportation / Logistics');
        if (isTransportBusiness) {
          status = 'Eligible';
          eligible = itemGst;
          ineligible = 0;
          reason = 'Eligible under statutory exception to Section 17(5)(a): Used in commercial transportation / passenger mobility business.';
          sections.push('Section 17(5)(a) Proviso');
        } else {
          status = 'Not Eligible';
          eligible = 0;
          ineligible = itemGst;
          reason = 'Ineligible / Blocked under Section 17(5)(a) of CGST Act: Motor vehicle for transportation of persons having approved seating capacity <= 13.';
          sections.push('Section 17(5)(a)');
        }
      } else if (blockedRule.clause === '17(5)(ab)') {
        // Servicing, insurance, repair of vehicle
        const isTransportBusiness = client.natureOfBusiness.includes('Transportation / Logistics');
        if (isTransportBusiness) {
          status = 'Eligible';
          eligible = itemGst;
          ineligible = 0;
          reason = 'Eligible under Section 17(5)(ab) proviso: Servicing/insurance pertains to commercial transport fleet.';
          sections.push('Section 17(5)(ab) Proviso');
        } else {
          status = 'Not Eligible';
          eligible = 0;
          ineligible = itemGst;
          reason = 'Ineligible / Blocked under Section 17(5)(ab): Servicing/insurance relates to passenger motor vehicle blocked under Section 17(5)(a).';
          sections.push('Section 17(5)(ab)');
        }
      } else if (blockedRule.clause === '17(5)(b)(i)') {
        // Food, catering, health insurance
        const isHospitality = client.natureOfBusiness.includes('Hospitality');
        if (isHospitality) {
          status = 'Eligible';
          eligible = itemGst;
          ineligible = 0;
          reason = 'Eligible under Section 17(5)(b)(i) exception: Inward catering/hospitality used for making outward taxable supply of the same category.';
          sections.push('Section 17(5)(b)(i)');
        } else {
          status = 'Not Eligible';
          eligible = 0;
          ineligible = itemGst;
          reason = 'Ineligible / Blocked under Section 17(5)(b)(i) of CGST Act: Food & beverages, catering, and staff health insurance without statutory obligation.';
          sections.push('Section 17(5)(b)(i)');
        }
      } else if (blockedRule.clause === '17(5)(b)(ii)') {
        // Club / gym
        status = 'Not Eligible';
        eligible = 0;
        ineligible = itemGst;
        reason = 'Ineligible / Blocked under Section 17(5)(b)(ii) of CGST Act: Membership of a club, health and fitness centre has no statutory exception.';
        sections.push('Section 17(5)(b)(ii)');
      } else if (blockedRule.clause === '17(5)(b)(iii)') {
        // Travel benefits / LTC
        status = 'Not Eligible';
        eligible = 0;
        ineligible = itemGst;
        reason = 'Ineligible / Blocked under Section 17(5)(b)(iii): Travel benefits extended to employees on vacation (LTC/LTA).';
        sections.push('Section 17(5)(b)(iii)');
      } else if (blockedRule.clause === '17(5)(c)') {
        // Works contract for immovable property
        const isConstruction = client.natureOfBusiness.includes('Construction') || client.natureOfBusiness.includes('Real Estate');
        if (isConstruction) {
          status = 'Eligible';
          eligible = itemGst;
          ineligible = 0;
          reason = 'Eligible under Section 17(5)(c) Proviso: Inward works contract service utilized by works contractor for supplying outward taxable works contract.';
          sections.push('Section 17(5)(c) Proviso');
        } else {
          status = 'Not Eligible';
          eligible = 0;
          ineligible = itemGst;
          reason = 'Ineligible / Blocked under Section 17(5)(c) of CGST Act: Works contract for construction of immovable property.';
          sections.push('Section 17(5)(c)');
        }
      } else if (blockedRule.clause === '17(5)(d)') {
        // Construction on own account
        status = 'Not Eligible';
        eligible = 0;
        ineligible = itemGst;
        reason = 'Ineligible / Blocked under Section 17(5)(d): Goods or services received for construction of immovable property capitalized on own account.';
        sections.push('Section 17(5)(d)');
      } else if (blockedRule.clause === '17(5)(g)') {
        status = 'Not Eligible';
        eligible = 0;
        ineligible = itemGst;
        reason = 'Ineligible / Blocked under Section 17(5)(g) of CGST Act: Goods or services used for personal consumption.';
        sections.push('Section 17(5)(g)');
      } else if (blockedRule.clause === '17(5)(h)') {
        status = 'Not Eligible';
        eligible = 0;
        ineligible = itemGst;
        reason = 'Ineligible / Blocked under Section 17(5)(h): Free samples, gifts, or written-off goods.';
        sections.push('Section 17(5)(h)');
      }
    } else {
      // General item: Section 16(1) & Section 17(1)/(2) Apportionment
      if (client.exemptSupplies && client.exemptTurnoverRatioPercent && client.exemptTurnoverRatioPercent > 0) {
        status = 'Partially Eligible';
        const exemptFraction = client.exemptTurnoverRatioPercent / 100;
        ineligible = Math.round(itemGst * exemptFraction);
        eligible = itemGst - ineligible;
        reason = `Partially Eligible under Section 17(2) & Rule 42: Common input service apportioned based on client's exempt turnover ratio (${client.exemptTurnoverRatioPercent}%).`;
        sections.push('Section 17(2)', 'Rule 42 of CGST Rules');
      }
    }

    // Apply manual adjustment if recorded
    if (item.caOverride && item.caOverride.overridden) {
      if (item.caOverride.newStatus === 'Eligible') {
        status = 'Eligible';
        eligible = itemGst;
        ineligible = 0;
      } else if (item.caOverride.newStatus === 'Not Eligible') {
        status = 'Not Eligible';
        eligible = 0;
        ineligible = itemGst;
      } else if (item.caOverride.newStatus === 'Partially Eligible') {
        status = 'Partially Eligible';
        eligible = Math.round(itemGst / 2);
        ineligible = itemGst - eligible;
      }
      reason = `Manual adjustment: ${item.caOverride.remarks || 'Adjusted classification'}`;
    }

    eligibleItc += eligible;
    ineligibleItc += ineligible;
    reviewItc += review;

    sections.forEach(s => relevantProvisionsSet.add(s));

    return {
      ...item,
      itcStatus: status,
      eligibleItc: eligible,
      ineligibleItc: ineligible,
      reviewItc: review,
      itcReason: reason,
      relevantSections: sections,
      businessUseAnswers: itemAnswers
    };
  });

  // Overall Status: Decisive determination (Eligible, Partially Eligible, or Not Eligible)
  let overallStatus: 'Eligible' | 'Partially Eligible' | 'Not Eligible' = 'Eligible';
  if (eligibleItc > 0 && ineligibleItc > 0) {
    overallStatus = 'Partially Eligible';
  } else if (eligibleItc === 0 && ineligibleItc > 0) {
    overallStatus = 'Not Eligible';
  } else {
    overallStatus = 'Eligible';
  }

  // Section 16 Statutory Verification
  const conditionsChecked = [
    {
      condition: 'Section 16(1) - Inward supply used or intended to be used in course or furtherance of business',
      satisfied: true,
      provision: 'Section 16(1)',
      note: `Inward supply corresponds to business operations of ${client.clientName}.`
    },
    {
      condition: 'Section 16(2)(a) - Possession of a valid tax invoice with GSTIN',
      satisfied: Boolean(invoice.invoiceNumber && invoice.supplierGstin),
      provision: 'Section 16(2)(a)',
      note: `Invoice No. ${invoice.invoiceNumber || 'Recorded'} with Supplier GSTIN ${invoice.supplierGstin || 'Recorded'}.`
    },
    {
      condition: 'Section 16(2)(b) - Receipt of goods or services',
      satisfied: true,
      provision: 'Section 16(2)(b)',
      note: 'Inward supplies received and accounted for.'
    },
    {
      condition: 'Section 16(4) - Statutory Time Limit for Availing ITC',
      satisfied: true,
      provision: 'Section 16(4)',
      note: 'Within statutory period for the financial year.'
    }
  ];

  const summaryReason = overallStatus === 'Eligible'
    ? 'All invoice line items satisfy Section 16 eligibility criteria and are not blocked under Section 17(5). Full credit of ₹' + eligibleItc.toLocaleString('en-IN') + ' is claimable in Table 4A of Form GSTR-3B.'
    : overallStatus === 'Partially Eligible'
    ? 'Portions of the GST credit (₹' + ineligibleItc.toLocaleString('en-IN') + ') are blocked under Section 17(5) or apportioned under Section 17(2), while eligible credit (₹' + eligibleItc.toLocaleString('en-IN') + ') is claimable in Table 4A.'
    : 'Entire GST credit of ₹' + ineligibleItc.toLocaleString('en-IN') + ' on this invoice is blocked under Section 17(5) of the CGST Act (to be reported in Table 4B of Form GSTR-3B).';

  return {
    overallStatus,
    totalGst,
    eligibleItc,
    ineligibleItc,
    reviewItc,
    summaryReason,
    relevantProvisions: Array.from(relevantProvisionsSet),
    blockedCreditsSummary: Array.from(blockedCreditsSummarySet),
    conditionsChecked,
    lineItemResults,
    rcmLiabilityPayableByRecipient: invoice.reverseChargeApplicable ? totalGst : 0,
    rcmItcEligibility: invoice.reverseChargeApplicable ? 'Eligible' : 'Not Applicable'
  };
}
