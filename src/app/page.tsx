'use client';

import { useState } from 'react';
import { Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { Transaction } from '@/types';
import { parseCSV, exportToCSV, downloadCSV } from '@/lib/csvProcessor';
import { classifyExpense } from '@/lib/expenseClassifier';
import { EXPENSE_CATEGORIES, getCategoryName, getMemoForCategory } from '@/constants/expenseCategories';

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const csvTransactions = await parseCSV(file);
      const processedTransactions: Transaction[] = csvTransactions.map((csvTrans, index) => {
        const classification = classifyExpense(csvTrans);
        return {
          id: `transaction-${index}`,
          date: csvTrans.date,
          merchant: csvTrans.merchant,
          amount: csvTrans.amount,
          category: classification.category,
          memo: classification.memo,
          confidence: classification.confidence,
          isConfirmed: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });

      setTransactions(processedTransactions);
    } catch (error) {
      console.error('CSV処理エラー:', error);
      alert('CSVファイルの処理に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCategoryChange = (id: string, category: string) => {
    setTransactions(prev => prev.map(trans => {
      if (trans.id === id) {
        const memo = getMemoForCategory(category, trans.amount);
        return {
          ...trans,
          category,
          memo,
          confidence: 1.0,
          updatedAt: new Date()
        };
      }
      return trans;
    }));
  };

  const handleMemoChange = (id: string, memo: string) => {
    setTransactions(prev => prev.map(trans => {
      if (trans.id === id) {
        return {
          ...trans,
          memo,
          updatedAt: new Date()
        };
      }
      return trans;
    }));
  };

  const handleRegenerateMemo = (id: string) => {
    setTransactions(prev => prev.map(trans => {
      if (trans.id === id && trans.category) {
        const memo = getMemoForCategory(trans.category, trans.amount);
        return {
          ...trans,
          memo,
          updatedAt: new Date()
        };
      }
      return trans;
    }));
  };

  const handleBulkCategoryChange = (category: string) => {
    setTransactions(prev => prev.map(trans => {
      if (selectedItems.has(trans.id)) {
        const memo = getMemoForCategory(category, trans.amount);
        return {
          ...trans,
          category,
          memo,
          confidence: 1.0,
          updatedAt: new Date()
        };
      }
      return trans;
    }));
  };

  const handleSelectAll = () => {
    if (selectedItems.size === transactions.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(transactions.map(t => t.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleExport = () => {
    const confirmedTransactions = transactions.filter(t => t.isConfirmed);
    if (confirmedTransactions.length === 0) {
      alert('確定された取引がありません');
      return;
    }

    const csvContent = exportToCSV(confirmedTransactions);
    const filename = `expense_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (confidence >= 0.6) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          経費自動判定システム
        </h1>

        {/* CSVアップロードセクション */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">CSVファイルアップロード</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing ? '処理中...' : 'CSVファイルを選択'}
            </label>
            <p className="text-gray-500 mt-2">
              クレジット明細のCSVファイルをアップロードしてください
            </p>
          </div>
        </div>

        {/* 取引一覧セクション */}
        {transactions.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                取引一覧 ({transactions.length}件)
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  {selectedItems.size === transactions.length ? '全解除' : '全選択'}
                </button>
                {selectedItems.size > 0 && (
                  <select
                    onChange={(e) => handleBulkCategoryChange(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">一括変更</option>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat.code} value={cat.code}>
                        {cat.code} - {cat.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleExport}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  CSV出力
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-gray-900">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-gray-900 font-semibold">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === transactions.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-gray-900 font-semibold">日付</th>
                    <th className="border border-gray-300 px-3 py-2 text-gray-900 font-semibold">取引先</th>
                    <th className="border border-gray-300 px-3 py-2 text-gray-900 font-semibold">金額</th>
                    <th className="border border-gray-300 px-3 py-2 text-gray-900 font-semibold">経費科目</th>
                    <th className="border border-gray-300 px-3 py-2 text-gray-900 font-semibold">備考</th>
                    <th className="border border-gray-300 px-3 py-2 text-gray-900 font-semibold">信頼度</th>
                    <th className="border border-gray-300 px-3 py-2 text-gray-900 font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2 text-center text-gray-900">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(transaction.id)}
                          onChange={() => handleSelectItem(transaction.id)}
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-900">
                        {transaction.date}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-900">
                        {transaction.merchant}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right text-gray-900 font-medium">
                        ¥{transaction.amount.toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-900">
                        {editingId === transaction.id ? (
                          <select
                            value={transaction.category || ''}
                            onChange={(e) => handleCategoryChange(transaction.id, e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-gray-900"
                          >
                            {EXPENSE_CATEGORIES.map(cat => (
                              <option key={cat.code} value={cat.code}>
                                {cat.code} - {cat.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="cursor-pointer text-gray-900 hover:text-blue-600" onClick={() => setEditingId(transaction.id)}>
                            {transaction.category ? `${transaction.category} - ${getCategoryName(transaction.category)}` : '未分類'}
                          </span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-900">
                        {editingId === transaction.id ? (
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={transaction.memo || ''}
                              onChange={(e) => handleMemoChange(transaction.id, e.target.value)}
                              className="flex-1 border border-gray-300 rounded px-2 py-1 text-gray-900"
                            />
                            <button
                              onClick={() => handleRegenerateMemo(transaction.id)}
                              className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                            >
                              再生成
                            </button>
                          </div>
                        ) : (
                          <span className="cursor-pointer text-gray-900 hover:text-blue-600" onClick={() => setEditingId(transaction.id)}>
                            {transaction.memo || '-'}
                          </span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {getConfidenceIcon(transaction.confidence)}
                          <span className={getConfidenceColor(transaction.confidence)}>
                            {Math.round(transaction.confidence * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        {editingId === transaction.id ? (
                          <button
                            onClick={() => setEditingId(null)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                          >
                            保存
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingId(transaction.id)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                          >
                            編集
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
