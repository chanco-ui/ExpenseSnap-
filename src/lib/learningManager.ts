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
    return `履歴: ${data.category} (${data.frequency}回) - ${data.lastMemo || 'なし'}`;
  }

  return '';
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