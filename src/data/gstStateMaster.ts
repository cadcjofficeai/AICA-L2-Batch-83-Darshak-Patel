/**
 * Statutory GST State Code Master (India)
 * Rule 138 of CGST Rules & GST System Architecture
 */

export interface GstState {
  code: string;
  name: string;
  isUnionTerritory: boolean;
}

export const GST_STATE_MASTER: Record<string, GstState> = {
  '01': { code: '01', name: 'Jammu and Kashmir', isUnionTerritory: true },
  '02': { code: '02', name: 'Himachal Pradesh', isUnionTerritory: false },
  '03': { code: '03', name: 'Punjab', isUnionTerritory: false },
  '04': { code: '04', name: 'Chandigarh', isUnionTerritory: true },
  '05': { code: '05', name: 'Uttarakhand', isUnionTerritory: false },
  '06': { code: '06', name: 'Haryana', isUnionTerritory: false },
  '07': { code: '07', name: 'Delhi', isUnionTerritory: true },
  '08': { code: '08', name: 'Rajasthan', isUnionTerritory: false },
  '09': { code: '09', name: 'Uttar Pradesh', isUnionTerritory: false },
  '10': { code: '10', name: 'Bihar', isUnionTerritory: false },
  '11': { code: '11', name: 'Sikkim', isUnionTerritory: false },
  '12': { code: '12', name: 'Arunachal Pradesh', isUnionTerritory: false },
  '13': { code: '13', name: 'Nagaland', isUnionTerritory: false },
  '14': { code: '14', name: 'Manipur', isUnionTerritory: false },
  '15': { code: '15', name: 'Mizoram', isUnionTerritory: false },
  '16': { code: '16', name: 'Tripura', isUnionTerritory: false },
  '17': { code: '17', name: 'Meghalaya', isUnionTerritory: false },
  '18': { code: '18', name: 'Assam', isUnionTerritory: false },
  '19': { code: '19', name: 'West Bengal', isUnionTerritory: false },
  '20': { code: '20', name: 'Jharkhand', isUnionTerritory: false },
  '21': { code: '21', name: 'Odisha', isUnionTerritory: false },
  '22': { code: '22', name: 'Chhattisgarh', isUnionTerritory: false },
  '23': { code: '23', name: 'Madhya Pradesh', isUnionTerritory: false },
  '24': { code: '24', name: 'Gujarat', isUnionTerritory: false },
  '25': { code: '25', name: 'Daman and Diu (Pre-Merger)', isUnionTerritory: true },
  '26': { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu', isUnionTerritory: true },
  '27': { code: '27', name: 'Maharashtra', isUnionTerritory: false },
  '28': { code: '28', name: 'Andhra Pradesh (Old)', isUnionTerritory: false },
  '29': { code: '29', name: 'Karnataka', isUnionTerritory: false },
  '30': { code: '30', name: 'Goa', isUnionTerritory: false },
  '31': { code: '31', name: 'Lakshadweep', isUnionTerritory: true },
  '32': { code: '32', name: 'Kerala', isUnionTerritory: false },
  '33': { code: '33', name: 'Tamil Nadu', isUnionTerritory: false },
  '34': { code: '34', name: 'Puducherry', isUnionTerritory: true },
  '35': { code: '35', name: 'Andaman and Nicobar Islands', isUnionTerritory: true },
  '36': { code: '36', name: 'Telangana', isUnionTerritory: false },
  '37': { code: '37', name: 'Andhra Pradesh (New)', isUnionTerritory: false },
  '38': { code: '38', name: 'Ladakh', isUnionTerritory: true },
  '97': { code: '97', name: 'Other Territory', isUnionTerritory: true },
  '99': { code: '99', name: 'Centre Jurisdiction', isUnionTerritory: false },
};

/**
 * Standard Indian GSTIN Regex:
 * 2 digits state code + 5 chars PAN alphabets + 4 chars PAN digits + 1 char PAN alphabet
 * + 1 char entity code (1-9/A-Z) + 'Z' default + 1 check digit (0-9/A-Z)
 */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export function validateGstin(gstin: string): { isValid: boolean; error?: string; state?: GstState; pan?: string } {
  if (!gstin) {
    return { isValid: false, error: 'GSTIN cannot be empty' };
  }
  const clean = gstin.trim().toUpperCase();
  if (clean.length !== 15) {
    return { isValid: false, error: `GSTIN must be 15 characters (currently ${clean.length})` };
  }
  if (!GSTIN_REGEX.test(clean)) {
    return { isValid: false, error: 'Invalid GSTIN structure. Expected format: 24ABCDE1234F1Z5' };
  }

  const stateCode = clean.substring(0, 2);
  const state = GST_STATE_MASTER[stateCode];
  if (!state) {
    return { isValid: false, error: `Invalid GST state code '${stateCode}' in GSTIN` };
  }

  const pan = clean.substring(2, 12);
  return { isValid: true, state, pan };
}

export function validatePan(pan: string): { isValid: boolean; error?: string; entityType?: string } {
  if (!pan) {
    return { isValid: false, error: 'PAN cannot be empty' };
  }
  const clean = pan.trim().toUpperCase();
  if (clean.length !== 10) {
    return { isValid: false, error: `PAN must be 10 characters (currently ${clean.length})` };
  }
  if (!PAN_REGEX.test(clean)) {
    return { isValid: false, error: 'Invalid PAN structure. Expected format: ABCDE1234F' };
  }

  // 4th character of PAN indicates entity type
  const fourthChar = clean.charAt(3);
  let entityType = 'Other';
  switch (fourthChar) {
    case 'C': entityType = 'Company'; break;
    case 'P': entityType = 'Individual'; break;
    case 'H': entityType = 'HUF (Hindu Undivided Family)'; break;
    case 'F': entityType = 'Partnership Firm / LLP'; break;
    case 'A': entityType = 'Association of Persons (AOP)'; break;
    case 'T': entityType = 'Trust'; break;
    case 'B': entityType = 'Body of Individuals (BOI)'; break;
    case 'L': entityType = 'Local Authority'; break;
    case 'J': entityType = 'Artificial Juridical Person'; break;
    case 'G': entityType = 'Government'; break;
  }

  return { isValid: true, entityType };
}
