import Papa from 'papaparse';
import { CSVTransaction, Transaction } from '@/types';

export const parseCSV = (file: File): Promise<CSVTransaction[]> => {
  return new Promise((resolve, reject) => {
    // ファイルをUTF-8として読み込み
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvContent = e.target?.result as string;
        
        // 文字化けを検出してShift_JISとして再読み込み
        if (csvContent.includes('') || csvContent.includes('')) {
          const shiftJisReader = new FileReader();
          shiftJisReader.onload = (e2) => {
            try {
              const shiftJisContent = e2.target?.result as string;
              parseCSVContent(shiftJisContent, resolve, reject);
            } catch {
              reject(new Error('Shift_JISファイルの読み込みに失敗しました'));
            }
          };
          shiftJisReader.onerror = () => {
            reject(new Error('Shift_JISファイルの読み込みに失敗しました'));
          };
          shiftJisReader.readAsText(file, 'Shift_JIS');
          return;
        }
        
        parseCSVContent(csvContent, resolve, reject);
      } catch {
        reject(new Error('ファイルの読み込みに失敗しました'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };
    
    // UTF-8として読み込み
    reader.readAsText(file, 'UTF-8');
  });
};

const parseCSVContent = (
  csvContent: string, 
  resolve: (transactions: CSVTransaction[]) => void, 
  reject: (error: Error) => void
) => {
  Papa.parse(csvContent, {
    header: false,
    skipEmptyLines: true,
    encoding: 'UTF-8',
    complete: (results: Papa.ParseResult<string[]>) => {
      try {
        const transactions: CSVTransaction[] = [];
        
        for (const row of results.data) {
          if (row.length >= 3) {
            const [date, merchant, amountStr] = row;
            
            // 日付の形式を統一
            const formattedDate = formatDate(date);
            
            // 金額を数値に変換
            const amount = parseInt(amountStr.replace(/[^\d]/g, ''), 10);
            
            if (formattedDate && merchant && !isNaN(amount)) {
              transactions.push({
                date: formattedDate,
                merchant: merchant.trim(),
                amount
              });
            }
          }
        }
        
        resolve(transactions);
      } catch {
        reject(new Error('CSVファイルの解析に失敗しました'));
      }
    },
    error: () => {
      reject(new Error('CSVファイルの読み込みに失敗しました'));
    }
  });
};

export const exportToCSV = (transactions: Transaction[]): string => {
  const csvData = transactions.map(transaction => [
    transaction.date,
    transaction.merchant,
    transaction.amount,
    '', // 空白列1
    '', // 空白列2
    transaction.category || '',
    transaction.memo || ''
  ]);
  
  return Papa.unparse(csvData);
};

export const downloadCSV = (csvContent: string, filename: string) => {
  // BOMを追加してUTF-8として保存
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

const formatDate = (dateStr: string): string | null => {
  // 様々な日付形式に対応
  const dateFormats = [
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, // 2025/5/17
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // 2025-5-17
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // 5/17/2025
  ];
  
  for (const format of dateFormats) {
    const match = dateStr.match(format);
    if (match) {
      const [, year, month, day] = match;
      return `${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`;
    }
  }
  
  return null;
}; 