export const TODAY = () => new Date().toISOString().split('T')[0];
export const TOMORROW = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};


export const addDays = (dateStr, n) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
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
