'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileJson } from 'lucide-react';

interface ExportResultsButtonProps {
  eventId: string;
  eventName: string;
}

export default function ExportResultsButton({ eventId, eventName }: ExportResultsButtonProps) {
  const [showMenu, setShowMenu] = useState(false);

  function handleExport(format: 'csv' | 'json') {
    const url = `/api/export/results/${eventId}?format=${format}`;

    // For CSV, trigger download
    if (format === 'csv') {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${eventName.replace(/[^a-z0-9]/gi, '_')}_results.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // For JSON, open in new tab
      window.open(url, '_blank');
    }

    setShowMenu(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-50 transition-colors"
      >
        <Download className="w-4 h-4" />
        Export
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            <button
              onClick={() => handleExport('csv')}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Download CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <FileJson className="w-4 h-4" />
              View JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}
