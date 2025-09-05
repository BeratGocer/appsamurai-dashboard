# CSV Header Parsing Rule

## Critical Rule: No Column Headers in CSV Files

**IMPORTANT**: CSV files in this project do NOT have column headers.

### Key Points:

1. **First Row is Data**: The first row contains actual data, not column headers
2. **First Cell is Data**: The first cell of the first row is a data value, not a column title
3. **All Rows are Data**: Every row including the first row should be processed as data

### Backend Implementation:

- **Use Hardcoded Indices**: Column positions are fixed and hardcoded
- **No Header Search**: Never search for column names in the first row
- **Process All Rows**: Loop starts from index 0 (first row)

### CSV Format (20 columns):

```
Column 0:  gönder app
Column 1:  campaign_network  
Column 2:  adgroup_network
Column 3:  day
Column 4:  installs
Column 5:  ecpi
Column 6:  cost
Column 7:  all_revenue
Column 8:  roas_d0
Column 9:  roas_d1
Column 10: roas_d2
Column 11: roas_d3
Column 12: roas_d4
Column 13: roas_d5
Column 14: roas_d6
Column 15: roas_d7
Column 16: roas_d14
Column 17: roas_d21
Column 18: roas_d30
Column 19: roas_d45
```

### Backend Code Pattern:

```typescript
// Hardcoded column indices - NO HEADER PARSING
const iApp = 0      // gönder app
const iCN = 1       // campaign_network
const iAN = 2       // adgroup_network
const iDay = 3      // day
const iInst = 4     // installs
// ... etc

// Process ALL rows including first row
for (let li = 0; li < lines.length; li++) {
  // Process each row as data
}
```

### Never Do:

- ❌ Parse first row as headers
- ❌ Search for column names
- ❌ Skip first row
- ❌ Use `idx()` function to find column positions

### Always Do:

- ✅ Use hardcoded column indices
- ✅ Process all rows as data
- ✅ Start loop from index 0
- ✅ Treat first cell as data value

---

**This rule ensures CSV files without headers are processed correctly and prevents HTTP 400 errors during file upload.**
