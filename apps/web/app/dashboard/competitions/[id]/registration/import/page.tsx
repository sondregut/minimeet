'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Download,
  X,
  Loader2,
} from 'lucide-react';
import {
  bulkImportRegistrations,
  type BulkRegistrationImportRow,
} from '@/lib/actions/registrations';

export default function ImportRegistrationsPage() {
  const params = useParams();
  const competitionId = params.id as string;

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<BulkRegistrationImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    successCount: number;
    errorCount: number;
    errors: Array<{ row: number; message: string }>;
    createdRegistrations: number;
  } | null>(null);

  const parseCSV = useCallback((text: string): BulkRegistrationImportRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV må ha en overskriftsrad og minst én datarad');
    }

    // Parse header - normalize by removing special chars, whitespace, converting to lowercase
    const normalizeHeader = (h: string): string => {
      return h.trim()
        .toLowerCase()
        .replace(/['"]/g, '')
        .replace(/[æ]/g, 'e')
        .replace(/[ø]/g, 'o')
        .replace(/[å]/g, 'a')
        .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric
    };

    // Find the header row - skip lines that don't look like CSV headers (no delimiters)
    let headerLineIndex = 0;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i];
      // A header line should have at least 2 columns (contains comma or semicolon)
      if (line.includes(',') || line.includes(';')) {
        headerLineIndex = i;
        break;
      }
    }

    const header = lines[headerLineIndex].split(/[,;]/).map(normalizeHeader);

    // Flexible header matching - matches partial strings too
    const matchHeader = (h: string): string | null => {
      // Name variations
      if (h.includes('navn') || h === 'name' || h.includes('fullname') || h.includes('utover') || h.includes('athlete')) {
        return 'name';
      }
      // Club variations
      if (h.includes('klubb') || h.includes('club') || h.includes('lag') || h.includes('team') || h.includes('forening')) {
        return 'club_name';
      }
      // Birth date variations
      if (h.includes('fodt') || h.includes('fodsel') || h.includes('birth') || h.includes('dob') || h.includes('dato') && h.includes('f')) {
        return 'date_of_birth';
      }
      // Age class variations
      if (h.includes('klasse') || h.includes('class') || h.includes('kategori') || h.includes('category') || h.includes('alder') || h.includes('age')) {
        return 'age_class';
      }
      // Event variations
      if (h.includes('ovelse') || h.includes('event') || h.includes('disiplin') || h.includes('discipline') || h.includes('gren')) {
        return 'event_name';
      }
      return null; // Unknown column - will be ignored
    };

    const columnMap = header.map(matchHeader);

    // Check required columns
    if (!columnMap.includes('name')) {
      throw new Error('Fant ikke kolonne for navn. Prøv kolonnenavn som "Navn", "Utøver" eller "Name".');
    }
    if (!columnMap.includes('age_class')) {
      throw new Error('Fant ikke kolonne for klasse. Prøv kolonnenavn som "Klasse", "Kategori" eller "Aldersklasse".');
    }
    if (!columnMap.includes('event_name')) {
      throw new Error('Fant ikke kolonne for øvelse. Prøv kolonnenavn som "Øvelse", "Disiplin" eller "Event".');
    }

    // Detect delimiter (comma or semicolon)
    const delimiter = lines[headerLineIndex].includes(';') ? ';' : ',';

    // Parse data rows (start after header)
    const rows: BulkRegistrationImportRow[] = [];
    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      // Handle lines that are entirely quoted (some exports do this)
      if (line.startsWith('"') && line.endsWith('"') && !line.slice(1, -1).includes('","')) {
        // Check if it's a full-line quote with internal escaped quotes
        line = line.slice(1, -1).replace(/""/g, '"');
      }

      // Handle quoted values with delimiter
      const values: string[] = [];
      let inQuote = false;
      let current = '';
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = line[j + 1];

        if (char === '"') {
          if (inQuote && nextChar === '"') {
            // Escaped quote inside quoted field
            current += '"';
            j++; // Skip next quote
          } else {
            inQuote = !inQuote;
          }
        } else if (char === delimiter && !inQuote) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const row: Record<string, string> = {};
      columnMap.forEach((col, idx) => {
        if (col && values[idx] !== undefined) {
          row[col] = values[idx].replace(/^["']|["']$/g, '').trim();
        }
      });

      // Only add row if we have the required fields with actual values
      if (row.name && row.age_class && row.event_name) {
        rows.push({
          name: row.name,
          club_name: row.club_name || undefined,
          date_of_birth: row.date_of_birth || undefined,
          age_class: row.age_class,
          event_name: row.event_name,
        });
      }
    }

    if (rows.length === 0) {
      throw new Error('Ingen gyldige rader funnet. Sjekk at CSV-filen har data med navn, klasse og øvelse.');
    }

    return rows;
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSV(text);
        setParsedRows(rows);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Kunne ikke lese CSV-filen');
        setParsedRows([]);
      }
    };
    reader.readAsText(selectedFile);
  }, [parseCSV]);

  const handleImport = async () => {
    if (parsedRows.length === 0) return;

    setImporting(true);
    const result = await bulkImportRegistrations(competitionId, parsedRows);
    setImportResult(result);
    setImporting(false);
  };

  const downloadTemplate = () => {
    const template = `Navn,Klubb,Fødselsdato,Klasse,Øvelse
Erik Hansen,Lyn SK,15.03.1995,Menn senior,100m
Erik Hansen,Lyn SK,15.03.1995,Menn senior,200m
Anna Johansen,IK Tjalve,22.07.2008,Kvinner 16 år,100m
Anna Johansen,IK Tjalve,22.07.2008,Kvinner 16 år,Lengde
Lars Pedersen,BUL,10.11.2010,Gutter 14 år,60m`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'påmeldinger-mal.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group rows by athlete for preview
  const groupedByAthlete = parsedRows.reduce((acc, row) => {
    const key = `${row.name}_${row.date_of_birth || ''}`;
    if (!acc[key]) {
      acc[key] = {
        name: row.name,
        club_name: row.club_name,
        date_of_birth: row.date_of_birth,
        events: [],
      };
    }
    acc[key].events.push({ age_class: row.age_class, event_name: row.event_name });
    return acc;
  }, {} as Record<string, { name: string; club_name?: string; date_of_birth?: string; events: Array<{ age_class: string; event_name: string }> }>);

  const athletes = Object.values(groupedByAthlete);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/competitions/${competitionId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Tilbake til stevnet
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Importer påmeldinger</h1>
            <p className="text-gray-600">
              Last opp en CSV-fil for å registrere påmeldinger
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Last ned mal
          </button>
        </div>
      </div>

      {/* Import Success */}
      {importResult && importResult.successCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-800">Import fullført</h3>
              <p className="text-green-700 mt-1">
                Importerte {importResult.successCount} øvelsespåmeldinger for {importResult.createdRegistrations} utøvere.
              </p>
              {importResult.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-green-800 mb-2">
                    {importResult.errorCount} rader hadde feil:
                  </p>
                  <ul className="text-sm text-green-700 space-y-1">
                    {importResult.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>Rad {err.row}: {err.message}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>...og {importResult.errors.length - 5} flere</li>
                    )}
                  </ul>
                </div>
              )}
              <div className="mt-4 flex gap-3">
                <Link
                  href={`/dashboard/competitions/${competitionId}/entries`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors"
                >
                  Se deltakere
                </Link>
                <button
                  onClick={() => {
                    setFile(null);
                    setParsedRows([]);
                    setImportResult(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-green-600 text-green-700 font-medium rounded-md hover:bg-green-50 transition-colors"
                >
                  Importer flere
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Upload */}
      {!importResult?.successCount && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Last opp CSV-fil</h2>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              {file ? file.name : 'Dra og slipp en CSV-fil, eller klikk for å bla'}
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-medium rounded-md hover:bg-blue-800 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              Velg fil
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Parse Error */}
          {parseError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Kunne ikke lese CSV</p>
                <p className="text-sm text-red-700">{parseError}</p>
              </div>
            </div>
          )}

          {/* CSV Format Info */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">CSV-format</h3>
            <p className="text-sm text-gray-600 mb-3">
              Påkrevde kolonner: <code className="bg-gray-200 px-1 rounded">Navn</code>,{' '}
              <code className="bg-gray-200 px-1 rounded">Klasse</code>,{' '}
              <code className="bg-gray-200 px-1 rounded">Øvelse</code>
            </p>
            <p className="text-sm text-gray-600 mb-3">
              Valgfrie kolonner: <code className="bg-gray-200 px-1 rounded">Klubb</code>,{' '}
              <code className="bg-gray-200 px-1 rounded">Fødselsdato</code>
            </p>
            <p className="text-sm text-gray-500">
              Én rad per øvelse. Hvis en utøver skal delta i flere øvelser, bruk én rad per øvelse.
            </p>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {athletes.length > 0 && !importResult?.successCount && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">
              Forhåndsvisning ({athletes.length} utøvere, {parsedRows.length} øvelsespåmeldinger)
            </h3>
            <button
              onClick={() => {
                setFile(null);
                setParsedRows([]);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Navn</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Klubb</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Født</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Øvelser</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {athletes.slice(0, 50).map((athlete, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{athlete.name}</td>
                    <td className="px-4 py-2 text-gray-600">{athlete.club_name || '-'}</td>
                    <td className="px-4 py-2 text-gray-600">{athlete.date_of_birth || '-'}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {athlete.events.map((e, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
                          >
                            {e.event_name} ({e.age_class})
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {athletes.length > 50 && (
              <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                Viser de første 50 av {athletes.length} utøvere
              </div>
            )}
          </div>

          {/* Loading State */}
          {importing && (
            <div className="px-6 py-8 bg-blue-50 border-t border-blue-200">
              <div className="flex flex-col items-center text-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <h4 className="text-lg font-semibold text-blue-900 mb-2">
                  Importerer {athletes.length} utøvere...
                </h4>
                <p className="text-blue-700 mb-3">
                  Dette kan ta litt tid. Vennligst ikke lukk denne siden.
                </p>
                <p className="text-sm text-blue-600">
                  Estimert tid: ca. {Math.ceil(athletes.length / 60)} {Math.ceil(athletes.length / 60) === 1 ? 'minutt' : 'minutter'}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!importing && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setFile(null);
                  setParsedRows([]);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleImport}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-medium rounded-md hover:bg-blue-800 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Importer {athletes.length} utøvere
              </button>
            </div>
          )}
        </div>
      )}

      {/* Import Errors */}
      {importResult && importResult.successCount === 0 && importResult.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800">Import feilet</h3>
              <p className="text-red-700 mt-1">
                {importResult.errorCount} feil oppstod. Ingen påmeldinger ble importert.
              </p>
              <ul className="mt-4 text-sm text-red-700 space-y-1">
                {importResult.errors.map((err, idx) => (
                  <li key={idx}>Rad {err.row}: {err.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
