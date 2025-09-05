# CSV Backend Integration - Complete Column Support Rule

## Problem
CSV dosyalarında 20 sütun var ama backend'de sadece bazıları işleniyor. Kullanıcı ayarlardan sütun eklediğinde veri gelmiyor.

## CSV Columns (20 total)
1. `gönder app`
2. `campaign_network`
3. `adgroup_network`
4. `day`
5. `installs`
6. `ecpi`
7. `cost`
8. `all_revenue`
9. `roas_d0`
10. `roas_d1`
11. `roas_d2`
12. `roas_d3`
13. `roas_d4`
14. `roas_d5`
15. `roas_d6`
16. `roas_d7`
17. `roas_d14`
18. `roas_d21`
19. `roas_d30`
20. `roas_d45`

## Required Backend Changes

### 1. Prisma Schema Update
Add missing ROAS fields to `CampaignRow` model:
```prisma
roas_d1         Decimal? @db.Decimal(20,10)
roas_d2         Decimal? @db.Decimal(20,10)
roas_d3         Decimal? @db.Decimal(20,10)
roas_d4         Decimal? @db.Decimal(20,10)
roas_d5         Decimal? @db.Decimal(20,10)
roas_d6         Decimal? @db.Decimal(20,10)
roas_d14        Decimal? @db.Decimal(20,10)
roas_d21        Decimal? @db.Decimal(20,10)
```

### 2. Backend Interface Updates
Update `CampaignRowInput` and `AggregatedDate` interfaces to include all ROAS fields.

### 3. CSV Parsing Updates
Add index search for all ROAS fields:
```typescript
const iD1 = idx('roas_d1')
const iD2 = idx('roas_d2')
const iD3 = idx('roas_d3')
const iD4 = idx('roas_d4')
const iD5 = idx('roas_d5')
const iD6 = idx('roas_d6')
const iD14 = idx('roas_d14')
const iD21 = idx('roas_d21')
```

### 4. Aggregation Logic Updates
Add weighted average calculation for all ROAS fields in aggregation logic.

## Frontend Table Settings Persistence

### Requirement
Table column visibility settings must be synchronized across devices:
- User A adds D45 ROAS column on Computer A
- User B should see D45 ROAS column on Computer B for the same table
- Settings must be per-file and persistent

### Implementation
- Store table column visibility settings in `FileSettings` model
- Settings should include: `visibleColumns: string[]`
- Default visible columns: `['day', 'installs', 'roas_d0', 'roas_d7']`
- Settings should be saved when user toggles column visibility
- Settings should be loaded when user opens the table

## Default Table View
- Gün (day)
- Install (installs)  
- D0 ROAS (roas_d0)
- D7 ROAS (roas_d7)

## Migration Steps
1. Update Prisma schema
2. Run migration: `npx prisma migrate dev --name add_missing_roas_fields`
3. Update backend parsing logic
4. Update aggregation logic
5. Deploy backend changes
6. Test frontend column toggling
7. Implement settings persistence

## Testing
- Upload CSV file
- Check all 20 columns are processed in backend
- Toggle column visibility in frontend settings
- Verify data appears/disappears correctly
- Test settings persistence across devices
