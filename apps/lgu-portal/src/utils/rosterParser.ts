import * as XLSX from 'xlsx';

export interface DriverRosterRow {
  no: number | string;
  name: string;
  franchiseNumber: string;
}

export async function parseDriverRoster(
  fileOrUrlOrBuffer: File | ArrayBuffer | string
): Promise<{ count: number; rows: DriverRosterRow[] }> {
  try {
    let arrayBuffer: ArrayBuffer;

    if (fileOrUrlOrBuffer instanceof File) {
      arrayBuffer = await fileOrUrlOrBuffer.arrayBuffer();
    } else if (fileOrUrlOrBuffer instanceof ArrayBuffer) {
      arrayBuffer = fileOrUrlOrBuffer;
    } else if (typeof fileOrUrlOrBuffer === 'string') {
      const response = await fetch(fileOrUrlOrBuffer);
      if (!response.ok) {
        throw new Error(`Failed to fetch spreadsheet: ${response.statusText}`);
      }
      arrayBuffer = await response.arrayBuffer();
    } else {
      return { count: 0, rows: [] };
    }

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { count: 0, rows: [] };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return { count: 0, rows: [] };
    }

    // Detect best header row index
    let headerRowIndex = -1;
    let nameColIndex = -1;
    let franchiseColIndex = -1;
    let noColIndex = -1;
    let maxHeaderScore = 0;

    // Scan first 10 rows to detect the true column header row
    for (let i = 0; i < Math.min(10, rawRows.length); i++) {
      const row = rawRows[i].map((cell) => String(cell || '').trim());
      let currentScore = 0;
      let cNo = -1;
      let cName = -1;
      let cFranchise = -1;

      for (let c = 0; c < row.length; c++) {
        const text = row[c].toLowerCase();
        if (!text) continue;

        // Check if column is "No." / "#"
        if (/^(no\.?|#|item|num|seq|id)$/i.test(text) || (text.startsWith('no.') && text.length <= 6)) {
          cNo = c;
          currentScore += 2;
        }
        // Check if column is "Name" / "Driver Name"
        else if (
          (/name/i.test(text) || /driver/i.test(text) || /member/i.test(text) || /operator/i.test(text) || /full\s*name/i.test(text)) &&
          text.length <= 35 && !/roster|ledger|list of|association|sheet|form|report/i.test(text)
        ) {
          cName = c;
          currentScore += 4;
        }
        // Check if column is "Franchise" / "MTOP" / "Plate"
        else if (
          (/franchise/i.test(text) || /mtop/i.test(text) || /plate/i.test(text) || /unit/i.test(text) || /permit/i.test(text) || /body/i.test(text) || /vehicle/i.test(text)) &&
          text.length <= 35
        ) {
          cFranchise = c;
          currentScore += 4;
        }
      }

      if (currentScore > maxHeaderScore && (cName !== -1 || (cNo !== -1 && cFranchise !== -1))) {
        maxHeaderScore = currentScore;
        headerRowIndex = i;
        nameColIndex = cName;
        franchiseColIndex = cFranchise;
        noColIndex = cNo;
      }
    }

    // Default column fallbacks
    if (headerRowIndex === -1) {
      nameColIndex = 1;
      franchiseColIndex = 2;
      noColIndex = 0;
    } else {
      if (nameColIndex === -1) {
        nameColIndex = noColIndex === 0 ? 1 : 0;
      }
      if (franchiseColIndex === -1) {
        franchiseColIndex = nameColIndex === 1 ? 2 : 1;
      }
    }

    const rows: DriverRosterRow[] = [];
    let sequence = 1;

    for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.every((c) => String(c || '').trim() === '')) {
        continue; // skip blank rows
      }

      let rawName = '';
      if (nameColIndex !== -1 && row[nameColIndex] !== undefined) {
        rawName = String(row[nameColIndex]).trim();
      } else {
        const found = row.find((c) => typeof c === 'string' && /[a-zA-Z]{2,}/.test(c));
        rawName = found ? String(found).trim() : '';
      }

      let rawFranchise = '';
      if (franchiseColIndex !== -1 && row[franchiseColIndex] !== undefined) {
        rawFranchise = String(row[franchiseColIndex]).trim();
      } else {
        const other = row.find((c, idx) => idx !== nameColIndex && idx !== noColIndex && String(c || '').trim() !== '');
        rawFranchise = other ? String(other).trim() : '';
      }

      // Strict validation: Ignore title/header/summary rows
      const lowerName = rawName.toLowerCase();
      const lowerFranchise = rawFranchise.toLowerCase();

      // 1. Skip if name matches header words
      if (/^(no\.?|name|driver name|member name|full\s*name|franchise|mtop|unit|plate|total|summary|prepared by|approved by|noted by|signature|page|status|date|notes?|remarks?)$/i.test(lowerName)) {
        continue;
      }

      // 2. Skip if name is a title banner
      if (rawName.length > 50 || /roster|ledger|list of|accreditation|calapan city|transport office|association/i.test(lowerName)) {
        continue;
      }

      // 3. Skip if franchise is a header word
      if (/^(franchise|mtop|plate|unit|permit|franchise no\.?|plate no\.?)$/i.test(lowerFranchise)) {
        continue;
      }

      // 4. Must have at least 2 alphabetical characters in the name
      if (!/[a-zA-Z\u00C0-\u024F]{2,}/.test(rawName)) {
        continue;
      }

      // 5. Must not be empty
      if (!rawName && !rawFranchise) {
        continue;
      }

      rows.push({
        no: sequence++,
        name: rawName || '—',
        franchiseNumber: rawFranchise || '—',
      });
    }

    return { count: rows.length, rows };
  } catch (err) {
    console.warn('[rosterParser] Failed to parse driver roster:', err);
    return { count: 0, rows: [] };
  }
}
