export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category?: string;
  memo?: string;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningData {
  id: string;
  merchant: string;
  category: string;
  frequency: number;
  lastMemo?: string;
  updatedAt: Date;
}

export interface ExpenseCategory {
  code: string;
  name: string;
}

export interface CSVTransaction {
  date: string;
  merchant: string;
  amount: number;
  category?: string;
  memo?: string;
}

export interface ProcessingResult {
  success: boolean;
  message: string;
  data?: Transaction[] | LearningData[] | CSVTransaction[];
} 