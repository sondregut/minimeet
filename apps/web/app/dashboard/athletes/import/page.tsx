'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
} from 'lucide-react';
import {
  parseCSV,
  parseExcel,
  getFileType,
  generateTemplate,
  type ImportParseResult,
  type ParsedAthlete,
} from '@/lib/utils/athlete-import';
import { bulkCreateAthletes, type BulkImportResult } from '@/lib/actions/athletes';

type ImportStep = 'upload' | 'preview' | 'importing' | 'result';

export default function ImportAthletesPage() {
  const router = useRouter();
  const [step, setStep] = useState<ImportStep>('upload');
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    const fileType = getFileType(file.name);

    if (fileType === 'unknown') {
      setParseResult({
        athletes: [],
        errors: [{ row: 0, field: 'file', message: 'Unsupported file type. Please use CSV or Excel (.xlsx, .xls)' }],
        totalRows: 0,
        validRows: 0,
      });
      setStep('preview');
      return;
    }

    let result: ImportParseResult;

    if (fileType === 'csv') {
      const text = await file.text();
      result = await parseCSV(text);
    } else {
      const buffer = await file.arrayBuffer();
      result = parseExcel(buffer);
    }

    setParseResult(result);
    setStep('preview');
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDownloadTemplate = useCallback(() => {
    const template = generateTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'athlete_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(async () => {
    if (!parseResult || parseResult.athletes.length === 0) {
      return;
    }

    setStep('importing');

    // Convert ParsedAthlete[] to CreateAthleteInput[]
    const athletesToImport = parseResult.athletes.map(({ rowNumber, ...athlete }) => athlete);

    const result = await bulkCreateAthletes(athletesToImport);
    setImportResult(result);
    setStep('result');
  }, [parseResult]);

  const handleReset = useCallback(() => {
    setStep('upload');
    setParseResult(null);
    setImportResult(null);
    setFileName(null);
  }, []);

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/athletes"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Athletes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Import Athletes</h1>
        <p className="text-gray-600 mt-1">
          Upload a CSV or Excel file to import multiple athletes at once
        </p>
      </div>

      {/* Upload Step */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative border-2 border-dashed rounded-lg p-12 text-center transition-colors
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            `}
          >
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop your file here, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports CSV, Excel (.xlsx, .xls)
            </p>
          </div>

          {/* Template download */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <FileSpreadsheet className="w-8 h-8 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">Need a template?</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Download our CSV template with the correct column headers
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-medium text-gray-900 mb-3">File Format</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Required columns:</strong> first_name, last_name, gender</p>
              <p><strong>Optional columns:</strong> date_of_birth, nationality, club_name, license_number</p>
              <p><strong>Gender values:</strong> M, W, X (or Male, Female, Other)</p>
              <p><strong>Date format:</strong> YYYY-MM-DD (e.g., 2000-01-15) or DD.MM.YYYY</p>
              <p><strong>Nationality:</strong> 3-letter country code (e.g., NOR, SWE, USA)</p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && parseResult && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-gray-900">
                  {fileName}
                </h3>
                <p className="text-sm text-gray-500">
                  {parseResult.validRows} of {parseResult.totalRows} rows ready to import
                </p>
              </div>
              <button
                onClick={handleReset}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Validation errors */}
            {parseResult.errors.length > 0 && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">
                      {parseResult.errors.length} validation {parseResult.errors.length === 1 ? 'error' : 'errors'}
                    </p>
                    <ul className="mt-2 text-sm text-amber-700 space-y-1">
                      {parseResult.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>
                          Row {error.row}: {error.message}
                        </li>
                      ))}
                      {parseResult.errors.length > 5 && (
                        <li>... and {parseResult.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Preview table */}
            {parseResult.athletes.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-500">Row</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">Name</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">Gender</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">DOB</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">Club</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">Nationality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.athletes.slice(0, 10).map((athlete) => (
                      <tr key={athlete.rowNumber} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-gray-500">{athlete.rowNumber}</td>
                        <td className="py-2 px-3 font-medium text-gray-900">
                          {athlete.first_name} {athlete.last_name}
                        </td>
                        <td className="py-2 px-3 text-gray-600">{athlete.gender}</td>
                        <td className="py-2 px-3 text-gray-600">{athlete.date_of_birth || '-'}</td>
                        <td className="py-2 px-3 text-gray-600">{athlete.club_name || '-'}</td>
                        <td className="py-2 px-3 text-gray-600">{athlete.nationality}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parseResult.athletes.length > 10 && (
                  <p className="text-sm text-gray-500 mt-2 px-3">
                    Showing first 10 of {parseResult.athletes.length} athletes
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <button
              onClick={handleReset}
              className="px-5 py-3 text-gray-700 font-medium hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={parseResult.athletes.length === 0}
              className="px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import {parseResult.athletes.length} Athletes
            </button>
          </div>
        </div>
      )}

      {/* Importing Step */}
      {step === 'importing' && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            Importing athletes...
          </p>
          <p className="text-sm text-gray-500">
            This may take a moment
          </p>
        </div>
      )}

      {/* Result Step */}
      {step === 'result' && importResult && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {importResult.success ? (
              <div className="text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Import Complete
                </h3>
                <p className="text-gray-600">
                  Successfully imported {importResult.successCount} of {importResult.totalCount} athletes
                </p>
              </div>
            ) : (
              <div className="text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Import Failed
                </h3>
                <p className="text-gray-600 mb-4">
                  Could not import athletes
                </p>
                {importResult.errors.length > 0 && (
                  <div className="text-left bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                    <ul className="text-sm text-red-700 space-y-1">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>
                          {error.row > 0 ? `Row ${error.row}: ` : ''}{error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <button
              onClick={handleReset}
              className="px-5 py-3 text-gray-700 font-medium hover:text-gray-900 transition-colors"
            >
              Import More
            </button>
            <Link
              href="/dashboard/athletes"
              className="px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors"
            >
              View Athletes
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
