export interface SubjectColorStyle {
  categoryLabel: string;
  bgLight: string;
  bgDark: string;
  borderLeft: string;
  textPrimaryLight: string;
  textSecondaryLight: string;
  badgeBg: string;
  badgeText: string;
  hexAccent: string;
  rgbFill: [number, number, number];
  rgbAccent: [number, number, number];
  rgbBadgeBg: [number, number, number];
}

export function getSubjectColorStyle(
  courseCode: string,
  courseTitle: string,
  courseTypeCode: string,
  curriculumCategory?: string
): SubjectColorStyle {
  const code = (courseCode || '').toUpperCase();
  const title = (courseTitle || '').toLowerCase();
  const type = (courseTypeCode || '').toUpperCase();
  const isLab = type === 'ELA' || type === 'LAB' || type === 'LO';

  // 1. Programming, DSA & Software Engineering -> Soft Lavender / Soft Rose-Lavender for Lab
  if (
    code.startsWith('BACSE') ||
    code === 'BAITE102' ||
    code === 'BAITE103' ||
    title.includes('programming') ||
    title.includes('data structures') ||
    title.includes('software')
  ) {
    return isLab
      ? {
          categoryLabel: 'Programming & DSA (Lab)',
          bgLight: 'bg-[#F8F0FF]',
          bgDark: 'bg-[#F8F0FF]',
          borderLeft: 'border-l-[#9333EA]',
          textPrimaryLight: 'text-[#581C87]',
          textSecondaryLight: 'text-[#6B21A8]',
          badgeBg: 'bg-[#F3E8FF]',
          badgeText: 'text-[#6B21A8]',
          hexAccent: '#9333EA',
          rgbFill: [248, 240, 255],
          rgbAccent: [147, 51, 234],
          rgbBadgeBg: [233, 213, 255],
        }
      : {
          categoryLabel: 'Programming & DSA',
          bgLight: 'bg-[#F3E8FD]',
          bgDark: 'bg-[#F3E8FD]',
          borderLeft: 'border-l-[#7C3AED]',
          textPrimaryLight: 'text-[#4C1D95]',
          textSecondaryLight: 'text-[#5B21B6]',
          badgeBg: 'bg-[#E9D5FF]',
          badgeText: 'text-[#5B21B6]',
          hexAccent: '#7C3AED',
          rgbFill: [243, 232, 253],
          rgbAccent: [124, 58, 237],
          rgbBadgeBg: [233, 213, 255],
        };
  }

  // 2. Digital Logic Design & Physics -> Soft Teal
  if (
    code === 'BAITE101' ||
    code.startsWith('BAPHY') ||
    title.includes('physics') ||
    title.includes('digital logic')
  ) {
    return isLab
      ? {
          categoryLabel: 'Digital Logic & Hardware (Lab)',
          bgLight: 'bg-[#ECFEFF]',
          bgDark: 'bg-[#ECFEFF]',
          borderLeft: 'border-l-[#0891B2]',
          textPrimaryLight: 'text-[#155E75]',
          textSecondaryLight: 'text-[#0E7490]',
          badgeBg: 'bg-[#CFFAFE]',
          badgeText: 'text-[#155E75]',
          hexAccent: '#0891B2',
          rgbFill: [236, 254, 255],
          rgbAccent: [8, 145, 178],
          rgbBadgeBg: [207, 250, 254],
        }
      : {
          categoryLabel: 'Digital Logic & Hardware',
          bgLight: 'bg-[#E0F7FA]',
          bgDark: 'bg-[#E0F7FA]',
          borderLeft: 'border-l-[#0D9488]',
          textPrimaryLight: 'text-[#115E59]',
          textSecondaryLight: 'text-[#0F766E]',
          badgeBg: 'bg-[#CCFBF1]',
          badgeText: 'text-[#115E59]',
          hexAccent: '#0D9488',
          rgbFill: [224, 247, 250],
          rgbAccent: [13, 148, 136],
          rgbBadgeBg: [204, 251, 241],
        };
  }

  // 3. Probability, Statistics & Mathematics -> Soft Blue
  if (
    code.startsWith('BAMAT') ||
    title.includes('math') ||
    title.includes('probability') ||
    title.includes('calculus')
  ) {
    return isLab
      ? {
          categoryLabel: 'Mathematics (Lab)',
          bgLight: 'bg-[#EFF6FF]',
          bgDark: 'bg-[#EFF6FF]',
          borderLeft: 'border-l-[#3B82F6]',
          textPrimaryLight: 'text-[#1E40AF]',
          textSecondaryLight: 'text-[#1D4ED8]',
          badgeBg: 'bg-[#DBEAFE]',
          badgeText: 'text-[#1E40AF]',
          hexAccent: '#3B82F6',
          rgbFill: [239, 246, 255],
          rgbAccent: [59, 130, 246],
          rgbBadgeBg: [219, 234, 254],
        }
      : {
          categoryLabel: 'Mathematics',
          bgLight: 'bg-[#E8F0FE]',
          bgDark: 'bg-[#E8F0FE]',
          borderLeft: 'border-l-[#1A73E8]',
          textPrimaryLight: 'text-[#174EA6]',
          textSecondaryLight: 'text-[#1967D2]',
          badgeBg: 'bg-[#D2E3FC]',
          badgeText: 'text-[#174EA6]',
          hexAccent: '#1A73E8',
          rgbFill: [232, 240, 254],
          rgbAccent: [26, 115, 232],
          rgbBadgeBg: [210, 227, 252],
        };
  }

  // 4. Applied Chemistry -> Soft Amber
  if (code.startsWith('BACHY') || title.includes('chemistry')) {
    return isLab
      ? {
          categoryLabel: 'Applied Chemistry (Lab)',
          bgLight: 'bg-[#FFFBEB]',
          bgDark: 'bg-[#FFFBEB]',
          borderLeft: 'border-l-[#EA580C]',
          textPrimaryLight: 'text-[#9A3412]',
          textSecondaryLight: 'text-[#C2410C]',
          badgeBg: 'bg-[#FFEDD5]',
          badgeText: 'text-[#9A3412]',
          hexAccent: '#EA580C',
          rgbFill: [255, 251, 235],
          rgbAccent: [234, 88, 12],
          rgbBadgeBg: [255, 237, 213],
        }
      : {
          categoryLabel: 'Applied Chemistry',
          bgLight: 'bg-[#FEF7E0]',
          bgDark: 'bg-[#FEF7E0]',
          borderLeft: 'border-l-[#D97706]',
          textPrimaryLight: 'text-[#92400E]',
          textSecondaryLight: 'text-[#B45309]',
          badgeBg: 'bg-[#FDE68A]',
          badgeText: 'text-[#92400E]',
          hexAccent: '#D97706',
          rgbFill: [254, 247, 224],
          rgbAccent: [217, 119, 6],
          rgbBadgeBg: [253, 230, 138],
        };
  }

  // 5. Database Systems -> Soft Mint Green
  if (code === 'BAITE202' || code === 'BAITE104' || title.includes('database') || title.includes('dbms')) {
    return {
      categoryLabel: isLab ? 'Database Systems (Lab)' : 'Database Systems',
      bgLight: 'bg-[#E6F4EA]',
      bgDark: 'bg-[#E6F4EA]',
      borderLeft: 'border-l-[#188038]',
      textPrimaryLight: 'text-[#137333]',
      textSecondaryLight: 'text-[#188038]',
      badgeBg: 'bg-[#CEEAD6]',
      badgeText: 'text-[#137333]',
      hexAccent: '#188038',
      rgbFill: [230, 244, 234],
      rgbAccent: [24, 128, 56],
      rgbBadgeBg: [206, 234, 214],
    };
  }

  // 6. University Core Courses / Humanities / Languages -> Soft Gray-Blue
  return {
    categoryLabel: curriculumCategory === 'UCC' ? 'University Core' : 'Humanities & Core',
    bgLight: 'bg-[#EEF2F6]',
    bgDark: 'bg-[#EEF2F6]',
    borderLeft: 'border-l-[#475569]',
    textPrimaryLight: 'text-[#1E293B]',
    textSecondaryLight: 'text-[#475569]',
    badgeBg: 'bg-[#E2E8F0]',
    badgeText: 'text-[#1E293B]',
    hexAccent: '#475569',
    rgbFill: [238, 242, 246],
    rgbAccent: [71, 85, 105],
    rgbBadgeBg: [226, 232, 240],
  };
}
