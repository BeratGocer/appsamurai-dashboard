// Decode ad network codes from Adnetworkler.csv
export function decodeAdNetwork(code: string): string {
  if (!code) return code;
  
  const cleanCode = code.trim();
  
  // Handle comma-separated codes (e.g., "34631_5406,undefined" -> "34631_5406")
  if (cleanCode.includes(',')) {
    const firstPart = cleanCode.split(',')[0].trim();
    if (firstPart) {
      return decodeAdNetwork(firstPart); // Recursively decode the first part
    }
  }
  
  // Ayet Studios için özel durum - UFVCL ile başlayan tüm kodlar
  if (cleanCode.startsWith('UFVCL')) {
    return 'Ayet Studios';
  }
  
  // Esnek arama fonksiyonu - büyük küçük harf duyarsız
  const findMapping = (mappings: Record<string, string>, searchCode: string): string | null => {
    // Önce tam eşleşme ara (büyük küçük harf duyarsız)
    for (const [key, value] of Object.entries(mappings)) {
      if (key.toLowerCase() === searchCode.toLowerCase()) {
        return value;
      }
    }
    return null;
  };
  
  // S ile başlayan ad network kodları (Adnetworkler.csv'den)
  const sNetworkMappings: Record<string, string> = {
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
    'SIE': 'Influence Mobile',
    'SAM': 'ATM',
    'SCE': 'Catbyte',
    'SEZ': 'Efez',
    'SJK': 'JumpTask API',
    'SWK': 'AppsPrize',
    'STR': 'TradeDoubler',
    'SBL': 'Buzzvil',
    'SAS': 'Ad for Us',
    'SMN': 'Mode Earn App',
    'SRY': 'Rewardy',
    'STS': 'TapChamps',
    'S2': 'Klink',
    'SAT': 'AppQwest',
    'SER': 'EmberFund'
  };
  
  // S network kodları için esnek arama
  const sNetworkResult = findMapping(sNetworkMappings, cleanCode);
  if (sNetworkResult) return sNetworkResult;
  
  // Fluent için kapsamlı sayı kuralları - ÖNCE BUNLAR KONTROL EDİLMELİ
  // 0. Boşluklu formatları temizle (34631_ 206305 -> 34631_206305)
  if (/^\d+_\s+\d+$/.test(cleanCode)) {
    const cleanedCode = cleanCode.replace(/\s+/g, '');
    if (/^\d+_\d+$/.test(cleanedCode)) {
      return 'Fluent';
    }
  }
  
  // 1. Sayı + underscore (34631_, 45209_)
  if (/^\d+_$/.test(cleanCode)) {
    return 'Fluent';
  }
  
  // 2. Sayı + underscore + sayı (34631_5406, 45209_5406) - ÖNEMLİ: Bu önce kontrol edilmeli
  if (/^\d+_\d+$/.test(cleanCode)) {
    return 'Fluent';
  }
  
  // 3. Sayı + underscore + metin (34631_dshop, 34631_rwc01)
  if (/^\d+_[a-zA-Z]/.test(cleanCode)) {
    return 'Fluent';
  }
  
  // 4. Sayı + underscore + karmaşık metin (34631_13821-207475-youtube)
  if (/^\d+_\d+-\d+-[a-zA-Z]+$/.test(cleanCode)) {
    return 'Fluent';
  }
  
  // 5. Sayı + underscore + BM/PSP formatı (45209_BM-207288, 45209_PSP-200540)
  if (/^\d+_[A-Z]+-\d+$/.test(cleanCode)) {
    return 'Fluent';
  }
  
  // 6. Sayı + underscore + reward formatı (45209_reward-205771)
  if (/^\d+_reward-\d+$/.test(cleanCode)) {
    return 'Fluent';
  }
  
  // 7. Sadece sayılar (206305 gibi)
  if (/^\d+$/.test(cleanCode)) {
    return 'Fluent';
  }
  
  // Eğer hiçbir kural eşleşmezse, orijinal kodu döndür
  return cleanCode;
}

// CSV parser utilities for backend
export const parseCSV = (content: string) => {
  // Add CSV parsing logic here if needed
  return [];
};
