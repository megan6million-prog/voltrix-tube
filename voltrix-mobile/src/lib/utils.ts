export const COLORS = {
  bg: '#0f0f0f',
  card: '#1a1a1a',
  border: 'rgba(255,255,255,0.1)',
  text: '#ffffff',
  textMuted: '#9ca3af',
  textDim: '#6b7280',
  primary: '#dc2626',
  primaryDark: '#b91c1c',
  electric: '#38bdf8',
  electricDark: '#0284c7',
  green: '#22c55e',
  yellow: '#eab308',
  overlay: 'rgba(0,0,0,0.6)',
};

export const formatUGX = (amount: number): string =>
  `UGX ${amount.toLocaleString('en-UG')}`;

export const formatViews = (count: number): string => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
};

export const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
};
