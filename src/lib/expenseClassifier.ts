import { CSVTransaction, LearningData } from '@/types';
import { getMemoForCategory } from '@/constants/expenseCategories';

// 取引先名から経費科目を判定するルール
const MERCHANT_RULES: Record<string, string> = {
  'スターバックス': '717', // 福利厚生費
  'マクドナルド': '717', // 福利厚生費
  'セブンイレブン': '717', // 福利厚生費
  'ローソン': '717', // 福利厚生費
  'ファミリーマート': '717', // 福利厚生費
  'ガソリンスタンド': '723', // 燃料費
  'ENEOS': '723', // 燃料費
  '出光': '723', // 燃料費
  'コスモ': '723', // 燃料費
  'NTT': '724', // 通信費
  'KDDI': '724', // 通信費
  'ソフトバンク': '724', // 通信費
  '東京電力': '725', // 水道光熱費
  '関西電力': '725', // 水道光熱費
  '東京ガス': '725', // 水道光熱費
  '大阪ガス': '725', // 水道光熱費
  '水道局': '725', // 水道光熱費
  '国税庁': '726', // 租税公課
  '税務署': '726', // 租税公課
  '都税事務所': '726', // 租税公課
  '区役所': '726', // 租税公課
  '市役所': '726', // 租税公課
  'ホテル': '722', // 旅費交通費
  '旅館': '722', // 旅費交通費
  '航空': '722', // 旅費交通費
  'JR': '722', // 旅費交通費
  '地下鉄': '722', // 旅費交通費
  'バス': '722', // 旅費交通費
  'タクシー': '722', // 旅費交通費
  'レストラン': '727', // 交際費
  '居酒屋': '727', // 交際費
  'カフェ': '727', // 交際費
  '会議室': '737', // 会議費
  'コワーキング': '737', // 会議費
  'オフィス': '737', // 会議費
  '文具': '729', // 事務用品費
  'オフィス用品': '729', // 事務用品費
  '文房具': '729', // 事務用品費
  '消耗品': '728', // 消耗品費
  'リース': '738', // リース料
  '保険': '733', // 保険料
  '手数料': '734', // 支払手数料
  '会費': '739', // 諸会費
  '新聞': '741', // 新聞図書費
  '図書': '741', // 新聞図書費
  '家賃': '744', // 地代家賃
  '賃貸': '744', // 地代家賃
};

export interface ClassificationResult {
  category: string;
  confidence: number;
  memo: string;
  learningData?: LearningData;
}

export const classifyExpense = (
  transaction: CSVTransaction,
  learningData: LearningData[] = []
): ClassificationResult => {
  const { merchant, amount } = transaction;
  
  // 1. 学習データから判定（最優先）
  const learningMatch = learningData.find(data => 
    data.merchant.toLowerCase().includes(merchant.toLowerCase()) ||
    merchant.toLowerCase().includes(data.merchant.toLowerCase())
  );
  
  if (learningMatch) {
    // 学習データがある場合は、それを最優先で使用
    const confidence = Math.min(0.95, 0.7 + (learningMatch.frequency * 0.05));
    const memo = learningMatch.lastMemo || getMemoForCategory(learningMatch.category, amount);
    
    return {
      category: learningMatch.category,
      confidence,
      memo,
      learningData: learningMatch
    };
  }
  
  // 2. ルールベース判定（学習データがない場合のみ）
  for (const [keyword, category] of Object.entries(MERCHANT_RULES)) {
    if (merchant.toLowerCase().includes(keyword.toLowerCase())) {
      const memo = getMemoForCategory(category, amount);
      return {
        category,
        confidence: 0.6, // 学習データより低い信頼度
        memo
      };
    }
  }
  
  // 3. 金額ベースの推定（最後の手段）
  let estimatedCategory = '745'; // 雑費（デフォルト）
  let confidence = 0.3;
  
  if (amount >= 50000) {
    estimatedCategory = '744'; // 地代家賃
    confidence = 0.4;
  } else if (amount >= 10000) {
    estimatedCategory = '722'; // 旅費交通費
    confidence = 0.4;
  } else if (amount >= 5000) {
    estimatedCategory = '727'; // 交際費
    confidence = 0.4;
  } else if (amount >= 1000) {
    estimatedCategory = '717'; // 福利厚生費
    confidence = 0.4;
  }
  
  const memo = getMemoForCategory(estimatedCategory, amount);
  
  return {
    category: estimatedCategory,
    confidence,
    memo
  };
};

export const updateLearningData = (
  merchant: string,
  category: string,
  memo: string,
  existingData?: LearningData
): LearningData => {
  if (existingData) {
    return {
      ...existingData,
      category,
      frequency: existingData.frequency + 1,
      lastMemo: memo,
      updatedAt: new Date()
    };
  }
  
  return {
    id: '',
    merchant,
    category,
    frequency: 1,
    lastMemo: memo,
    updatedAt: new Date()
  };
}; 