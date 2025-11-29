'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Download,
  X,
} from 'lucide-react';
import { bulkImportEntries, type BulkEntryImportRow } from '@/lib/actions/entries';

export default function ImportEntriesPage() {
  const params = useParams();
  const router = useRouter();
  const competitionId = params.id as string;

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<BulkEntryImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    successCount: number;
    errorCount: number;
    errors: Array<{ row: number; message: string }>;
    createdAthletes: number;
  } | null>(null);

  const parseCSV = useCallback((text: string): BulkEntryImportRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

    // Map common header variations
    const headerMap: Record<string, string> = {
      'bib': 'bib_number',
      'bib_number': 'bib_number',
      'bibnumber': 'bib_number',
      'first_name': 'first_name',
      'firstname': 'first_name',
      'first': 'first_name',
      'last_name': 'last_name',
      'lastname': 'last_name',
      'last': 'last_name',
      'club': 'club_name',
      'club_name': 'club_name',
      'clubname': 'club_name',
      'event': 'event_code',
      'event_code': 'event_code',
      'eventcode': 'event_code',
      'seed': 'seed_mark',
      'seed_mark': 'seed_mark',
      'seedmark': 'seed_mark',
      'pb': 'seed_mark',
    };

    const columnMap = header.map(h => headerMap[h] || h);

    // Check required columns
    if (!columnMap.includes('first_name')) {
      throw new Error('Missing required column: first_name (or firstname, first)');
    }
    if (!columnMap.includes('last_name')) {
      throw new Error('Missing required column: last_name (or lastname, last)');
    }
    if (!columnMap.includes('event_code')) {
      throw new Error('Missing required column: event_code (or event, eventcode)');
    }

    // Parse data rows
    const rows: BulkEntryImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quoted values with commas
      const values: string[] = [];
      let inQuote = false;
      let current = '';
      for (const char of line) {
        if (char === '"') {
          inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const row: Record<string, string> = {};
      columnMap.forEach((col, idx) => {
        if (values[idx] !== undefined) {
          row[col] = values[idx].replace(/^["']|["']$/g, '');
        }
      });

      if (row.first_name && row.last_name && row.event_code) {
        rows.push({
          bib_number: row.bib_number || undefined,
          first_name: row.first_name,
          last_name: row.last_name,
          club_name: row.club_name || undefined,
          event_code: row.event_code,
          seed_mark: row.seed_mark || undefined,
        });
      }
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
        setParseError(err instanceof Error ? err.message : 'Failed to parse CSV');
        setParsedRows([]);
      }
    };
    reader.readAsText(selectedFile);
  }, [parseCSV]);

  const handleImport = async () => {
    if (parsedRows.length === 0) return;

    setImporting(true);
    const result = await bulkImportEntries(competitionId, parsedRows);
    setImportResult(result);
    setImporting(false);
  };

  const downloadTemplate = () => {
    const template = `bib_number,first_name,last_name,club_name,event_code,seed_mark
101,Erik,Hansen,Lyn SK,100m,11.23
102,Anna,Johansen,IK Tjalve,100m,12.45
102,Anna,Johansen,IK Tjalve,200m,25.10
103,Lars,Pedersen,BUL,LJ,6.85`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'entries-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/competitions/${competitionId}/entries`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Entries
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Import Entries</h1>
            <p className="text-gray-600">
              Upload a CSV file to bulk import entries
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
        </div>
      </div>

      {/* Import Success */}
      {importResult && importResult.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-800">Import Complete</h3>
              <p className="text-green-700 mt-1">
                Successfully imported {importResult.successCount} of {parsedRows.length} entries.
                {importResult.createdAthletes > 0 && (
                  <> Created {importResult.createdAthletes} new athletes.</>
                )}
              </p>
              {importResult.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-green-800 mb-2">
                    {importResult.errorCount} entries had errors:
                  </p>
                  <ul className="text-sm text-green-700 space-y-1">
                    {importResult.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>Row {err.row}: {err.message}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>...and {importResult.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
              <div className="mt-4">
                <Link
                  href={`/dashboard/competitions/${competitionId}/entries`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors"
                >
                  View Entries
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Upload */}
      {!importResult?.success && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload CSV File</h2>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              {file ? file.name : 'Drag and drop a CSV file, or click to browse'}
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ position: 'relative' }}
            />
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-medium rounded-md hover:bg-blue-800 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              Choose File
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
                <p className="font-medium text-red-800">Failed to parse CSV</p>
                <p className="text-sm text-red-700">{parseError}</p>
              </div>
            </div>
          )}

          {/* CSV Format Info */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">CSV Format</h3>
            <p className="text-sm text-gray-600 mb-3">
              Required columns: <code className="bg-gray-200 px-1 rounded">first_name</code>,{' '}
              <code className="bg-gray-200 px-1 rounded">last_name</code>,{' '}
              <code className="bg-gray-200 px-1 rounded">event_code</code>
            </p>
            <p className="text-sm text-gray-600">
              Optional columns: <code className="bg-gray-200 px-1 rounded">bib_number</code>,{' '}
              <code className="bg-gray-200 px-1 rounded">club_name</code>,{' '}
              <code className="bg-gray-200 px-1 rounded">seed_mark</code>
            </p>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {parsedRows.length > 0 && !importResult?.success && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">
              Preview ({parsedRows.length} entries)
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
                  <th className="text-left px-4 py-2 font-medium text-gray-600">BIB</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Club</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Event</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Seed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parsedRows.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono">{row.bib_number || '-'}</td>
                    <td className="px-4 py-2">
                      {row.first_name} {row.last_name}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{row.club_name || '-'}</td>
                    <td className="px-4 py-2 font-mono">{row.event_code}</td>
                    <td className="px-4 py-2 font-mono text-gray-600">{row.seed_mark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > 50 && (
              <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                Showing first 50 of {parsedRows.length} entries
              </div>
            )}
          </div>

          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setFile(null);
                setParsedRows([]);
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-medium rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Importing...' : `Import ${parsedRows.length} Entries`}
            </button>
          </div>
        </div>
      )}

      {/* Import Errors */}
      {importResult && !importResult.success && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800">Import Failed</h3>
              <p className="text-red-700 mt-1">
                {importResult.errorCount} errors occurred. No entries were imported.
              </p>
              <ul className="mt-4 text-sm text-red-700 space-y-1">
                {importResult.errors.map((err, idx) => (
                  <li key={idx}>Row {err.row}: {err.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
