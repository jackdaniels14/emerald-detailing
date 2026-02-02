'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  LeadType,
  LEAD_TYPE_CONFIG,
  calculateTier,
} from '@/lib/sales-types';

interface ParsedRow {
  companyName: string;
  contactName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  leadType: LeadType;
  vehicleCount?: number;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  isValid: boolean;
  errors: string[];
}

const COLUMN_OPTIONS = [
  { value: 'companyName', label: 'Company Name' },
  { value: 'contactName', label: 'Contact Name / Full Name' },
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'leadType', label: 'Lead Type' },
  { value: 'vehicleCount', label: 'Vehicle Count' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'zipCode', label: 'Zip Code' },
  { value: 'notes', label: 'Notes' },
  { value: 'skip', label: '-- Skip Column --' },
];

export default function ImportLeadsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'importing' | 'done'>('upload');
  const [rawData, setRawData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [defaultLeadType, setDefaultLeadType] = useState<LeadType>('turo_host');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim());

      if (lines.length < 2) {
        setError('CSV must have at least a header row and one data row');
        return;
      }

      // Parse CSV (handling quoted fields)
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const parsedLines = lines.map(parseCSVLine);
      const headerRow = parsedLines[0];
      const dataRows = parsedLines.slice(1);

      setHeaders(headerRow);
      setRawData(dataRows);

      // Auto-map columns based on header names
      const autoMapping: Record<number, string> = {};
      headerRow.forEach((header, index) => {
        const h = header.toLowerCase().replace(/[^a-z]/g, '');
        if (h.includes('company') || h.includes('business')) autoMapping[index] = 'companyName';
        else if (h === 'firstname' || h === 'first') autoMapping[index] = 'firstName';
        else if (h === 'lastname' || h === 'last') autoMapping[index] = 'lastName';
        else if (h.includes('fullname') || h.includes('contactname') || h === 'name') autoMapping[index] = 'contactName';
        else if (h.includes('email') || h.includes('mail')) autoMapping[index] = 'email';
        else if (h.includes('phone') || h.includes('tel') || h.includes('mobile') || h.includes('cell')) autoMapping[index] = 'phone';
        else if (h.includes('type') || h.includes('category')) autoMapping[index] = 'leadType';
        else if (h.includes('vehicle') || h.includes('fleet') || h.includes('car')) autoMapping[index] = 'vehicleCount';
        else if (h.includes('address') || h.includes('street')) autoMapping[index] = 'address';
        else if (h.includes('city')) autoMapping[index] = 'city';
        else if (h.includes('state') || h === 'st') autoMapping[index] = 'state';
        else if (h.includes('zip') || h.includes('postal')) autoMapping[index] = 'zipCode';
        else if (h.includes('note') || h.includes('comment')) autoMapping[index] = 'notes';
        else autoMapping[index] = 'skip';
      });

      setColumnMapping(autoMapping);
      setStep('map');
    };

    reader.readAsText(file);
  };

  const handleMappingChange = (columnIndex: number, fieldName: string) => {
    setColumnMapping({ ...columnMapping, [columnIndex]: fieldName });
  };

  const parseLeadType = (value: string): LeadType => {
    const v = value.toLowerCase();
    if (v.includes('dealer')) return 'dealership';
    if (v.includes('fleet') || v.includes('rental')) return 'fleet';
    if (v.includes('turo')) return 'turo_host';
    if (v.includes('affiliate') || v.includes('partner')) return 'affiliate';
    if (v.includes('sales') || v.includes('rep')) return 'sales_rep';
    return defaultLeadType;
  };

  const processRows = () => {
    const parsed: ParsedRow[] = rawData.map(row => {
      const record: Partial<ParsedRow> = {
        errors: [],
        isValid: true,
      };

      // Map each column
      Object.entries(columnMapping).forEach(([colIndex, fieldName]) => {
        if (fieldName === 'skip') return;
        const value = row[parseInt(colIndex)] || '';

        switch (fieldName) {
          case 'companyName':
            record.companyName = value;
            break;
          case 'contactName':
            record.contactName = value;
            break;
          case 'firstName':
            record.firstName = value;
            break;
          case 'lastName':
            record.lastName = value;
            break;
          case 'email':
            record.email = value.toLowerCase();
            break;
          case 'phone':
            record.phone = value.replace(/[^\d+()-\s]/g, '');
            break;
          case 'leadType':
            record.leadType = parseLeadType(value);
            break;
          case 'vehicleCount':
            record.vehicleCount = parseInt(value) || 0;
            break;
          case 'address':
            record.address = value;
            break;
          case 'city':
            record.city = value;
            break;
          case 'state':
            record.state = value;
            break;
          case 'zipCode':
            record.zipCode = value;
            break;
          case 'notes':
            record.notes = value;
            break;
        }
      });

      // Combine first + last name into contact name if not already set
      if (!record.contactName && (record.firstName || record.lastName)) {
        record.contactName = [record.firstName, record.lastName].filter(Boolean).join(' ');
      }

      // Apply defaults
      if (!record.leadType) record.leadType = defaultLeadType;

      // Validate - only require company OR contact name, and email OR phone
      const hasName = record.companyName || record.contactName;
      const hasContact = record.email || record.phone;

      if (!hasName) {
        record.errors!.push('Need company or contact name');
        record.isValid = false;
      }
      if (!hasContact) {
        record.errors!.push('Need email or phone');
        record.isValid = false;
      }

      // Auto-fill missing names
      if (!record.companyName && record.contactName) {
        record.companyName = record.contactName;
      }
      if (!record.contactName && record.companyName) {
        record.contactName = 'Unknown';
      }

      return record as ParsedRow;
    });

    setParsedRows(parsed);
    setStep('preview');
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setError('No valid rows to import');
      return;
    }

    setImporting(true);
    setStep('importing');
    setImportProgress(0);
    setImportedCount(0);

    try {
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];

        await addDoc(collection(db, 'salesLeads'), {
          companyName: row.companyName,
          contactName: row.contactName,
          email: row.email || '',
          phone: row.phone || '',
          leadType: row.leadType,
          tier: calculateTier(row.leadType, row.vehicleCount),
          stage: 'new',
          vehicleCount: row.vehicleCount || 0,
          address: row.address || '',
          city: row.city || '',
          state: row.state || '',
          zipCode: row.zipCode || '',
          notes: row.notes || '',
          source: 'csv_import',
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        setImportedCount(i + 1);
        setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
      }

      setStep('done');
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Failed to import leads');
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/sales/leads" className="text-gray-500 hover:text-gray-700 text-sm flex items-center mb-2">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Leads
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Import Leads from CSV</h1>
        <p className="text-gray-500 mt-1">Upload a CSV file to bulk import cold call contacts</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-4">
        {['Upload', 'Map Columns', 'Preview', 'Import'].map((label, idx) => {
          const stepNames = ['upload', 'map', 'preview', 'importing'];
          const currentIdx = stepNames.indexOf(step === 'done' ? 'importing' : step);
          const isCompleted = idx < currentIdx || step === 'done';
          const isActive = idx === currentIdx;

          return (
            <div key={label} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
                isCompleted ? 'bg-emerald-500 text-white' :
                isActive ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500' :
                'bg-gray-100 text-gray-500'
              }`}>
                {isCompleted ? '✓' : idx + 1}
              </div>
              <span className={`ml-2 text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                {label}
              </span>
              {idx < 3 && <div className="w-12 h-0.5 mx-4 bg-gray-200" />}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload CSV File</h2>
            <p className="text-gray-500 mb-6">
              Your CSV needs at least a name (company or contact) and contact info (email or phone)
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Choose CSV File
            </button>

            <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left">
              <h3 className="font-medium text-gray-900 mb-2">Expected columns:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Company Name or Contact Name (at least one required)</li>
                <li>Email or Phone (at least one required)</li>
                <li>Lead Type (optional - Dealership, Fleet, Turo Host, etc.)</li>
                <li>Vehicle Count (optional)</li>
                <li>Address, City, State (optional)</li>
                <li>Notes (optional)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Map Columns */}
      {step === 'map' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Map Your Columns</h2>
          <p className="text-gray-500 mb-6">Match your CSV columns to lead fields. We've auto-detected some matches.</p>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Lead Type (for unmapped rows)</label>
            <select
              value={defaultLeadType}
              onChange={(e) => setDefaultLeadType(e.target.value as LeadType)}
              className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              {Object.entries(LEAD_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">CSV Column</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Maps To</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sample Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {headers.map((header, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 font-medium text-gray-900">{header}</td>
                    <td className="px-4 py-3">
                      <select
                        value={columnMapping[idx] || 'skip'}
                        onChange={(e) => handleMappingChange(idx, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      >
                        {COLUMN_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm truncate max-w-xs">
                      {rawData[0]?.[idx] || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Back
            </button>
            <button
              onClick={processRows}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium"
            >
              Continue to Preview
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview Import</h2>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{parsedRows.filter(r => r.isValid).length}</p>
              <p className="text-sm text-green-600">Valid rows ready to import</p>
            </div>
            <div className="flex-1 p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-700">{parsedRows.filter(r => !r.isValid).length}</p>
              <p className="text-sm text-red-600">Invalid rows (will be skipped)</p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parsedRows.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className={row.isValid ? '' : 'bg-red-50'}>
                    <td className="px-3 py-2">
                      {row.isValid ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <div>
                          <span className="text-red-600">✗</span>
                          <p className="text-xs text-red-500">{row.errors.join(', ')}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-900">{row.companyName || '-'}</td>
                    <td className="px-3 py-2 text-gray-900">{row.contactName || '-'}</td>
                    <td className="px-3 py-2 text-gray-500">{row.email || '-'}</td>
                    <td className="px-3 py-2 text-gray-500">{row.phone || '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${LEAD_TYPE_CONFIG[row.leadType]?.bgColor} ${LEAD_TYPE_CONFIG[row.leadType]?.color}`}>
                        {LEAD_TYPE_CONFIG[row.leadType]?.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > 50 && (
              <p className="text-center text-gray-500 py-2">Showing first 50 of {parsedRows.length} rows</p>
            )}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep('map')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={parsedRows.filter(r => r.isValid).length === 0}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium disabled:opacity-50"
            >
              Import {parsedRows.filter(r => r.isValid).length} Leads
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Importing */}
      {step === 'importing' && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Importing Leads...</h2>
          <p className="text-gray-500 mb-4">{importedCount} of {parsedRows.filter(r => r.isValid).length} leads imported</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Import Complete!</h2>
          <p className="text-gray-500 mb-6">Successfully imported {importedCount} leads</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setStep('upload');
                setRawData([]);
                setHeaders([]);
                setParsedRows([]);
                setImportedCount(0);
              }}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Import More
            </button>
            <Link
              href="/admin/sales/leads"
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium"
            >
              View Leads
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
