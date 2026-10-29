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

  // 1. Labs (ELA or Lab classes) -> Light Orange
  if (type === 'ELA' || type === 'LAB') {
    return {
      categoryLabel: 'Laboratory',
      bgLight: 'bg-[#FFF3E8] dark:bg-[#3A2414]',
      bgDark: 'dark:bg-[#3A2414]',
      borderLeft: 'border-l-[#E8710A]',
      textPrimaryLight: 'text-[#8C3D00] dark:text-[#FCD0A1]',
      textSecondaryLight: 'text-[#A64B00] dark:text-[#E5B380]',
      badgeBg: 'bg-[#FCE3CC] dark:bg-[#523018]',
      badgeText: 'text-[#8C3D00] dark:text-[#FCD0A1]',
      hexAccent: '#E8710A',
    };
  }

  // 2. Mathematics -> Soft Blue
  if (code.startsWith('BAMAT') || title.includes('math') || title.includes('probability') || title.includes('calculus')) {
    return {
      categoryLabel: 'Mathematics',
      bgLight: 'bg-[#E8F0FE] dark:bg-[#172B4D]',
      bgDark: 'dark:bg-[#172B4D]',
      borderLeft: 'border-l-[#1A73E8]',
      textPrimaryLight: 'text-[#174EA6] dark:text-[#AECBFA]',
      textSecondaryLight: 'text-[#1967D2] dark:text-[#8AB4F8]',
      badgeBg: 'bg-[#D2E3FC] dark:bg-[#1E3A5F]',
      badgeText: 'text-[#174EA6] dark:text-[#AECBFA]',
      hexAccent: '#1A73E8',
    };
  }

  // 3. Database Courses -> Soft Green
  if (code === 'BAITE104' || title.includes('database') || title.includes('dbms')) {
    return {
      categoryLabel: 'Database Systems',
      bgLight: 'bg-[#E6F4EA] dark:bg-[#143321]',
      bgDark: 'dark:bg-[#143321]',
      borderLeft: 'border-l-[#188038]',
      textPrimaryLight: 'text-[#137333] dark:text-[#A8DAB5]',
      textSecondaryLight: 'text-[#188038] dark:text-[#81C995]',
      badgeBg: 'bg-[#CEEAD6] dark:bg-[#1B462C]',
      badgeText: 'text-[#137333] dark:text-[#A8DAB5]',
      hexAccent: '#188038',
    };
  }

  // 4. Physics / Digital Logic Design & Computer Org -> Soft Teal
  if (code === 'BAITE101' || code.startsWith('BAPHY') || title.includes('physics') || title.includes('digital logic')) {
    return {
      categoryLabel: 'Physics & Hardware',
      bgLight: 'bg-[#E4F7FB] dark:bg-[#113238]',
      bgDark: 'dark:bg-[#113238]',
      borderLeft: 'border-l-[#007B83]',
      textPrimaryLight: 'text-[#005359] dark:text-[#A0E4EB]',
      textSecondaryLight: 'text-[#007B83] dark:text-[#78D9EC]',
      badgeBg: 'bg-[#CBF0F8] dark:bg-[#17464F]',
      badgeText: 'text-[#005359] dark:text-[#A0E4EB]',
      hexAccent: '#007B83',
    };
  }

  // 5. Chemistry -> Soft Amber
  if (code.startsWith('BACHY') || title.includes('chemistry')) {
    return {
      categoryLabel: 'Chemistry',
      bgLight: 'bg-[#FEF7E0] dark:bg-[#36290C]',
      bgDark: 'dark:bg-[#36290C]',
      borderLeft: 'border-l-[#F29900]',
      textPrimaryLight: 'text-[#8F4E00] dark:text-[#FDE293]',
      textSecondaryLight: 'text-[#B06000] dark:text-[#FDD663]',
      badgeBg: 'bg-[#FEEFC3] dark:bg-[#4A3810]',
      badgeText: 'text-[#8F4E00] dark:text-[#FDE293]',
      hexAccent: '#F29900',
    };
  }

  // 6. Programming, DSA & Software Engineering -> Soft Violet
  if (
    code.startsWith('BACSE') ||
    code.startsWith('BAITE') ||
    title.includes('programming') ||
    title.includes('data structures') ||
    title.includes('software')
  ) {
    return {
      categoryLabel: 'Programming & DSA',
      bgLight: 'bg-[#F3E8FD] dark:bg-[#2B193D]',
      bgDark: 'dark:bg-[#2B193D]',
      borderLeft: 'border-l-[#9334E6]',
      textPrimaryLight: 'text-[#681DA8] dark:text-[#D7AEFB]',
      textSecondaryLight: 'text-[#7627BB] dark:text-[#C58AF9]',
      badgeBg: 'bg-[#E9D2FD] dark:bg-[#3C2254]',
      badgeText: 'text-[#681DA8] dark:text-[#D7AEFB]',
      hexAccent: '#9334E6',
    };
  }

  // 7. University Core Courses / Humanities / Languages -> Light Gray-Blue
  return {
    categoryLabel: curriculumCategory === 'UCC' ? 'University Core' : 'Humanities & Languages',
    bgLight: 'bg-[#EEF2F6] dark:bg-[#242930]',
    bgDark: 'dark:bg-[#242930]',
    borderLeft: 'border-l-[#5F6368]',
    textPrimaryLight: 'text-[#3C4043] dark:text-[#E8EAED]',
    textSecondaryLight: 'text-[#5F6368] dark:text-[#9AA0A6]',
    badgeBg: 'bg-[#E0E6ED] dark:bg-[#333942]',
    badgeText: 'text-[#3C4043] dark:text-[#E8EAED]',
    hexAccent: '#5F6368',
  };
}
