import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ClashReport,
  Course,
  CourseSection,
  PeriodHeader,
  SlotOccurrence,
} from '../types/ffcs';

export type PdfPaperSize = 'a3' | 'a4';
export type PdfContentMode = 'both' | 'visual' | 'detailed';

export interface ExportTimetablePdfOptions {
  paperSize: PdfPaperSize;
  contentMode: PdfContentMode;
  planName: string;
  semester: string;
  campus: string;
  showSaturday: boolean;
  courses: Course[];
  selectedSections: CourseSection[];
  periodHeaders: PeriodHeader[];
  clashReport: ClashReport | null;
  action?: 'download' | 'print';
}

interface RgbColor {
  fill: [number, number, number];
  accent: [number, number, number];
  text: [number, number, number];
  category: string;
}

/**
 * Returns subtle, high-contrast pastel RGB colors for PDF cells matching the website palette.
 */
function getPdfSubjectPalette(
  courseCode: string,
  courseTitle: string,
  courseTypeCode: string
): RgbColor {
  const code = (courseCode || '').toUpperCase();
  const title = (courseTitle || '').toLowerCase();
  const type = (courseTypeCode || '').toUpperCase();

  if (type === 'ELA' || type === 'LAB' || type === 'LO') {
    return {
      fill: [255, 244, 232], // Soft Pastel Orange (#FFF4E8)
      accent: [232, 113, 10], // #E8710A
      text: [32, 33, 36],
      category: 'Laboratory (ELA/LO)',
    };
  }
  if (
    code.startsWith('BAMAT') ||
    title.includes('math') ||
    title.includes('probability') ||
    title.includes('calculus')
  ) {
    return {
      fill: [232, 240, 254], // Soft Pastel Blue (#E8F0FE)
      accent: [26, 115, 232], // #1A73E8
      text: [32, 33, 36],
      category: 'Mathematics',
    };
  }
  if (code === 'BAITE104' || title.includes('database') || title.includes('dbms')) {
    return {
      fill: [230, 244, 234], // Soft Pastel Green (#E6F4EA)
      accent: [24, 128, 56], // #188038
      text: [32, 33, 36],
      category: 'Database Systems',
    };
  }
  if (
    code === 'BAITE101' ||
    code.startsWith('BAPHY') ||
    title.includes('physics') ||
    title.includes('digital logic')
  ) {
    return {
      fill: [228, 247, 251], // Soft Pastel Teal (#E4F7FB)
      accent: [0, 123, 131], // #007B83
      text: [32, 33, 36],
      category: 'Physics & Hardware',
    };
  }
  if (code.startsWith('BACHY') || title.includes('chemistry')) {
    return {
      fill: [254, 247, 224], // Soft Pastel Amber (#FEF7E0)
      accent: [242, 153, 0], // #F29900
      text: [32, 33, 36],
      category: 'Chemistry',
    };
  }
  if (
    code.startsWith('BACSE') ||
    code.startsWith('BAITE') ||
    title.includes('programming') ||
    title.includes('data structures') ||
    title.includes('software')
  ) {
    return {
      fill: [243, 232, 253], // Soft Pastel Violet (#F3E8FD)
      accent: [147, 52, 230], // #9334E6
      text: [32, 33, 36],
      category: 'Programming & DSA',
    };
  }
  return {
    fill: [238, 242, 246], // Soft Pastel Slate (#EEF2F6)
    accent: [95, 99, 104], // #5F6368
    text: [32, 33, 36],
    category: 'Core / Humanities',
  };
}

const ALL_DAYS: Array<{ code: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'; label: string }> = [
  { code: 'MON', label: 'MONDAY' },
  { code: 'TUE', label: 'TUESDAY' },
  { code: 'WED', label: 'WEDNESDAY' },
  { code: 'THU', label: 'THURSDAY' },
  { code: 'FRI', label: 'FRIDAY' },
  { code: 'SAT', label: 'SATURDAY' },
];

const VELLORE_SLOT_LABELS: Record<string, Record<number, string>> = {
  MON: { 1: 'A1/L1', 2: 'F1/L2', 3: 'D1/L3', 4: 'TB1/L4', 5: 'TG1/L5', 6: 'L6', 7: 'A2/L31', 8: 'F2/L32', 9: 'D2/L33', 10: 'TB2/L34', 11: 'TG2/L35', 12: 'V3/L36' },
  TUE: { 1: 'B1/L7', 2: 'G1/L8', 3: 'E1/L9', 4: 'TC1/L10', 5: 'TAA1/L11', 6: 'L12', 7: 'B2/L37', 8: 'G2/L38', 9: 'E2/L39', 10: 'TC2/L40', 11: 'TAA2/L41', 12: 'V4/L42' },
  WED: { 1: 'C1/L13', 2: 'A1/L14', 3: 'F1/L15', 4: 'V1/TDD1/L16', 5: 'V2/L17', 6: 'L18', 7: 'C2/L43', 8: 'A2/L44', 9: 'F2/L45', 10: 'TD2/L46', 11: 'TBB2/L47', 12: 'V5/L48' },
  THU: { 1: 'D1/L19', 2: 'B1/L20', 3: 'G1/L21', 4: 'TE1/L22', 5: 'TCC1/TBB1/L23', 6: 'L24', 7: 'D2/L49', 8: 'B2/L50', 9: 'G2/L51', 10: 'TE2/L52', 11: 'TCC2/L53', 12: 'V6/L54' },
  FRI: { 1: 'E1/L25', 2: 'C1/L26', 3: 'TA1/L27', 4: 'TF1/L28', 5: 'TD1/L29', 6: 'L30', 7: 'E2/L55', 8: 'C2/L56', 9: 'TA2/L57', 10: 'TF2/L58', 11: 'TDD2/L59', 12: 'V7/L60' },
  SAT: { 1: 'SAT-1', 2: 'SAT-2', 3: 'SAT-3', 4: 'SAT-4', 5: 'SAT-5', 6: 'SAT-6', 7: 'SAT-7', 8: 'SAT-8', 9: 'SAT-9', 10: 'SAT-10', 11: 'SAT-11', 12: 'SAT-12' },
};

interface CellSlotEntry {
  section: CourseSection;
  occurrence: SlotOccurrence;
  hasClash: boolean;
}

export function exportTimetablePdf(options: ExportTimetablePdfOptions): void {
  const {
    paperSize = 'a3',
    contentMode = 'both',
    planName = 'Primary Timetable',
    semester,
    campus,
    showSaturday,
    courses,
    selectedSections,
    periodHeaders,
    clashReport,
    action = 'download',
  } = options;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: paperSize,
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = paperSize === 'a3' ? 12 : 9;

  const campusLabel = campus.toLowerCase() === 'chennai' ? 'VIT Chennai' : 'VIT Vellore';
  const generatedTimestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Compute unique courses and total credits from actual selected sections
  const courseCreditsMap = new Map<string, number>();
  courses.forEach((c) => courseCreditsMap.set(c.course_code, c.credits));

  const uniqueCourseCodes = Array.from(new Set(selectedSections.map((s) => s.course_code)));
  const totalCredits =
    clashReport?.total_credits ??
    uniqueCourseCodes.reduce((sum, code) => sum + (courseCreditsMap.get(code) ?? 0), 0);

  const confirmedClashIds = new Set<number>();
  for (const c of clashReport?.clashes ?? []) {
    if (c.is_confirmed && c.severity === 'ERROR') {
      if (c.course_a_section_id) confirmedClashIds.add(c.course_a_section_id);
      if (c.course_b_section_id) confirmedClashIds.add(c.course_b_section_id);
    }
  }
  const confirmedClashCount = (clashReport?.clashes ?? []).filter(
    (c) => c.is_confirmed && c.severity === 'ERROR'
  ).length;

  // Determine whether Saturday has any classes
  const hasSaturdayClass = selectedSections.some((s) =>
    (s.parsed_slot?.occurrences ?? []).some((o) => o.day === 'SAT')
  );
  const daysToRender =
    showSaturday || hasSaturdayClass ? ALL_DAYS : ALL_DAYS.slice(0, 5);

  /**
   * Renders the professional PDF page header banner
   */
  const drawPageHeader = (subtitle: string): number => {
    // Title: 22pt on A3, 20pt on A4 (within required 20-24pt range)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(paperSize === 'a3' ? 22 : 20);
    doc.setTextColor(32, 33, 36);
    doc.text('VIT FFCS Timetable', margin, margin + 6);

    // Plan & Section Subtitle
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(paperSize === 'a3' ? 11.5 : 10.5);
    doc.setTextColor(26, 115, 232);
    doc.text(`${planName} — ${subtitle}`, margin, margin + 12.5);

    // Right-aligned summary metadata box
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(paperSize === 'a3' ? 9.5 : 8.5);
    doc.setTextColor(95, 99, 104);

    const metaLine1 = `Semester: ${semester}   |   Campus: ${campusLabel}   |   Generated: ${generatedTimestamp}`;
    const metaLine2 = `Selected Courses: ${uniqueCourseCodes.length} (${selectedSections.length} components)   |   Total Credits: ${totalCredits}   |   Status: ${
      confirmedClashCount === 0
        ? 'No Clashes Detected'
        : `${confirmedClashCount} Clash(es) Detected`
    }`;

    doc.text(metaLine1, pageWidth - margin, margin + 4.5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(
      confirmedClashCount === 0 ? 24 : 217,
      confirmedClashCount === 0 ? 128 : 48,
      confirmedClashCount === 0 ? 56 : 37
    );
    doc.text(metaLine2, pageWidth - margin, margin + 10.5, { align: 'right' });

    // Selected Courses Summary Pill Bar
    const summaryText =
      uniqueCourseCodes.length > 0
        ? `Registered Courses: ${uniqueCourseCodes
            .map((code) => {
              const sample = selectedSections.find((s) => s.course_code === code);
              return sample ? `${code} (${sample.course_title})` : code;
            })
            .join('  •  ')}`
        : 'No courses selected.';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(paperSize === 'a3' ? 8.5 : 8);
    doc.setTextColor(60, 64, 67);
    const wrappedSummary = doc.splitTextToSize(summaryText, pageWidth - margin * 2);
    doc.text(wrappedSummary.slice(0, 2), margin, margin + 17.5);

    const dividerY = margin + 17.5 + Math.min(wrappedSummary.length, 2) * 3.8;
    doc.setDrawColor(218, 220, 224);
    doc.setLineWidth(0.35);
    doc.line(margin, dividerY, pageWidth - margin, dividerY);

    return dividerY + 3.5;
  };

  // ============================================================================
  // PAGE 1: WEEKLY VISUAL TIMETABLE GRID
  // ============================================================================
  if (contentMode === 'visual' || contentMode === 'both') {
    const startY = drawPageHeader('Weekly Visual Timetable (Full Faculty, Venue & Slot Details)');

    // Map gridCells[day][period] -> CellSlotEntry[]
    const cellMap: Record<string, Record<number, CellSlotEntry[]>> = {};
    for (const d of daysToRender) {
      cellMap[d.code] = {};
      for (let p = 1; p <= 12; p++) {
        cellMap[d.code][p] = [];
      }
    }

    for (const sec of selectedSections) {
      const occs = sec.parsed_slot?.occurrences ?? [];
      for (const occ of occs) {
        if (cellMap[occ.day] && cellMap[occ.day][occ.period]) {
          cellMap[occ.day][occ.period].push({
            section: sec,
            occurrence: occ,
            hasClash: confirmedClashIds.has(sec.id),
          });
        }
      }
    }

    // Build table headers: Day + Periods 1..6 + LUNCH + Periods 7..12
    const getHeaderForPeriod = (pNum: number): string => {
      const found = periodHeaders.find((h) => h.period === pNum);
      if (!found) return `P${pNum}`;
      return `P${pNum}\nTh: ${found.theory_time}\nLab: ${found.lab_time}`;
    };

    const headRow = [
      'DAY /\nTIME',
      getHeaderForPeriod(1),
      getHeaderForPeriod(2),
      getHeaderForPeriod(3),
      getHeaderForPeriod(4),
      getHeaderForPeriod(5),
      getHeaderForPeriod(6),
      'LUNCH\nBREAK',
      getHeaderForPeriod(7),
      getHeaderForPeriod(8),
      getHeaderForPeriod(9),
      getHeaderForPeriod(10),
      getHeaderForPeriod(11),
      getHeaderForPeriod(12),
    ];

    // Store cell metadata for custom pastel background + left accent bar rendering
    const cellStyleMatrix: Record<
      string,
      { fill: [number, number, number]; accent: [number, number, number]; hasClash: boolean }
    > = {};

    const formatCellEntries = (dayCode: string, periodNum: number, rowIdx: number, colIdx: number): string => {
      const entries = cellMap[dayCode]?.[periodNum] ?? [];
      const officialPlaceholder = VELLORE_SLOT_LABELS[dayCode]?.[periodNum] ?? '';

      if (entries.length === 0) {
        return `[ ${officialPlaceholder} ]`;
      }

      const primary = entries[0];
      const palette = getPdfSubjectPalette(
        primary.section.course_code,
        primary.section.course_title,
        primary.section.course_type_code
      );
      const anyClash = entries.some((e) => e.hasClash) || entries.length > 1;

      cellStyleMatrix[`${rowIdx}_${colIdx}`] = {
        fill: anyClash ? [252, 232, 230] : palette.fill,
        accent: anyClash ? [217, 48, 37] : palette.accent,
        hasClash: anyClash,
      };

      // Build clean, complete text block without truncating faculty name or venue code
      return entries
        .map(({ section, occurrence, hasClash }) => {
          const lines = [
            `${section.course_code} — ${section.course_title}`,
            `Faculty: ${section.faculty_name}`,
            `Venue: ${section.venue}`,
            `Slot: ${section.slot_combination} (${occurrence.slot_code})`,
            `Type: ${section.course_type_code}${hasClash || entries.length > 1 ? ' [CLASH]' : ''}`,
          ];
          return lines.join('\n');
        })
        .join('\n──────────\n');
    };

    const bodyRows = daysToRender.map((dayObj, rowIdx) => [
      dayObj.label,
      formatCellEntries(dayObj.code, 1, rowIdx, 1),
      formatCellEntries(dayObj.code, 2, rowIdx, 2),
      formatCellEntries(dayObj.code, 3, rowIdx, 3),
      formatCellEntries(dayObj.code, 4, rowIdx, 4),
      formatCellEntries(dayObj.code, 5, rowIdx, 5),
      formatCellEntries(dayObj.code, 6, rowIdx, 6),
      'L\nU\nN\nC\nH',
      formatCellEntries(dayObj.code, 7, rowIdx, 8),
      formatCellEntries(dayObj.code, 8, rowIdx, 9),
      formatCellEntries(dayObj.code, 9, rowIdx, 10),
      formatCellEntries(dayObj.code, 10, rowIdx, 11),
      formatCellEntries(dayObj.code, 11, rowIdx, 12),
      formatCellEntries(dayObj.code, 12, rowIdx, 13),
    ]);

    const usableWidth = pageWidth - margin * 2;
    const dayColWidth = paperSize === 'a3' ? 22 : 16;
    const lunchColWidth = paperSize === 'a3' ? 10 : 7;
    const periodColWidth = (usableWidth - dayColWidth - lunchColWidth) / 12;

    // Typography sizes strictly within the user's specification:
    // Day headings: 11 pt (A3) / 10 pt (A4)
    // Course titles & faculty/venue in cells: 9 pt (A3) / 8 pt (A4)
    const bodyFontSize = paperSize === 'a3' ? 9 : 8;
    const headerFontSize = paperSize === 'a3' ? 8.5 : 7.5;

    autoTable(doc, {
      startY,
      margin: { left: margin, right: margin, bottom: 18 },
      head: [headRow],
      body: bodyRows,
      theme: 'grid',
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      styles: {
        font: 'helvetica',
        fontSize: bodyFontSize,
        cellPadding: paperSize === 'a3' ? 2.2 : 1.5,
        lineColor: [203, 213, 225],
        lineWidth: 0.25,
        textColor: [32, 33, 36],
        valign: 'top',
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: 'bold',
        fontSize: headerFontSize,
        halign: 'center',
        valign: 'middle',
        cellPadding: paperSize === 'a3' ? 2 : 1.3,
      },
      columnStyles: {
        0: {
          cellWidth: dayColWidth,
          fontStyle: 'bold',
          fontSize: paperSize === 'a3' ? 11 : 9.5,
          halign: 'center',
          valign: 'middle',
          fillColor: [248, 250, 252],
          textColor: [15, 23, 42],
        },
        1: { cellWidth: periodColWidth },
        2: { cellWidth: periodColWidth },
        3: { cellWidth: periodColWidth },
        4: { cellWidth: periodColWidth },
        5: { cellWidth: periodColWidth },
        6: { cellWidth: periodColWidth },
        7: {
          cellWidth: lunchColWidth,
          halign: 'center',
          valign: 'middle',
          fontStyle: 'bold',
          fontSize: 8,
          fillColor: [241, 243, 244],
          textColor: [95, 99, 104],
        },
        8: { cellWidth: periodColWidth },
        9: { cellWidth: periodColWidth },
        10: { cellWidth: periodColWidth },
        11: { cellWidth: periodColWidth },
        12: { cellWidth: periodColWidth },
        13: { cellWidth: periodColWidth },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index !== 0 && data.column.index !== 7) {
          const key = `${data.row.index}_${data.column.index}`;
          const styleInfo = cellStyleMatrix[key];
          if (styleInfo) {
            data.cell.styles.fillColor = styleInfo.fill;
            data.cell.styles.textColor = styleInfo.hasClash ? [165, 14, 14] : [32, 33, 36];
            data.cell.styles.fontStyle = 'normal';
          } else {
            // Empty slot cell
            data.cell.styles.textColor = [148, 163, 184];
            data.cell.styles.halign = 'center';
            data.cell.styles.valign = 'middle';
            data.cell.styles.fontSize = 8;
          }
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index !== 0 && data.column.index !== 7) {
          const key = `${data.row.index}_${data.column.index}`;
          const styleInfo = cellStyleMatrix[key];
          if (styleInfo) {
            // Draw colored left border accent bar inside the scheduled cell
            doc.setFillColor(
              styleInfo.accent[0],
              styleInfo.accent[1],
              styleInfo.accent[2]
            );
            doc.rect(data.cell.x, data.cell.y, 1.3, data.cell.height, 'F');
          }
        }
      },
    });

    // Draw Subject Colors & Class Type Legend below the Weekly Timetable Grid
    const finalY = (doc as any).lastAutoTable?.finalY ?? startY + 120;
    if (finalY + 24 < pageHeight - 12) {
      const legendY = finalY + 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(32, 33, 36);
      doc.text(
        'Legend — Subject Colors & Class Types (ETH = Embedded Theory • ELA = Embedded Lab • TH = Theory • LO = Lab • OC = Online):',
        margin,
        legendY
      );

      let curX = margin;
      let curY = legendY + 3.5;

      for (const sec of selectedSections) {
        const pal = getPdfSubjectPalette(sec.course_code, sec.course_title, sec.course_type_code);
        const label = `${sec.course_code} [${sec.course_type_code}] — ${sec.faculty_name} (${sec.venue} · ${sec.slot_combination})`;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const chipWidth = doc.getTextWidth(label) + 9;

        if (curX + chipWidth > pageWidth - margin) {
          curX = margin;
          curY += 6.5;
        }
        if (curY < pageHeight - 10) {
          doc.setFillColor(pal.fill[0], pal.fill[1], pal.fill[2]);
          doc.setDrawColor(pal.accent[0], pal.accent[1], pal.accent[2]);
          doc.roundedRect(curX, curY - 3.5, chipWidth, 5.2, 1, 1, 'FD');

          doc.setFillColor(pal.accent[0], pal.accent[1], pal.accent[2]);
          doc.rect(curX, curY - 3.5, 1.8, 5.2, 'F');

          doc.setTextColor(32, 33, 36);
          doc.text(label, curX + 3.5, curY + 0.3);
          curX += chipWidth + 3;
        }
      }
    }
  }

  // ============================================================================
  // PAGE 2: DETAILED REGISTERED CLASS LIST TABLE
  // ============================================================================
  if (contentMode === 'detailed' || contentMode === 'both') {
    if (contentMode === 'both') {
      doc.addPage(paperSize, 'landscape');
    }

    const page2StartY = drawPageHeader(
      'Detailed Registered Class List (Complete Course Titles, Faculty, Slots, Venues & Timings)'
    );

    const detailHead = [
      [
        '#',
        'Course Code',
        'Full Course Title',
        'Type',
        'Credits',
        'Complete Faculty Name',
        'Venue / Classroom',
        'Official Slot',
        'Verified Weekly Day & Time Schedule',
        'Status',
      ],
    ];

    const detailBody = selectedSections.map((sec, idx) => {
      const credits = courseCreditsMap.get(sec.course_code) ?? '-';
      const hasClash = confirmedClashIds.has(sec.id);
      const isUnresolved = sec.verification_status === 'UNRESOLVED';

      const scheduleStr =
        sec.parsed_slot?.occurrences && sec.parsed_slot.occurrences.length > 0
          ? sec.parsed_slot.occurrences
              .map((o) => `${o.day} P${o.period} (${o.start_time}–${o.end_time}) [${o.slot_code}]`)
              .join('\n')
          : `Asynchronous / Non-Grid Slot (${sec.slot_combination})`;

      const statusStr = hasClash
        ? 'CLASH DETECTED'
        : isUnresolved
        ? 'Unresolved Slot'
        : 'Verified (Clash-Free)';

      return [
        String(idx + 1),
        sec.course_code,
        sec.course_title,
        sec.course_type_code,
        String(credits),
        sec.faculty_name,
        sec.venue,
        sec.slot_combination,
        scheduleStr,
        statusStr,
      ];
    });

    autoTable(doc, {
      startY: page2StartY,
      margin: { left: margin, right: margin, bottom: 16 },
      head: detailHead,
      body: detailBody,
      theme: 'grid',
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      styles: {
        font: 'helvetica',
        fontSize: paperSize === 'a3' ? 10 : 9,
        cellPadding: paperSize === 'a3' ? 3 : 2.2,
        lineColor: [203, 213, 225],
        lineWidth: 0.25,
        textColor: [32, 33, 36],
        valign: 'middle',
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [26, 115, 232],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: paperSize === 'a3' ? 10.5 : 9.5,
        halign: 'left',
        cellPadding: paperSize === 'a3' ? 3 : 2.2,
      },
      columnStyles: {
        0: { cellWidth: paperSize === 'a3' ? 10 : 8, halign: 'center' },
        1: { cellWidth: paperSize === 'a3' ? 28 : 22, fontStyle: 'bold' },
        2: { cellWidth: paperSize === 'a3' ? 76 : 52, fontStyle: 'bold' },
        3: { cellWidth: paperSize === 'a3' ? 18 : 14, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: paperSize === 'a3' ? 18 : 14, halign: 'center' },
        5: { cellWidth: paperSize === 'a3' ? 60 : 42, fontStyle: 'bold' },
        6: { cellWidth: paperSize === 'a3' ? 30 : 22, fontStyle: 'bold' },
        7: { cellWidth: paperSize === 'a3' ? 36 : 26, fontStyle: 'bold' },
        8: { cellWidth: 'auto', fontSize: paperSize === 'a3' ? 9 : 8.5 },
        9: { cellWidth: paperSize === 'a3' ? 36 : 26, fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const sec = selectedSections[data.row.index];
          if (!sec) return;
          const pal = getPdfSubjectPalette(sec.course_code, sec.course_title, sec.course_type_code);
          const hasClash = confirmedClashIds.has(sec.id);

          if (hasClash) {
            data.cell.styles.fillColor = [252, 232, 230];
            data.cell.styles.textColor = [165, 14, 14];
          } else if (data.column.index === 1 || data.column.index === 3) {
            data.cell.styles.fillColor = pal.fill;
          }
        }
      },
    });
  }

  // ============================================================================
  // PAGE NUMBERS & FOOTER ON ALL PAGES
  // ============================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `VIT FFCS Timetable • ${planName} • ${semester} (${campusLabel}) • Format: Landscape ${paperSize.toUpperCase()}`,
      margin,
      pageHeight - 5
    );
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 5,
      { align: 'right' }
    );
  }

  const safePlan = planName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `VIT_FFCS_Timetable_${safePlan}_${paperSize.toUpperCase()}_${contentMode}.pdf`;

  if (action === 'print') {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  } else {
    doc.save(filename);
  }
}
