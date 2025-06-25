/**
 * 共通のフォーマッタ関数
 */

export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('ja-JP');
};

export const formatNumber = (num) => {
  return new Intl.NumberFormat('ja-JP').format(num);
};

export const formatCurrency = (amount) => {
  return `$${parseFloat(amount).toFixed(2)}`;
};