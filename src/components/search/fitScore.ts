export const parseAdmissionRate = (rateStr: string): number | null => {
  if (!rateStr || rateStr === "N/A") return null;
  const num = parseFloat(rateStr.replace("%", ""));
  return isNaN(num) ? null : num / 100;
};

const parseSatRange = (satStr: string): { min: number; max: number } | null => {
  if (!satStr || satStr === "N/A") return null;
  const parts = satStr.split("-");
  if (parts.length === 2) {
    const min = parseInt(parts[0].trim());
    const max = parseInt(parts[1].trim());
    if (!isNaN(min) && !isNaN(max)) {
      return { min, max };
    }
  }
  return null;
};

const gpaAdjustment = (userGpa: number): number => {
  if (userGpa >= 3.8) return 15;
  if (userGpa >= 3.5) return 8;
  if (userGpa >= 3.0) return 0;
  if (userGpa >= 2.5) return -10;
  return -20;
};

const satAdjustment = (userSat: number, satActStr: string): number => {
  const satRange = parseSatRange(satActStr);
  if (satRange) {
    const { min, max } = satRange;
    if (userSat >= max) return 15;
    if (userSat >= min) return 8;
    return min - userSat > 200 ? -20 : -10;
  }
  if (userSat > 0) {
    if (userSat >= 1400) return 10;
    if (userSat >= 1200) return 5;
    if (userSat < 1000) return -10;
  }
  return 0;
};

const selectivityAdjustment = (
  userGpa: number,
  userSat: number,
  admissionRateStr: string,
): number => {
  const admRate = parseAdmissionRate(admissionRateStr);
  if (admRate === null) return 0;
  if (admRate < 0.15) {
    const isStellar = userGpa >= 3.9 && userSat >= 1500;
    return isStellar ? 5 : -15;
  }
  if (admRate < 0.35) {
    const isVeryGood = userGpa >= 3.7 && (userSat >= 1400 || userSat === 0);
    return isVeryGood ? 0 : -8;
  }
  return 0;
};

export const calculateFitScore = (
  userGpa: number,
  userSat: number,
  admissionRateStr: string,
  satActStr: string,
): number => {
  const score =
    75 + // base score
    gpaAdjustment(userGpa) +
    satAdjustment(userSat, satActStr) +
    selectivityAdjustment(userGpa, userSat, admissionRateStr);
  return Math.min(99, Math.max(45, score));
};
