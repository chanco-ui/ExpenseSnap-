import { ExpenseCategory } from '@/types';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { code: '350', name: '役員借入金' },
  { code: '316', name: '預り金1(源泉)' },
  { code: '317', name: '預り金2(市県民税)' },
  { code: '716', name: '法定福利費' },
  { code: '717', name: '福利厚生費' },
  { code: '718', name: '広告宣伝費' },
  { code: '722', name: '旅費交通費' },
  { code: '727', name: '交際費' },
  { code: '737', name: '会議費' },
  { code: '723', name: '燃料費' },
  { code: '724', name: '通信費' },
  { code: '725', name: '水道光熱費' },
  { code: '726', name: '租税公課' },
  { code: '728', name: '消耗品費' },
  { code: '729', name: '事務用品費' },
  { code: '738', name: 'リース料' },
  { code: '732', name: '修繕費' },
  { code: '733', name: '保険料' },
  { code: '734', name: '支払手数料' },
  { code: '739', name: '諸会費' },
  { code: '741', name: '新聞図書費' },
  { code: '743', name: '報酬手当' },
  { code: '744', name: '地代家賃' },
  { code: '745', name: '雑費' },
];

export const MEMO_RULES = {
  '737': { // 会議費
    default: ['打ち合わせ 工藤さん', '商談 浅井さん'],
    highAmount: ['打ち合わせ 工藤さん', '商談 浅井さん', '会議 岩渕さん'],
    threshold: 5000
  },
  '722': { // 旅費交通費
    default: ['打ち合わせ 工藤さん', '打ち合わせ 浅井さん'],
    highAmount: ['打ち合わせ 岩渕さん'],
    threshold: 10000
  }
};

export const getMemoForCategory = (category: string, amount: number): string => {
  const rule = MEMO_RULES[category as keyof typeof MEMO_RULES];
  
  if (!rule) {
    // その他の科目は一般的な用途
    return '経費';
  }

  const options = amount >= rule.threshold ? rule.highAmount : rule.default;
  const randomIndex = Math.floor(Math.random() * options.length);
  return options[randomIndex];
};

export const getCategoryName = (code: string): string => {
  const category = EXPENSE_CATEGORIES.find(cat => cat.code === code);
  return category?.name || '未分類';
}; 