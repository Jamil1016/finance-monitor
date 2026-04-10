const isBrowser = typeof window !== 'undefined';

export function getItems<T>(key: string): T[] {
  if (!isBrowser) return [];
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveItems<T>(key: string, items: T[]): void {
  if (!isBrowser) return;
  localStorage.setItem(key, JSON.stringify(items));
}

export function addItem<T extends { id: string }>(key: string, item: T): T[] {
  const items = getItems<T>(key);
  items.unshift(item);
  saveItems(key, items);
  return items;
}

export function updateItem<T extends { id: string }>(
  key: string,
  id: string,
  updates: Partial<T>
): T[] {
  const items = getItems<T>(key);
  const index = items.findIndex((item) => item.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updates };
    saveItems(key, items);
  }
  return items;
}

export function deleteItem<T extends { id: string }>(key: string, id: string): T[] {
  const items = getItems<T>(key).filter((item) => item.id !== id);
  saveItems(key, items);
  return items;
}

export function getValue<T>(key: string, defaultValue: T): T {
  if (!isBrowser) return defaultValue;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setValue<T>(key: string, value: T): void {
  if (!isBrowser) return;
  localStorage.setItem(key, JSON.stringify(value));
}

// Storage keys
export const KEYS = {
  TRANSACTIONS: 'fintrack_transactions',
  BUDGETS: 'fintrack_budgets',
  GOALS: 'fintrack_goals',
  ACCOUNTS: 'fintrack_accounts',
  INCOME: 'fintrack_income',
  SETTINGS: 'fintrack_settings',
} as const;
