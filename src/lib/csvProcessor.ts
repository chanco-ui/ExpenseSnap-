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
    complete: (results: Papa.ParseResult<string[]>) => {
      try {
        // パースエラーをチェック
        if (results.errors && results.errors.length > 0) {
          console.error('PapaParseエラー:', results.errors);
          reject(new Error('CSVファイルの読み込みに失敗しました'));
          return;
        }
        
        const transactions: CSVTransaction[] = [];
        
        for (const row of results.data) {
          if (row.length < 2) continue;
          
          // ヘッダー行をスキップ（日付が含まれていない行）
          const firstCell = row[0]?.trim() || '';
          if (!formatDate(firstCell) && firstCell.length > 0 && !firstCell.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
            continue;
          }
          
          // 日付を探す（1列目から）
          let dateIndex = -1;
          let formattedDate: string | null = null;
          
          for (let i = 0; i < Math.min(3, row.length); i++) {
            const cell = row[i]?.trim() || '';
            const date = formatDate(cell);
            if (date) {
              dateIndex = i;
              formattedDate = date;
              break;
            }
          }
          
          // 日付が見つからない場合はスキップ
          if (!formattedDate) continue;
          
          // 取引先を探す（日付の次の列から）
          let merchant = '';
          let merchantIndex = dateIndex + 1;
          
          // 取引先が空の場合は次の列を確認
          while (merchantIndex < row.length && (!row[merchantIndex] || row[merchantIndex].trim() === '')) {
            merchantIndex++;
          }
          
          if (merchantIndex < row.length) {
            merchant = row[merchantIndex].trim();
          }
          
          // 取引先が見つからない場合はスキップ
          if (!merchant) continue;
          
          // 金額を探す（複数の列を確認: 3列目、5列目、6列目など）
          let amount = 0;
          let amountFound = false;
          
          // 金額の可能性がある列を順に確認
          const amountCandidates = [
            dateIndex + 2, // 通常の3列目
            dateIndex + 4, // 5列目
            dateIndex + 5, // 6列目
          ];
          
          for (const index of amountCandidates) {
            if (index < row.length && row[index]) {
              const amountStr = row[index].trim();
              // 負の値も含めて数値を抽出
              const extractedAmount = parseInt(amountStr.replace(/[^\d-]/g, ''), 10);
              
              if (!isNaN(extractedAmount) && extractedAmount !== 0) {
                amount = Math.abs(extractedAmount); // 絶対値で保存
                amountFound = true;
                break;
              }
            }
          }
          
          // 金額が見つかった場合のみ追加
          if (amountFound && amount > 0) {
            transactions.push({
              date: formattedDate,
              merchant: merchant,
              amount
            });
          }
        }
        
        resolve(transactions);
      } catch (error) {
        console.error('CSV解析エラー:', error);
        reject(new Error('CSVファイルの解析に失敗しました'));
      }
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