import { LearningData } from '@/types';
import { updateLearningData } from './expenseClassifier';

const LEARNING_DATA_KEY = 'expense-learning-data';

export const saveLearningData = (learningData: LearningData[]) => {
  try {
    localStorage.setItem(LEARNING_DATA_KEY, JSON.stringify(learningData));
  } catch (error) {
    console.error('学習データの保存に失敗しました:', error);
  }
};

export const loadLearningData = (): LearningData[] => {
  try {
    const data = localStorage.getItem(LEARNING_DATA_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // 日付を復元
      return parsed.map((item: Omit<LearningData, 'updatedAt'> & { updatedAt: string }) => ({
        ...item,
        updatedAt: new Date(item.updatedAt)
      }));
    }
  } catch (error) {
    console.error('学習データの読み込みに失敗しました:', error);
  }
  return [];
};

export const addLearningData = (
  merchant: string,
  category: string,
  memo: string
): LearningData[] => {
  const existingData = loadLearningData();
  const existingIndex = existingData.findIndex(
    data => data.merchant.toLowerCase() === merchant.toLowerCase()
  );

  if (existingIndex >= 0) {
    // 既存データを更新
    existingData[existingIndex] = updateLearningData(
      merchant,
      category,
      memo,
      existingData[existingIndex]
    );
  } else {
    // 新規データを追加
    const newData: LearningData = {
      id: `learning-${Date.now()}`,
      merchant,
      category,
      frequency: 1,
      lastMemo: memo,
      updatedAt: new Date()
    };
    existingData.push(newData);
  }

  saveLearningData(existingData);
  return existingData;
};

export const getLearningHistory = (merchant: string): string => {
  const learningData = loadLearningData();
  const data = learningData.find(
    item => item.merchant.toLowerCase() === merchant.toLowerCase()
  );

  if (data) {
    const categoryName = getCategoryName(data.category);
    return `履歴: ${data.category} - ${categoryName} (${data.frequency}回) - ${data.lastMemo || 'なし'}`;
  }

  return '';
};

// カテゴリ名を取得する関数（expenseCategoriesからインポート）
const getCategoryName = (code: string): string => {
  const categories = {
    '350': '役員借入金',
    '316': '預り金1(源泉)',
    '317': '預り金2(市県民税)',
    '716': '法定福利費',
    '717': '福利厚生費',
    '718': '広告宣伝費',
    '722': '旅費交通費',
    '727': '交際費',
    '737': '会議費',
    '723': '燃料費',
    '724': '通信費',
    '725': '水道光熱費',
    '726': '租税公課',
    '728': '消耗品費',
    '729': '事務用品費',
    '738': 'リース料',
    '732': '修繕費',
    '733': '保険料',
    '734': '支払手数料',
    '739': '諸会費',
    '741': '新聞図書費',
    '743': '報酬手当',
    '744': '地代家賃',
    '745': '雑費'
  };
  return categories[code as keyof typeof categories] || '未分類';
};

// 備考欄の学習データを取得
export const getMemoLearningData = (merchant: string): string[] => {
  const learningData = loadLearningData();
  const data = learningData.find(
    item => item.merchant.toLowerCase() === merchant.toLowerCase()
  );

  if (data && data.lastMemo) {
    return [data.lastMemo];
  }

  return [];
};

// 学習データの統計情報を取得
export const getLearningStats = () => {
  const learningData = loadLearningData();
  
  const stats = {
    totalMerchants: learningData.length,
    totalLearningCount: learningData.reduce((sum, data) => sum + data.frequency, 0),
    mostLearned: learningData.sort((a, b) => b.frequency - a.frequency).slice(0, 5),
    recentLearning: learningData.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5)
  };
  
  return stats;
};

// 特定の取引先の学習詳細を取得
export const getMerchantLearningDetail = (merchant: string) => {
  const learningData = loadLearningData();
  const data = learningData.find(
    item => item.merchant.toLowerCase() === merchant.toLowerCase()
  );

  if (data) {
    return {
      merchant: data.merchant,
      category: data.category,
      categoryName: getCategoryName(data.category),
      frequency: data.frequency,
      lastMemo: data.lastMemo,
      lastUpdated: data.updatedAt,
      confidence: Math.min(0.95, 0.7 + (data.frequency * 0.05))
    };
  }

  return null;
}; 