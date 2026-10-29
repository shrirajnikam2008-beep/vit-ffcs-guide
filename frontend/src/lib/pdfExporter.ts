import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ClashReport,
  Course,
  CourseSection,
  PeriodHeader,
  SlotOccurrence,
} from '../types/ffcs';
import { getSubjectColorStyle } from './subjectColors';

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

const ALL_DAYS: Array<{ code: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'; label: string }> = [
  { code: 'MON', label: 'Monday' },
  { code: 'TUE', label: 'Tuesday' },
  { code: 'WED', label: 'Wednesday' },
  { code: 'THU', label: 'Thursday' },
  { code: 'FRI', label: 'Friday' },
  { code: 'SAT', label: 'Saturday' },
];

const VELLORE_SLOT_LABELS: Record<string, Record<number, string>> = {
  MON: { 1: 'A1 / L1', 2: 'F1 / L2', 3: 'D1 / L3', 4: 'TB1 / L4', 5: 'TG1 / L5', 6: 'L6', 7: 'A2 / L31', 8: 'F2 / L32', 9: 'D2 / L33', 10: 'TB2 / L34', 11: 'TG2 / L35', 12: 'V3 / L36' },
  TUE: { 1: 'B1 / L7', 2: 'G1 / L8', 3: 'E1 / L9', 4: 'TC1 / L10', 5: 'TAA1 / L11', 6: 'L12', 7: 'B2 / L37', 8: 'G2 / L38', 9: 'E2 / L39', 10: 'TC2 / L40', 11: 'TAA2 / L41', 12: 'V4 / L42' },
  WED: { 1: 'C1 / L13', 2: 'A1 / L14', 3: 'F1 / L15', 4: 'V1 / L16', 5: 'V2 / L17', 6: 'L18', 7: 'C2 / L43', 8: 'A2 / L44', 9: 'F2 / L45', 10: 'TD2 / L46', 11: 'TBB2 / L47', 12: 'V5 / L48' },
  THU: { 1: 'D1 / L19', 2: 'B1 / L20', 3: 'G1 / L21', 4: 'TE1 / L22', 5: 'TCC1 / L23', 6: 'L24', 7: 'D2 / L49', 8: 'B2 / L50', 9: 'G2 / L51', 10: 'TE2 / L52', 11: 'TCC2 / L53', 12: 'V6 / L54' },
  FRI: { 1: 'E1 / L25', 2: 'C1 / L26', 3: 'TA1 / L27', 4: 'TF1 / L28', 5: 'TD1 / L29', 6: 'L30', 7: 'E2 / L55', 8: 'C2 / L56', 9: 'TA2 / L57', 10: 'TF2 / L58', 11: 'TDD2 / L59', 12: 'V7 / L60' },
  SAT: { 1: 'SAT-1', 2: 'SAT-2', 3: 'SAT-3', 4: 'SAT-4', 5: 'SAT-5', 6: 'SAT-6', 7: 'SAT-7', 8: 'SAT-8', 9: 'SAT-9', 10: 'SAT-10', 11: 'SAT-11', 12: 'SAT-12' },
};

interface CellSlotEntry {
  section: CourseSection;
  occurrence: SlotOccurrence;
  hasClash: boolean;
}

/**
 * Helper to draw a single-line string that shrinks font slightly if needed so it NEVER wraps mid-word.
 */
function drawFittedSingleLine(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  baseFontSize: number,
  minFontSize = 6.2
) {
  let size = baseFontSize;
  doc.setFontSize(size);
  while (doc.getTextWidth(text) > maxWidth && size > minFontSize) {
    size -= 0.25;
    doc.setFontSize(size);
  }
  doc.text(text, x, y);
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
  const margin = paperSize === 'a3' ? 11 : 8;

  const campusLabel = campus.toLowerCase() === 'chennai' ? 'VIT Chennai' : 'VIT Vellore';
  const generatedTimestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

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

  const hasSaturdayClass = selectedSections.some((s) =>
    (s.parsed_slot?.occurrences ?? []).some((o) => o.day === 'SAT')
  );
  const daysToRender =
    showSaturday || hasSaturdayClass ? ALL_DAYS : ALL_DAYS.slice(0, 5);

  /**
   * Renders the structured Weekly Planner Header (matching Screenshot 2's clean title + right metadata table box)
   */
  const drawPlannerHeader = (subtitle: string): number => {
    // Left Title Block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(paperSize === 'a3' ? 23 : 19);
    doc.setTextColor(15, 23, 42);
    doc.text('VIT FFCS Weekly Timetable', margin, margin + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(paperSize === 'a3' ? 11 : 9.5);
    doc.setTextColor(37, 99, 235);
    doc.text(`${planName}  •  ${subtitle}`, margin, margin + 13.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(paperSize === 'a3' ? 9 : 8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Generated: ${generatedTimestamp}`, margin, margin + 18.5);

    // Right Structured Planner Info Box (like Screenshot 2's Grade/Term box)
    const boxW = paperSize === 'a3' ? 118 : 94;
    const boxH = 16;
    const boxX = pageWidth - margin - boxW;
    const boxY = margin + 1;

    doc.setFillColor(254, 249, 195); // #FEF9C3 warm planner cream
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.35);
    doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, 'FD');
    doc.line(boxX, boxY + boxH / 2, boxX + boxW, boxY + boxH / 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(paperSize === 'a3' ? 9.5 : 8.2);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `Semester: ${semester}   |   Campus: ${campusLabel}`,
      boxX + 3.5,
      boxY + 5.5
    );

    doc.setTextColor(
      confirmedClashCount === 0 ? 21 : 185,
      confirmedClashCount === 0 ? 128 : 28,
      confirmedClashCount === 0 ? 61 : 28
    );
    doc.text(
      `Courses: ${uniqueCourseCodes.length} (${selectedSections.length} sections)   |   Credits: ${totalCredits}   |   ${
        confirmedClashCount === 0 ? 'No Clashes' : `${confirmedClashCount} Clash(es)`
      }`,
      boxX + 3.5,
      boxY + 13.3
    );

    return margin + 21.5;
  };

  // ============================================================================
  // PAGE 1: CLEAN STRUCTURED WEEKLY PLANNER GRID (SCREENSHOT 2 STYLE)
  // ============================================================================
  if (contentMode === 'visual' || contentMode === 'both') {
    const startY = drawPlannerHeader('Structured Weekly Schedule (Full Course, Faculty, Venue & Slot Details)');

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

    const getHeaderForPeriod = (pNum: number): string => {
      const found = periodHeaders.find((h) => h.period === pNum);
      if (!found) return `Period ${pNum}`;
      return `Period ${pNum}\nTh: ${found.theory_time}\nLab: ${found.lab_time}`;
    };

    const headRow = [
      'Day / Time',
      getHeaderForPeriod(1),
      getHeaderForPeriod(2),
      getHeaderForPeriod(3),
      getHeaderForPeriod(4),
      getHeaderForPeriod(5),
      getHeaderForPeriod(6),
      'LUNCH\n13:20',
      getHeaderForPeriod(7),
      getHeaderForPeriod(8),
      getHeaderForPeriod(9),
      getHeaderForPeriod(10),
      getHeaderForPeriod(11),
      getHeaderForPeriod(12),
    ];

    // Store cell entries for custom structured card drawing in didDrawCell
    const cellEntriesMatrix: Record<string, CellSlotEntry[]> = {};

    const prepareCellPlaceholder = (
      dayCode: string,
      periodNum: number,
      rowIdx: number,
      colIdx: number
    ): string => {
      const entries = cellMap[dayCode]?.[periodNum] ?? [];
      if (entries.length > 0) {
        cellEntriesMatrix[`${rowIdx}_${colIdx}`] = entries;
        // Return empty string so autoTable doesn't draw raw unformatted text;
        // our custom structured card renderer in didDrawCell draws the exact layout!
        return '';
      }
      return VELLORE_SLOT_LABELS[dayCode]?.[periodNum] ?? '';
    };

    const bodyRows = daysToRender.map((dayObj, rowIdx) => [
      dayObj.label, // Single-line "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"
      prepareCellPlaceholder(dayObj.code, 1, rowIdx, 1),
      prepareCellPlaceholder(dayObj.code, 2, rowIdx, 2),
      prepareCellPlaceholder(dayObj.code, 3, rowIdx, 3),
      prepareCellPlaceholder(dayObj.code, 4, rowIdx, 4),
      prepareCellPlaceholder(dayObj.code, 5, rowIdx, 5),
      prepareCellPlaceholder(dayObj.code, 6, rowIdx, 6),
      'LUNCH',
      prepareCellPlaceholder(dayObj.code, 7, rowIdx, 8),
      prepareCellPlaceholder(dayObj.code, 8, rowIdx, 9),
      prepareCellPlaceholder(dayObj.code, 9, rowIdx, 10),
      prepareCellPlaceholder(dayObj.code, 10, rowIdx, 11),
      prepareCellPlaceholder(dayObj.code, 11, rowIdx, 12),
      prepareCellPlaceholder(dayObj.code, 12, rowIdx, 13),
    ]);

    const usableWidth = pageWidth - margin * 2;
    // Generous Day column width (27mm on A3, 21mm on A4) so "Wednesday" NEVER wraps letter-by-letter!
    const dayColWidth = paperSize === 'a3' ? 27 : 21;
    // Clean Lunch column width (13mm on A3, 10mm on A4) so "LUNCH" NEVER wraps into LUN/CH!
    const lunchColWidth = paperSize === 'a3' ? 13 : 10;
    const periodColWidth = (usableWidth - dayColWidth - lunchColWidth) / 12;

    // Uniform, consistent row height across all weekdays so the planner is a symmetric rectangular grid
    const uniformRowHeight =
      paperSize === 'a3'
        ? daysToRender.length <= 5
          ? 38
          : 32
        : daysToRender.length <= 5
        ? 27
        : 23;

    autoTable(doc, {
      startY,
      margin: { left: margin, right: margin, bottom: 14 },
      head: [headRow],
      body: bodyRows,
      theme: 'grid',
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      styles: {
        font: 'helvetica',
        fontSize: paperSize === 'a3' ? 8.5 : 7,
        cellPadding: 1.5,
        lineColor: [148, 163, 184], // Crisp slate planner grid border
        lineWidth: 0.3,
        textColor: [15, 23, 42],
        valign: 'middle',
        halign: 'center',
        minCellHeight: uniformRowHeight,
      },
      headStyles: {
        fillColor: [254, 249, 195], // #FEF9C3 warm planner header matching Screenshot 2
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: paperSize === 'a3' ? 8.2 : 6.6,
        halign: 'center',
        valign: 'middle',
        cellPadding: paperSize === 'a3' ? 2 : 1.2,
        minCellHeight: paperSize === 'a3' ? 14 : 11,
      },
      columnStyles: {
        0: {
          cellWidth: dayColWidth,
          fontStyle: 'bold',
          fontSize: paperSize === 'a3' ? 10.5 : 8.5,
          halign: 'center',
          valign: 'middle',
          fillColor: [254, 252, 232], // #FEFCE8
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
          fontSize: paperSize === 'a3' ? 7.5 : 6.2,
          fillColor: [254, 252, 232],
          textColor: [100, 116, 139],
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
          const entries = cellEntriesMatrix[key];
          if (entries && entries.length > 0) {
            const primary = entries[0];
            const style = getSubjectColorStyle(
              primary.section.course_code,
              primary.section.course_title,
              primary.section.course_type_code
            );
            const anyClash = entries.some((e) => e.hasClash) || entries.length > 1;
            data.cell.styles.fillColor = anyClash ? [252, 232, 230] : style.rgbFill;
          } else {
            // Empty slot cell watermark
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.textColor = [160, 174, 192];
            data.cell.styles.fontSize = paperSize === 'a3' ? 7.5 : 6.2;
          }
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index !== 0 && data.column.index !== 7) {
          const key = `${data.row.index}_${data.column.index}`;
          const entries = cellEntriesMatrix[key];
          if (!entries || entries.length === 0) return;

          const primary = entries[0];
          const sec = primary.section;
          const style = getSubjectColorStyle(
            sec.course_code,
            sec.course_title,
            sec.course_type_code
          );
          const anyClash = entries.some((e) => e.hasClash) || entries.length > 1;

          const cx = data.cell.x;
          const cy = data.cell.y;
          const cw = data.cell.width;
          const ch = data.cell.height;

          // 1. Draw colored left accent border (1.4mm wide)
          const accent = anyClash ? [217, 48, 37] : style.rgbAccent;
          doc.setFillColor(accent[0], accent[1], accent[2]);
          doc.rect(cx, cy, 1.4, ch, 'F');

          const padX = cx + 2.4;
          const innerW = cw - 3.6;

          // 2. Top Line: Course Code (Left) + Component Type Pill Badge (Right)
          const codeFontSize = paperSize === 'a3' ? 8.8 : 7.2;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(codeFontSize);
          doc.setTextColor(accent[0], accent[1], accent[2]);
          doc.text(sec.course_code, padX, cy + (paperSize === 'a3' ? 4.2 : 3.4));

          // Type Pill Badge (ETH / ELA) on top-right
          const typeText = sec.course_type_code;
          doc.setFontSize(paperSize === 'a3' ? 7 : 5.8);
          const badgeW = doc.getTextWidth(typeText) + 2.6;
          const badgeH = paperSize === 'a3' ? 3.8 : 3.1;
          const badgeX = cx + cw - badgeW - 1.4;
          const badgeY = cy + (paperSize === 'a3' ? 1.3 : 1.0);

          doc.setFillColor(
            style.rgbBadgeBg[0],
            style.rgbBadgeBg[1],
            style.rgbBadgeBg[2]
          );
          doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 0.7, 0.7, 'F');
          doc.setTextColor(accent[0], accent[1], accent[2]);
          doc.text(typeText, badgeX + 1.3, badgeY + (paperSize === 'a3' ? 2.7 : 2.2));

          // 3. Middle Block: Full Course Title (Word-wrapped cleanly, never breaking mid-word)
          doc.setFont('helvetica', 'bold');
          const titleFontSize = paperSize === 'a3' ? 7.8 : 6.2;
          doc.setFontSize(titleFontSize);
          doc.setTextColor(15, 23, 42);
          const wrappedTitle: string[] = doc.splitTextToSize(sec.course_title, innerW);
          const maxTitleLines = paperSize === 'a3' ? 3 : 2;
          const titleLines = wrappedTitle.slice(0, maxTitleLines);
          const titleStartY = cy + (paperSize === 'a3' ? 8.3 : 6.6);
          const titleLineStep = paperSize === 'a3' ? 3.3 : 2.5;
          titleLines.forEach((line, idx) => {
            doc.text(line, padX, titleStartY + idx * titleLineStep);
          });

          // 4. Bottom Aligned Metadata Block: Faculty, Venue, Slot (Separated by thin line)
          const metaBlockHeight = paperSize === 'a3' ? 13.5 : 9.8;
          const sepY = cy + ch - metaBlockHeight;
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.2);
          doc.line(padX, sepY, cx + cw - 1.4, sepY);

          const metaBaseFont = paperSize === 'a3' ? 7.6 : 6.1;
          const metaMinFont = paperSize === 'a3' ? 6.3 : 5.2;
          const metaStep = paperSize === 'a3' ? 3.8 : 2.8;

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          drawFittedSingleLine(
            doc,
            `Faculty: ${sec.faculty_name}`,
            padX,
            sepY + (paperSize === 'a3' ? 3.6 : 2.6),
            innerW,
            metaBaseFont,
            metaMinFont
          );

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          drawFittedSingleLine(
            doc,
            `Venue: ${sec.venue || 'TBA'}`,
            padX,
            sepY + (paperSize === 'a3' ? 3.6 : 2.6) + metaStep,
            innerW,
            metaBaseFont,
            metaMinFont
          );

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(accent[0], accent[1], accent[2]);
          drawFittedSingleLine(
            doc,
            `Slot: ${sec.slot_combination}`,
            padX,
            sepY + (paperSize === 'a3' ? 3.6 : 2.6) + metaStep * 2,
            innerW,
            metaBaseFont,
            metaMinFont
          );
        }
      },
    });

    // Draw Bottom Registered Courses & Subject Color Legend (Screenshot 2 Footer Style)
    const finalY = (doc as any).lastAutoTable?.finalY ?? startY + 190;
    if (finalY + 16 < pageHeight - 10) {
      const legendY = finalY + 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(paperSize === 'a3' ? 9 : 7.8);
      doc.setTextColor(15, 23, 42);
      doc.text(
        'Registered Courses Summary & Color Legend (ETH = Embedded Theory  •  ELA = Embedded Lab  •  OC = Online Course):',
        margin,
        legendY
      );

      let curX = margin;
      let curY = legendY + 3.2;

      for (const code of uniqueCourseCodes) {
        const courseSecs = selectedSections.filter((s) => s.course_code === code);
        if (courseSecs.length === 0) continue;
        const first = courseSecs[0];
        const style = getSubjectColorStyle(first.course_code, first.course_title, first.course_type_code);
        const slotsDesc = courseSecs
          .map((s) => `${s.course_type_code}: ${s.slot_combination} (${s.venue} · ${s.faculty_name})`)
          .join('  |  ');
        const label = `${first.course_code} — ${first.course_title}  [${slotsDesc}]`;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(paperSize === 'a3' ? 8 : 6.8);
        const chipW = Math.min(pageWidth - margin * 2, doc.getTextWidth(label) + 8);

        if (curX + chipW > pageWidth - margin) {
          curX = margin;
          curY += paperSize === 'a3' ? 6 : 5;
        }
        if (curY < pageHeight - 9) {
          doc.setFillColor(style.rgbFill[0], style.rgbFill[1], style.rgbFill[2]);
          doc.setDrawColor(style.rgbAccent[0], style.rgbAccent[1], style.rgbAccent[2]);
          doc.roundedRect(curX, curY - 3.2, chipW, paperSize === 'a3' ? 4.8 : 4.1, 1, 1, 'FD');

          doc.setFillColor(style.rgbAccent[0], style.rgbAccent[1], style.rgbAccent[2]);
          doc.rect(curX, curY - 3.2, 1.6, paperSize === 'a3' ? 4.8 : 4.1, 'F');

          doc.setTextColor(15, 23, 42);
          doc.text(label, curX + 3.2, curY + 0.2);
          curX += chipW + 3;
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

    const page2StartY = drawPlannerHeader(
      'Detailed Registered Class List (Complete Course Titles, Faculty, Slots, Venues & Verified Timings)'
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
              .join('  •  ')
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
      margin: { left: margin, right: margin, bottom: 15 },
      head: detailHead,
      body: detailBody,
      theme: 'grid',
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      styles: {
        font: 'helvetica',
        fontSize: paperSize === 'a3' ? 10 : 8.8,
        cellPadding: paperSize === 'a3' ? 3 : 2.2,
        lineColor: [148, 163, 184],
        lineWidth: 0.25,
        textColor: [15, 23, 42],
        valign: 'middle',
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [254, 249, 195],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: paperSize === 'a3' ? 10 : 9,
        halign: 'left',
        cellPadding: paperSize === 'a3' ? 3 : 2.2,
      },
      columnStyles: {
        0: { cellWidth: paperSize === 'a3' ? 10 : 8, halign: 'center' },
        1: { cellWidth: paperSize === 'a3' ? 28 : 22, fontStyle: 'bold' },
        2: { cellWidth: paperSize === 'a3' ? 76 : 52, fontStyle: 'bold' },
        3: { cellWidth: paperSize === 'a3' ? 18 : 14, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: paperSize === 'a3' ? 18 : 14, halign: 'center' },
        5: { cellWidth: paperSize === 'a3' ? 58 : 42, fontStyle: 'bold' },
        6: { cellWidth: paperSize === 'a3' ? 30 : 22, fontStyle: 'bold' },
        7: { cellWidth: paperSize === 'a3' ? 36 : 26, fontStyle: 'bold' },
        8: { cellWidth: 'auto', fontSize: paperSize === 'a3' ? 9 : 8 },
        9: { cellWidth: paperSize === 'a3' ? 36 : 26, fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const sec = selectedSections[data.row.index];
          if (!sec) return;
          const style = getSubjectColorStyle(sec.course_code, sec.course_title, sec.course_type_code);
          const hasClash = confirmedClashIds.has(sec.id);

          if (hasClash) {
            data.cell.styles.fillColor = [252, 232, 230];
            data.cell.styles.textColor = [165, 14, 14];
          } else {
            data.cell.styles.fillColor = style.rgbFill;
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
      `VIT FFCS Weekly Timetable  •  ${planName}  •  ${semester} (${campusLabel})  •  Landscape ${paperSize.toUpperCase()}`,
      margin,
      pageHeight - 4.5
    );
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 4.5,
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
