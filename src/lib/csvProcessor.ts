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
        let lastDate: string | null = null; // 前の行の日付を保持
        
        for (const row of results.data) {
          if (row.length < 2) continue;
          
          // ヘッダー行をスキップ（日付が含まれていない行）
          const firstCell = row[0]?.trim() || '';
          if (!formatDate(firstCell) && firstCell.length > 0 && !firstCell.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
            // カード情報のヘッダー行の可能性があるので、日付をリセット
            if (firstCell.includes('**') || firstCell.includes('カード')) {
              lastDate = null;
            }
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
              lastDate = date; // 日付を更新
              break;
            }
          }
          
          // 日付が見つからない場合は、前の行の日付を使用
          if (!formattedDate) {
            if (lastDate) {
              formattedDate = lastDate;
              dateIndex = -1; // 日付列が見つからない
            } else {
              continue; // 日付も前の行の日付もない場合はスキップ
            }
          }
          
          // 取引先を探す（日付の次の列から、または1列目から）
          let merchant = '';
          let merchantStartIndex = dateIndex >= 0 ? dateIndex + 1 : 0;
          
          // 取引先が空の場合は次の列を確認
          while (merchantStartIndex < row.length && (!row[merchantStartIndex] || row[merchantStartIndex].trim() === '')) {
            merchantStartIndex++;
          }
          
          // 取引先が複数の列に分割されている可能性がある（カンマを含む場合）
          // 金額が見つかるまでの列を結合
          if (merchantStartIndex < row.length) {
            const merchantParts: string[] = [];
            let foundAmount = false;
            
            // 金額を探しながら、取引先の列を特定
            for (let i = merchantStartIndex; i < row.length && !foundAmount; i++) {
              const cell = row[i]?.trim() || '';
              
              // 金額の可能性をチェック
              const extractedAmount = parseInt(cell.replace(/[^\d-]/g, ''), 10);
              if (!isNaN(extractedAmount) && extractedAmount !== 0 && Math.abs(extractedAmount) > 100) {
                // 金額らしい値が見つかった
                foundAmount = true;
                break;
              }
              
              // 金額でない場合は取引先の一部として追加
              if (cell && !cell.match(/^[�P-]+$/) && !cell.match(/^\d+$/)) {
                merchantParts.push(cell);
              }
            }
            
            // 取引先を結合
            merchant = merchantParts.join(' ').trim();
            
            // 取引先が見つからない場合は、最初の非空列を使用
            if (!merchant && merchantStartIndex < row.length) {
              merchant = row[merchantStartIndex].trim();
            }
          }
          
          // 取引先が見つからない場合はスキップ
          if (!merchant) continue;
          
          // 金額を探す（複数の列を確認: 3列目、4列目、5列目、6列目、7列目など）
          let amount = 0;
          let amountFound = false;
          
          // 金額の可能性がある列を順に確認（より広範囲に）
          const amountCandidates = [
            dateIndex >= 0 ? dateIndex + 2 : 2, // 通常の3列目
            dateIndex >= 0 ? dateIndex + 3 : 3, // 4列目
            dateIndex >= 0 ? dateIndex + 4 : 4, // 5列目
            dateIndex >= 0 ? dateIndex + 5 : 5, // 6列目
            dateIndex >= 0 ? dateIndex + 6 : 6, // 7列目
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