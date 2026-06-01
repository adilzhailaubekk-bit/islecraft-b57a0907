export const fmt = (n: number): string => {
  if (!isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs < 1000) return Math.floor(n).toString();
  const units = ["", "K", "M", "B", "T", "aa", "ab", "ac"];
  let u = 0;
  let v = n;
  while (Math.abs(v) >= 1000 && u < units.length - 1) {
    v /= 1000;
    u++;
  }
  return v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0) + units[u];
};

export const fmtRate = (n: number) => fmt(n) + "/с";
