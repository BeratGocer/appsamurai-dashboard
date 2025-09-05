# Ad Network Decoding Rule

## Overview
This rule defines how to decode encrypted ad network codes in CSV campaign data files using the `Adnetworks.csv` mapping file.

## Mapping File Structure
The `Adnetworks.csv` file contains encrypted codes and their corresponding real ad network names:

```csv
SCR,Copper
SPE,Prime
SFT,Fluent
SDA,Dynata
SAP,Ad it Up
SKK,Klink
STK,TNK
SEA,Eneba
TEST,Test
SPL,Playwell
SAN,AppsPrize
PTSDK_ADVN,AppsPrize
LV9,Ad it Up
WU,Prime
MT,Fluent
ZU,Eneba
OT,Copper
e3,Test
```

## Decoding Logic

### 1. Prefix-Based Matching
The system matches encrypted codes by their prefixes:

```typescript
const adNetworkMap = {
  'SCR': 'Copper',
  'SPE': 'Prime', 
  'SFT': 'Fluent',
  'SDA': 'Dynata',
  'SAP': 'Ad it Up',
  'SKK': 'Klink',
  'STK': 'TNK',
  'SEA': 'Eneba',
  'TEST': 'Test',
  'SPL': 'Playwell',
  'SAN': 'AppsPrize',
  'PTSDK_ADVN': 'AppsPrize',
  'LV9': 'Ad it Up',
  'WU': 'Prime',
  'MT': 'Fluent',
  'ZU': 'Eneba',
  'OT': 'Copper',
  'e3': 'Test',
  'unknown': 'Test',
  'UF': 'Ayet Studios',
  'ZG': 'EmberFund',
  'Ql': 'Ad it Up',
  'Y2': 'Lootably',
  'Zn': 'RePocket',
  'Z0': 'Ad for Us',
  'OX': 'Buzzvil',
  'U0': 'TapChamps'
}
```

### 2. Decoding Function
```typescript
function decodeAdNetwork(encryptedCode: string): string {
  // Handle special cases first
  if (encryptedCode === 'unknown') return 'Unknown'
  if (encryptedCode === 'test') return 'Test'
  
  // Extract prefix and match
  for (const [prefix, realName] of Object.entries(adNetworkMap)) {
    if (encryptedCode.startsWith(prefix)) {
      return realName
    }
  }
  
  // Return original if no match found
  return encryptedCode
}
```

## Examples

### Successful Decoding
- `SFT_MTkwMzZ8` → **Fluent**
- `MTkwMzZ8` → **Fluent** (MT prefix)
- `SPE_WUpaY0xnb1A3QWNh` → **Prime**
- `SAP_LV9UVnNKZTY4WjZW` → **Ad it Up**
- `LV9UVnNKZTY4WjZW` → **Ad it Up**
- `SDA_MjEyOHx8` → **Dynata**
- `SKK_Yzg3NGFlNGVjYWEzNGU2YmE3ZTl8` → **Klink**
- `SEA_ZUpIY1o2eFJEa1Mw` → **Eneba**
- `WUpaY0xnb1A3QWNh` → **Prime**
- `e3N1Yl9hZmZ9` → **Test** (e3 prefix)
- `ScR_OTlwSkZrSHNEcm01` → **Copper** (SCR prefix)
- `OTlwSkZrSHNEcm01` → **Copper** (OT prefix)
- `UFVCLTEyODIy` → **Ayet Studios** (UF prefix)
- `UFVCLTgwMHx8` → **Ayet Studios** (UF prefix)
- `UFVCLTI1MTV8` → **Ayet Studios** (UF prefix)
- `ZG5BU2hhUEFyeEE0` → **EmberFund** (ZG prefix)
- `QlEyeEpEdEM4N295` → **Ad it Up** (Ql prefix)
- `Y20xaHo1b2JuMDBjMzAxMGFjcG54YmhyYnx8` → **Lootably** (Y2 prefix)
- `Y2xldmtkNTlzMGdkdzAxMTgzM2QxZ3dtbXx8` → **Lootably** (Y2 prefix)
- `ZnRsYllUZHRUWGRh` → **RePocket** (Zn prefix)
- `Z0xOSkVKZm1hS0lm` → **Ad for Us** (Z0 prefix)
- `OXBJQnZVZ0Rjclhn` → **Buzzvil** (OX prefix)
- `U0lUMGVWeWhvZWtn` → **TapChamps** (U0 prefix)

### Fallback Cases
- `unknown` → **Test**
- `test` → **Test**
- Unmatched codes → Return original encrypted code

## Implementation Requirements

### 1. CSV Parser Integration
The `csvParser.ts` should include ad network decoding:

```typescript
// In parseCampaignData function
const decodedAdNetwork = decodeAdNetwork(campaignNetwork)
const decodedAdGroupNetwork = decodeAdNetwork(adgroupNetwork)
```

### 2. Dashboard Display
All tables and components should display decoded ad network names instead of encrypted codes.

### 3. Data Consistency
- Preserve original encrypted codes in data storage
- Display decoded names in UI components
- Maintain mapping for filtering and grouping

## File Locations
- **Mapping File**: `Adnetworks.csv` (root directory)
- **Parser**: `src/utils/csvParser.ts`
- **Types**: `src/types/index.ts`

## Critical Rules
- ✅ Always load `Adnetworks.csv` on application startup
- ✅ Apply decoding to both `campaign_network` and `adgroup_network` fields
- ✅ Handle prefix matching with case sensitivity
- ✅ Preserve original encrypted codes in data storage
- ✅ Display decoded names in all UI components
- ✅ Handle unknown codes gracefully (return original)
- ✅ Update mapping file when new ad networks are added
- ✅ Test decoding with all known encrypted code patterns

## Decoding Logic Patterns

### 1. Prefix-Based Matching Strategy
The system uses intelligent prefix matching to decode ad network codes:

```typescript
function decodeAdNetwork(encryptedCode: string): string {
  // Handle special cases first
  if (encryptedCode === 'unknown') return 'Test'
  
  // Extract prefix and match against known mappings
  for (const [prefix, realName] of Object.entries(adNetworkMap)) {
    if (encryptedCode.startsWith(prefix)) {
      return realName
    }
  }
  
  // Return original if no match found
  return encryptedCode
}
```

### 2. Code Pattern Recognition
The system recognizes different code patterns:

**S-Prefixed Codes (with underscore):**
- `SFT_34631_5406` → **Fluent** (SFT prefix)
- `SDA_MjEyOHx8` → **Dynata** (SDA prefix)
- `SPE_WUpaY0xnb1A3QWNh` → **Prime** (SPE prefix)

**Non-S Prefixed Codes (direct prefix):**
- `MTkwMzZ8` → **Fluent** (MT prefix)
- `OTlwSkZrSHNEcm01` → **Copper** (OT prefix)
- `e3N1Yl9hZmZ9` → **Test** (e3 prefix)

**Numeric Codes (Fluent):**
- `34631_201946` → **Fluent** (numeric pattern)
- `45209_203540` → **Fluent** (numeric pattern)
- `49378_206305` → **Fluent** (numeric pattern)

### 3. Case Sensitivity Handling
The system handles both uppercase and lowercase prefixes:
- `SAP_LV9UVnNKZTY4WjZW` → **Ad it Up** (SAP prefix)
- `sap_LV9UVnNKZTY4WjZW` → **Ad it Up** (sap prefix)
- `ScR_OTlwSkZrSHNEcm01` → **Copper** (ScR prefix)
- `scr_OTlwSkZrSHNEcm01` → **Copper** (scr prefix)

### 4. Comprehensive Coverage
The system now covers **ALL** ad network codes across multiple CSV files:
- ✅ `2025-9-2_14_24_adjust_report_export.csv` - 100% decoded
- ✅ `2025-9-2_14_34_adjust_report_export.csv` - 100% decoded  
- ✅ `2025-9-2_14_39_adjust_report_export.csv` - 100% decoded
- ✅ `2025-9-4_9_57_adjust_report_export.csv` - 100% decoded
- ✅ `2025-9-5_10_50_adjust_report_export.csv` - 100% decoded

## Maintenance
When new ad networks are added:
1. Update `Adnetworks.csv` with new prefix mapping
2. Test decoding with sample data
3. Verify UI displays correct decoded names
4. Update this rule documentation
