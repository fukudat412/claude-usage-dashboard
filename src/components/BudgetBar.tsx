import React, { useState } from 'react';
import './BudgetBar.css';

interface BudgetBarProps {
  currentMonthCost: number;
  month: string;
}

const STORAGE_KEY = 'claude-dashboard.monthlyBudget';

const loadBudget = (): number | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

type BudgetStatus = 'ok' | 'warn' | 'over';

const STATUS_LABEL: Record<BudgetStatus, string> = {
  ok: '✓ 予算内',
  warn: '△ 予算の80%を超えています',
  over: '✕ 予算超過',
};

const BudgetBar: React.FC<BudgetBarProps> = ({ currentMonthCost, month }) => {
  const [budget, setBudget] = useState<number | null>(loadBudget);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const saveBudget = (): void => {
    const value = Number(draft);
    try {
      if (Number.isFinite(value) && value > 0) {
        localStorage.setItem(STORAGE_KEY, String(value));
        setBudget(value);
      } else if (draft.trim() === '') {
        localStorage.removeItem(STORAGE_KEY);
        setBudget(null);
      }
    } catch {
      // localStorage不可の環境では画面上のみ反映
      if (Number.isFinite(value) && value > 0) setBudget(value);
    }
    setEditing(false);
  };

  const ratio = budget ? currentMonthCost / budget : 0;
  const status: BudgetStatus | null = !budget ? null : ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'ok';

  return (
    <div className={`budget-bar ${status || 'unset'}`}>
      <div className="budget-row">
        <div className="budget-info">
          <span className="budget-title">今月のコスト（{month}）</span>
          <span className="budget-amount">
            ${currentMonthCost.toFixed(2)}
            {budget !== null && <span className="budget-limit"> / 予算 ${budget.toFixed(0)}</span>}
          </span>
          {status && <span className={`budget-status ${status}`}>{STATUS_LABEL[status]}</span>}
        </div>
        {editing ? (
          <div className="budget-edit">
            <input
              type="number"
              min="1"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveBudget()}
              placeholder="月次予算（$）"
              autoFocus
            />
            <button onClick={saveBudget}>保存</button>
            <button className="budget-cancel" onClick={() => setEditing(false)}>取消</button>
          </div>
        ) : (
          <button
            className="budget-edit-button"
            onClick={() => {
              setDraft(budget !== null ? String(budget) : '');
              setEditing(true);
            }}
          >
            {budget !== null ? '予算を変更' : '予算を設定'}
          </button>
        )}
      </div>
      {budget !== null && (
        <div className="budget-track">
          <div
            className={`budget-fill ${status || ''}`}
            style={{ width: `${Math.min(100, ratio * 100)}%` }}
          />
          {ratio > 1 && <span className="budget-overflow">{Math.round(ratio * 100)}%</span>}
        </div>
      )}
    </div>
  );
};

export default BudgetBar;
