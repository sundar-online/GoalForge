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
  const [year, month, day] = dateStr.split('-').map(Number);
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
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const getDaysLeft = (dateStr) => {
  if (!dateStr) return null;
  const today = new Date(TODAY());
  const target = new Date(dateStr);
  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

export const diffDays = (d1, d2) => {
  if (!d1 || !d2) return 1;
  const t1 = new Date(d1).getTime();
  const t2 = new Date(d2).getTime();
  const diff = Math.abs(t2 - t1);
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
};

