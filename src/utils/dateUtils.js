export const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return new Date(dateStr); // fallback
  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date(dateStr);
  return new Date(year, month - 1, day);
};

export const TODAY = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
export const TOMORROW = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};


export const addDays = (dateStr, n) => {
  if (!dateStr || dateStr === 'NaN-NaN-NaN') dateStr = TODAY();
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) dateStr = TODAY();
  const [year, month, day] = dateStr.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return TODAY();
  
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

export const getTodayDate = () => TODAY();

export const isSameDay = (d1, d2) => d1 === d2;

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const getDaysLeft = (dateStr) => {
  if (!dateStr) return null;
  const today = parseLocalDate(TODAY());
  const target = parseLocalDate(dateStr);
  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

export const diffDays = (d1, d2) => {
  if (!d1 || !d2) return 1;
  const t1 = parseLocalDate(d1).getTime();
  const t2 = parseLocalDate(d2).getTime();
  const diff = Math.abs(t2 - t1);
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
};


