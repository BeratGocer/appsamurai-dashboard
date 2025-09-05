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
  'e3': 'Test'
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

### Fallback Cases
- `unknown` → **Unknown**
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

## Maintenance
When new ad networks are added:
1. Update `Adnetworks.csv` with new prefix mapping
2. Test decoding with sample data
3. Verify UI displays correct decoded names
4. Update this rule documentation
