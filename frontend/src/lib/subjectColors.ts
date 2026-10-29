export interface SubjectColorStyle {
  categoryLabel: string;
  bgLight: string;
  bgDark: string;
  borderLeft: string;
  textPrimaryLight: string;
  textSecondaryLight: string;
  badgeBg: string;
  badgeText: string;
  hexBg: string;
  hexAccent: string;
  hexTextPrimary: string;
  hexTextSecondary: string;
  hexBadgeBg: string;
  hexBadgeText: string;
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

  // 1. Programming, DSA & Software Engineering -> Soft Lavender
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
          bgLight: 'bg-[#F5EEFF]',
          bgDark: 'bg-[#F5EEFF]',
          borderLeft: 'border-l-[#7C3AED]',
          textPrimaryLight: 'text-[#3B0764]',
          textSecondaryLight: 'text-[#4C1D95]',
          badgeBg: 'bg-[#EDE9FE]',
          badgeText: 'text-[#4C1D95]',
          hexBg: '#F5EEFF',
          hexAccent: '#7C3AED',
          hexTextPrimary: '#2E1065',
          hexTextSecondary: '#4C1D95',
          hexBadgeBg: '#EDE9FE',
          hexBadgeText: '#4C1D95',
          rgbFill: [245, 238, 255],
          rgbAccent: [124, 58, 237],
          rgbBadgeBg: [237, 233, 254],
        }
      : {
          categoryLabel: 'Programming & DSA',
          bgLight: 'bg-[#F3E8FF]',
          bgDark: 'bg-[#F3E8FF]',
          borderLeft: 'border-l-[#6D28D9]',
          textPrimaryLight: 'text-[#2E1065]',
          textSecondaryLight: 'text-[#4C1D95]',
          badgeBg: 'bg-[#E9D5FF]',
          badgeText: 'text-[#4C1D95]',
          hexBg: '#F3E8FF',
          hexAccent: '#6D28D9',
          hexTextPrimary: '#2E1065',
          hexTextSecondary: '#4C1D95',
          hexBadgeBg: '#E9D5FF',
          hexBadgeText: '#4C1D95',
          rgbFill: [243, 232, 255],
          rgbAccent: [109, 40, 217],
          rgbBadgeBg: [233, 213, 255],
        };
  }

  // 2. Digital Logic Design & Physics -> Soft Teal / Sky Cyan
  if (
    code === 'BAITE101' ||
    code.startsWith('BAPHY') ||
    title.includes('physics') ||
    title.includes('digital logic')
  ) {
    return isLab
      ? {
          categoryLabel: 'Digital Logic & Hardware (Lab)',
          bgLight: 'bg-[#E6FAFC]',
          bgDark: 'bg-[#E6FAFC]',
          borderLeft: 'border-l-[#0284C7]',
          textPrimaryLight: 'text-[#083344]',
          textSecondaryLight: 'text-[#0E7490]',
          badgeBg: 'bg-[#CFFAFE]',
          badgeText: 'text-[#083344]',
          hexBg: '#E6FAFC',
          hexAccent: '#0284C7',
          hexTextPrimary: '#083344',
          hexTextSecondary: '#0E7490',
          hexBadgeBg: '#CFFAFE',
          hexBadgeText: '#083344',
          rgbFill: [230, 250, 252],
          rgbAccent: [2, 132, 199],
          rgbBadgeBg: [207, 250, 254],
        }
      : {
          categoryLabel: 'Digital Logic & Hardware',
          bgLight: 'bg-[#E0F7FA]',
          bgDark: 'bg-[#E0F7FA]',
          borderLeft: 'border-l-[#0D9488]',
          textPrimaryLight: 'text-[#042F2E]',
          textSecondaryLight: 'text-[#115E59]',
          badgeBg: 'bg-[#CCFBF1]',
          badgeText: 'text-[#042F2E]',
          hexBg: '#E0F7FA',
          hexAccent: '#0D9488',
          hexTextPrimary: '#042F2E',
          hexTextSecondary: '#115E59',
          hexBadgeBg: '#CCFBF1',
          hexBadgeText: '#042F2E',
          rgbFill: [224, 247, 250],
          rgbAccent: [13, 148, 136],
          rgbBadgeBg: [204, 251, 241],
        };
  }

  // 3. Probability, Statistics & Mathematics -> Soft Sky Blue
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
          borderLeft: 'border-l-[#2563EB]',
          textPrimaryLight: 'text-[#172554]',
          textSecondaryLight: 'text-[#1E40AF]',
          badgeBg: 'bg-[#DBEAFE]',
          badgeText: 'text-[#172554]',
          hexBg: '#EFF6FF',
          hexAccent: '#2563EB',
          hexTextPrimary: '#172554',
          hexTextSecondary: '#1E40AF',
          hexBadgeBg: '#DBEAFE',
          hexBadgeText: '#172554',
          rgbFill: [239, 246, 255],
          rgbAccent: [37, 99, 235],
          rgbBadgeBg: [219, 234, 254],
        }
      : {
          categoryLabel: 'Mathematics',
          bgLight: 'bg-[#E8F0FE]',
          bgDark: 'bg-[#E8F0FE]',
          borderLeft: 'border-l-[#1A73E8]',
          textPrimaryLight: 'text-[#172554]',
          textSecondaryLight: 'text-[#1E3A8A]',
          badgeBg: 'bg-[#D2E3FC]',
          badgeText: 'text-[#172554]',
          hexBg: '#E8F0FE',
          hexAccent: '#1A73E8',
          hexTextPrimary: '#172554',
          hexTextSecondary: '#1E3A8A',
          hexBadgeBg: '#D2E3FC',
          hexBadgeText: '#172554',
          rgbFill: [232, 240, 254],
          rgbAccent: [26, 115, 232],
          rgbBadgeBg: [210, 227, 252],
        };
  }

  // 4. Applied Chemistry -> Crisp Light Cream / Soft Peach-Gold with High-Contrast Dark Slate/Navy Text
  if (code.startsWith('BACHY') || title.includes('chemistry')) {
    return isLab
      ? {
          categoryLabel: 'Applied Chemistry (Lab)',
          bgLight: 'bg-[#FFF7ED]',
          bgDark: 'bg-[#FFF7ED]',
          borderLeft: 'border-l-[#EA580C]',
          textPrimaryLight: 'text-[#0F172A]',
          textSecondaryLight: 'text-[#7C2D12]',
          badgeBg: 'bg-[#FFEDD5]',
          badgeText: 'text-[#7C2D12]',
          hexBg: '#FFF7ED',
          hexAccent: '#EA580C',
          hexTextPrimary: '#0F172A',
          hexTextSecondary: '#7C2D12',
          hexBadgeBg: '#FFEDD5',
          hexBadgeText: '#7C2D12',
          rgbFill: [255, 247, 237],
          rgbAccent: [234, 88, 12],
          rgbBadgeBg: [255, 237, 213],
        }
      : {
          categoryLabel: 'Applied Chemistry',
          bgLight: 'bg-[#FFFBEB]',
          bgDark: 'bg-[#FFFBEB]',
          borderLeft: 'border-l-[#D97706]',
          textPrimaryLight: 'text-[#0F172A]',
          textSecondaryLight: 'text-[#78350F]',
          badgeBg: 'bg-[#FEF3C7]',
          badgeText: 'text-[#78350F]',
          hexBg: '#FFFBEB',
          hexAccent: '#D97706',
          hexTextPrimary: '#0F172A',
          hexTextSecondary: '#78350F',
          hexBadgeBg: '#FEF3C7',
          hexBadgeText: '#78350F',
          rgbFill: [255, 251, 235],
          rgbAccent: [217, 119, 6],
          rgbBadgeBg: [254, 243, 199],
        };
  }

  // 5. Database Systems -> Soft Mint Green
  if (code === 'BAITE202' || code === 'BAITE104' || title.includes('database') || title.includes('dbms')) {
    return {
      categoryLabel: isLab ? 'Database Systems (Lab)' : 'Database Systems',
      bgLight: 'bg-[#ECFDF5]',
      bgDark: 'bg-[#ECFDF5]',
      borderLeft: 'border-l-[#059669]',
      textPrimaryLight: 'text-[#064E3B]',
      textSecondaryLight: 'text-[#065F46]',
      badgeBg: 'bg-[#D1FAE5]',
      badgeText: 'text-[#064E3B]',
      hexBg: '#ECFDF5',
      hexAccent: '#059669',
      hexTextPrimary: '#064E3B',
      hexTextSecondary: '#065F46',
      hexBadgeBg: '#D1FAE5',
      hexBadgeText: '#064E3B',
      rgbFill: [236, 253, 245],
      rgbAccent: [5, 150, 105],
      rgbBadgeBg: [209, 250, 229],
    };
  }

  // 6. University Core Courses / Humanities / Languages -> Crisp Soft Indigo-Slate
  return {
    categoryLabel: curriculumCategory === 'UCC' ? 'University Core' : 'Humanities & Core',
    bgLight: 'bg-[#F1F5F9]',
    bgDark: 'bg-[#F1F5F9]',
    borderLeft: 'border-l-[#475569]',
    textPrimaryLight: 'text-[#0F172A]',
    textSecondaryLight: 'text-[#334155]',
    badgeBg: 'bg-[#E2E8F0]',
    badgeText: 'text-[#0F172A]',
    hexBg: '#F1F5F9',
    hexAccent: '#475569',
    hexTextPrimary: '#0F172A',
    hexTextSecondary: '#334155',
    hexBadgeBg: '#E2E8F0',
    hexBadgeText: '#0F172A',
    rgbFill: [241, 245, 249],
    rgbAccent: [71, 85, 105],
    rgbBadgeBg: [226, 232, 240],
  };
}
