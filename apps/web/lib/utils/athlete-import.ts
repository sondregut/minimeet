import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { Gender, CreateAthleteInput } from '@minimeet/types';

// Column header mappings (case-insensitive)
const COLUMN_MAPPINGS: Record<string, keyof ParsedAthleteRow> = {
  // First name variations
  first_name: 'first_name',
  firstname: 'first_name',
  'first name': 'first_name',
  fornavn: 'first_name',

  // Last name variations
  last_name: 'last_name',
  lastname: 'last_name',
  'last name': 'last_name',
  etternavn: 'last_name',

  // Gender variations
  gender: 'gender',
  sex: 'gender',
  kjønn: 'gender',
  kjonn: 'gender',

  // Date of birth variations
  date_of_birth: 'date_of_birth',
  dateofbirth: 'date_of_birth',
  'date of birth': 'date_of_birth',
  dob: 'date_of_birth',
  birthday: 'date_of_birth',
  birth_date: 'date_of_birth',
  birthdate: 'date_of_birth',
  fødselsdato: 'date_of_birth',
  fodselsdato: 'date_of_birth',

  // Nationality variations
  nationality: 'nationality',
  country: 'nationality',
  nation: 'nationality',
  nasjonalitet: 'nationality',
  land: 'nationality',

  // Club variations
  club_name: 'club_name',
  clubname: 'club_name',
  club: 'club_name',
  team: 'club_name',
  klubb: 'club_name',
  lag: 'club_name',

  // License variations
  license_number: 'license_number',
  licensenumber: 'license_number',
  license: 'license_number',
  'license number': 'license_number',
  lisens: 'license_number',
  lisensnummer: 'license_number',
};

// Gender value mappings
const GENDER_MAPPINGS: Record<string, Gender> = {
  // Male
  m: 'M',
  male: 'M',
  mann: 'M',
  men: 'M',
  man: 'M',
  gutt: 'M',
  herrer: 'M',

  // Female
  w: 'W',
  f: 'W',
  female: 'W',
  kvinne: 'W',
  women: 'W',
  woman: 'W',
  jente: 'W',
  damer: 'W',
  k: 'W',

  // Other/Non-binary
  x: 'X',
  other: 'X',
  annet: 'X',
  'non-binary': 'X',
  nonbinary: 'X',
};

export interface ParsedAthleteRow {
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth?: string;
  nationality?: string;
  club_name?: string;
  license_number?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ParsedAthlete extends CreateAthleteInput {
  rowNumber: number;
}

export interface ImportParseResult {
  athletes: ParsedAthlete[];
  errors: ValidationError[];
  totalRows: number;
  validRows: number;
}

/**
 * Parse a CSV string into athlete data
 */
export function parseCSV(csvContent: string): Promise<ImportParseResult> {
  return new Promise((resolve) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => normalizeColumnName(header),
      complete: (results) => {
        const parseResult = processRows(results.data as Record<string, string>[]);
        resolve(parseResult);
      },
      error: () => {
        resolve({
          athletes: [],
          errors: [{ row: 0, field: 'file', message: 'Failed to parse CSV file' }],
          totalRows: 0,
          validRows: 0,
        });
      },
    });
  });
}

/**
 * Parse an Excel file (ArrayBuffer) into athlete data
 */
export function parseExcel(buffer: ArrayBuffer): ImportParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON with headers
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
      raw: false,
      defval: '',
    });

    // Normalize column names
    const normalizedData = data.map((row) => {
      const normalized: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = normalizeColumnName(key);
        normalized[normalizedKey] = String(value || '');
      }
      return normalized;
    });

    return processRows(normalizedData);
  } catch {
    return {
      athletes: [],
      errors: [{ row: 0, field: 'file', message: 'Failed to parse Excel file' }],
      totalRows: 0,
      validRows: 0,
    };
  }
}

/**
 * Normalize column header to standard field name
 */
function normalizeColumnName(header: string): string {
  const normalized = header.toLowerCase().trim();
  return COLUMN_MAPPINGS[normalized] || normalized;
}

/**
 * Normalize gender value to Gender type
 */
function normalizeGender(value: string): Gender | null {
  const normalized = value.toLowerCase().trim();
  return GENDER_MAPPINGS[normalized] || null;
}

/**
 * Normalize date to ISO format (YYYY-MM-DD)
 */
function normalizeDate(value: string): string | undefined {
  if (!value || value.trim() === '') {
    return undefined;
  }

  const trimmed = value.trim();

  // Try ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Try DD.MM.YYYY (Norwegian format)
  const norwegianMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (norwegianMatch) {
    const [, day, month, year] = norwegianMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try DD/MM/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try MM/DD/YYYY (US format)
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try to parse with Date
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return undefined;
}

/**
 * Process parsed rows into athlete data with validation
 */
function processRows(rows: Record<string, string>[]): ImportParseResult {
  const athletes: ParsedAthlete[] = [];
  const errors: ValidationError[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +2 for 1-indexed + header row
    const rowErrors: ValidationError[] = [];

    // Extract and validate required fields
    const firstName = row.first_name?.trim();
    const lastName = row.last_name?.trim();
    const genderRaw = row.gender?.trim();

    // Validate first_name
    if (!firstName) {
      rowErrors.push({
        row: rowNumber,
        field: 'first_name',
        message: 'First name is required',
      });
    }

    // Validate last_name
    if (!lastName) {
      rowErrors.push({
        row: rowNumber,
        field: 'last_name',
        message: 'Last name is required',
      });
    }

    // Validate and normalize gender
    const gender = normalizeGender(genderRaw || '');
    if (!gender) {
      rowErrors.push({
        row: rowNumber,
        field: 'gender',
        message: `Invalid gender value: "${genderRaw}". Use M, W, or X`,
      });
    }

    // If there are validation errors, add them and skip this row
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return;
    }

    // Extract optional fields
    const dateOfBirth = normalizeDate(row.date_of_birth || '');
    const nationality = row.nationality?.trim().toUpperCase() || 'NOR';
    const clubName = row.club_name?.trim() || undefined;
    const licenseNumber = row.license_number?.trim() || undefined;

    // Validate nationality format (3-letter code)
    if (nationality && nationality.length !== 3) {
      errors.push({
        row: rowNumber,
        field: 'nationality',
        message: `Invalid nationality: "${nationality}". Use 3-letter country code (e.g., NOR, SWE)`,
      });
    }

    athletes.push({
      rowNumber,
      first_name: firstName!,
      last_name: lastName!,
      gender: gender!,
      date_of_birth: dateOfBirth,
      nationality: nationality.length === 3 ? nationality : 'NOR',
      club_name: clubName,
      license_number: licenseNumber,
    });
  });

  return {
    athletes,
    errors,
    totalRows: rows.length,
    validRows: athletes.length,
  };
}

/**
 * Get the file type from filename
 */
export function getFileType(filename: string): 'csv' | 'excel' | 'unknown' {
  const ext = filename.toLowerCase().split('.').pop();

  if (ext === 'csv') {
    return 'csv';
  }

  if (ext === 'xlsx' || ext === 'xls') {
    return 'excel';
  }

  return 'unknown';
}

/**
 * Generate a CSV template for athlete import
 */
export function generateTemplate(): string {
  const headers = [
    'first_name',
    'last_name',
    'gender',
    'date_of_birth',
    'nationality',
    'club_name',
    'license_number',
  ];

  const exampleRow = [
    'John',
    'Doe',
    'M',
    '2000-01-15',
    'NOR',
    'IL Tyrving',
    '12345',
  ];

  return `${headers.join(',')}\n${exampleRow.join(',')}`;
}
