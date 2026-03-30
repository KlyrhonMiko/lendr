'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import {
  X,
  Printer,
  Download,
  Eraser,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { borrowApi, type ReleaseReceipt } from '../api';
import { parseSystemDate } from '@/lib/utils';

function fmtDate(dateStr?: string) {
  if (!dateStr) return '';
  try {
    const d = parseSystemDate(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(d);
  } catch { return dateStr; }
}

function fmtShort(dateStr?: string) {
  if (!dateStr) return '';
  try {
    const d = parseSystemDate(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
  } catch { return dateStr; }
}

function buildReceiptHtml(receipt: ReleaseReceipt, signatureDataUrl: string | null): string {
  const total = receipt.items.reduce((s, i) => s + i.qty_released, 0);
  const today = fmtShort(new Date().toISOString());

  const s = {
    wrap:  'font-family: "Courier New", Courier, monospace; color: #000; width: 100%; max-width: 72mm; margin: 0 auto; font-size: 11px; line-height: 1.45;',
    center: 'text-align: center;',
    bold:   'font-weight: 700;',
    hr:     'border: none; border-top: 1px dashed #000; margin: 6px 0;',
    hrSolid:'border: none; border-top: 2px solid #000; margin: 6px 0;',
    row:    'display: flex; justify-content: space-between; padding: 1px 0;',
    label:  'color: #555; font-size: 10px;',
    val:    'font-weight: 600; text-align: right; font-size: 11px;',
    th:     'padding: 3px 0; font-size: 10px; font-weight: 700; border-bottom: 1px solid #000;',
    td:     'padding: 3px 0; font-size: 11px; border-bottom: 1px dotted #999;',
  };

  const row = (label: string, value: string, extraStyle = '') =>
    `<div style="${s.row}"><span style="${s.label}">${label}</span><span style="${s.val}${extraStyle}">${value}</span></div>`;

  const items = receipt.items.map((item, i) => `
    <tr>
      <td style="${s.td} width: 18px; text-align: center; color: #555;">${i + 1}</td>
      <td style="${s.td} padding-left: 4px;">
        <div style="${s.bold}">${item.name}</div>
        ${item.serial_numbers.length > 0 ? `<div style="font-size: 9px; color: #555;">S/N: ${item.serial_numbers.join(', ')}</div>` : ''}
      </td>
      <td style="${s.td} text-align: right; ${s.bold} width: 30px;">${item.qty_released}</td>
    </tr>`).join('');

  return `<div style="${s.wrap}">

    <!-- Header -->
    <div style="${s.center} padding-bottom: 4px;">
      <div style="font-size: 15px; ${s.bold} letter-spacing: 2px;">RELEASE RECEIPT</div>
      <hr style="${s.hrSolid}">
      <div style="font-size: 10px; color: #555; margin-top: 2px;">Equipment Release Acknowledgment</div>
      <div style="font-size: 12px; ${s.bold} margin-top: 2px;">${receipt.receipt_number}</div>
    </div>

    <hr style="${s.hr}">

    ${receipt.is_emergency ? `<div style="${s.center} ${s.bold} font-size: 11px; border: 1px solid #000; padding: 3px 0; margin-bottom: 4px; letter-spacing: 1px;">** EMERGENCY RELEASE **</div>` : ''}

    <!-- Transaction -->
    ${row('TXN Ref', receipt.transaction_ref)}
    ${row('Request', receipt.request_id)}
    ${row('Released', fmtDate(receipt.released_at) || '—')}
    ${row('By', receipt.released_by_name || '—')}
    ${receipt.expected_return_at ? row('Due', fmtShort(receipt.expected_return_at), ' font-weight:800;') : ''}

    <hr style="${s.hr}">

    <!-- Borrower -->
    ${row('Borrower', receipt.borrower_name || '—')}
    ${receipt.borrower_user_id ? row('ID', receipt.borrower_user_id) : ''}
    ${receipt.customer_name ? row('Client', receipt.customer_name) : ''}
    ${receipt.location_name ? row('Location', receipt.location_name) : ''}

    <hr style="${s.hr}">

    <!-- Items -->
    <div style="${s.bold} font-size: 10px; letter-spacing: 1px; margin-bottom: 2px;">ITEMS</div>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="${s.th} text-align: center; width: 18px;">#</th>
          <th style="${s.th} text-align: left; padding-left: 4px;">Description</th>
          <th style="${s.th} text-align: right; width: 30px;">Qty</th>
        </tr>
      </thead>
      <tbody>${items}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding: 4px 0; ${s.bold} text-align: right; font-size: 11px; border-top: 1px solid #000;">TOTAL</td>
          <td style="padding: 4px 0; ${s.bold} text-align: right; font-size: 13px; border-top: 1px solid #000;">${total}</td>
        </tr>
      </tfoot>
    </table>

    ${receipt.notes ? `
    <hr style="${s.hr}">
    <div style="font-size: 10px; ${s.bold} color: #555; margin-bottom: 1px;">NOTES</div>
    <div style="font-size: 10px; line-height: 1.4;">${receipt.notes}</div>` : ''}

    <hr style="${s.hrSolid}">

    <!-- Acknowledgment -->
    <div style="font-size: 9px; line-height: 1.4; color: #333; margin-bottom: 8px;">
      I acknowledge receipt of the above items in
      good condition and accept responsibility for
      their return by the stated due date.
    </div>

    <!-- Signature -->
    <div style="margin-bottom: 6px;">
      <div style="font-size: 9px; color: #555; margin-bottom: 4px;">Released by:</div>
      ${signatureDataUrl
        ? `<div style="border: 1px solid #999; height: 50px; display: flex; align-items: center; justify-content: center;">
             <img src="${signatureDataUrl}" style="max-width: 100%; max-height: 44px; object-fit: contain;" />
           </div>`
        : `<div style="border-bottom: 1px solid #000; height: 50px;"></div>`
      }
      <div style="font-size: 9px; color: #555; margin-top: 2px;">${receipt.released_by_name || ''}</div>
    </div>

    <hr style="${s.hr}">

    <!-- Footer -->
    <div style="${s.center} font-size: 8px; color: #777; line-height: 1.4;">
      ${receipt.receipt_number} &middot; ${today}<br>
      System-generated document
    </div>
  </div>`;
}

function ReceiptPreview({
  receipt, signatureDataUrl,
}: {
  receipt: ReleaseReceipt;
  signatureDataUrl: string | null;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg mx-auto my-4 shadow-sm" style={{ maxWidth: '340px' }}>
      <div className="p-5" dangerouslySetInnerHTML={{ __html: buildReceiptHtml(receipt, signatureDataUrl) }} />
    </div>
  );
}

const PRINT_STYLES = `
  @page { size: 80mm auto; margin: 3mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    margin: 0; padding: 2mm;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  img { max-width: 100%; }
  table { border-collapse: collapse; }
`;

const PDF_STYLES = `
  @page { size: A4; margin: 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    margin: 0; padding: 30px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    display: flex; justify-content: center;
  }
  img { max-width: 100%; }
  table { border-collapse: collapse; }
`;

export function ReleaseReceiptModal({
  requestId,
  onClose,
}: {
  requestId: string;
  onClose: () => void;
}) {
  const [receipt, setReceipt] = useState<ReleaseReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const sigCanvas = useRef<SignatureCanvas | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await borrowApi.getReleaseReceipt(requestId);
        setReceipt(res.data as ReleaseReceipt);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load receipt');
      } finally {
        setLoading(false);
      }
    })();
  }, [requestId]);

  const clearSignature = useCallback(() => {
    sigCanvas.current?.clear();
    setSignatureDataUrl(null);
    setSigned(false);
  }, []);

  const confirmSignature = useCallback(() => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) return;
    const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
    setSignatureDataUrl(dataUrl);
    setSigned(true);
  }, []);

  const openPrintWindow = useCallback(
    (styles: string, autoClose: boolean) => {
      if (!receipt) return;
      const html = buildReceiptHtml(receipt, signatureDataUrl);
      const w = window.open('', '_blank', 'width=500,height=800');
      if (!w) return;
      w.document.write(`<!DOCTYPE html><html><head>
        <title>${receipt.receipt_number}</title>
        <style>${styles}</style>
      </head><body>${html}</body></html>`);
      w.document.close();
      w.focus();
      setTimeout(() => {
        w.print();
        if (autoClose) w.close();
      }, 400);
    },
    [receipt, signatureDataUrl],
  );

  const handlePrint = useCallback(() => openPrintWindow(PRINT_STYLES, true), [openPrintWindow]);
  const handleSavePdf = useCallback(() => openPrintWindow(PDF_STYLES, false), [openPrintWindow]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg max-h-[calc(100vh-2rem)] bg-card border border-border rounded-2xl shadow-2xl relative z-10 animate-in zoom-in-95 fade-in duration-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold font-heading">Release Receipt</h2>
              <p className="text-xs text-muted-foreground">{receipt ? receipt.receipt_number : 'Loading...'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted/50 flex items-center justify-center transition-colors" type="button">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-muted/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating receipt...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
              <p className="text-sm text-rose-600">{error}</p>
            </div>
          ) : receipt ? (
            <ReceiptPreview receipt={receipt} signatureDataUrl={signatureDataUrl} />
          ) : null}
        </div>

        {/* Signature Pad */}
        {receipt && !loading && !error && (
          <div className="border-t border-border p-5 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                {signed
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  : <FileText className="w-4 h-4 text-muted-foreground" />}
                Digital Signature
              </h3>
              {signed && (
                <button onClick={clearSignature} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors" type="button">
                  <Eraser className="w-3 h-3" /> Re-sign
                </button>
              )}
            </div>

            {!signed ? (
              <>
                <div className="border-2 border-dashed border-border rounded-xl overflow-hidden bg-white relative">
                  <SignatureCanvas
                    ref={sigCanvas}
                    canvasProps={{ className: 'w-full h-[120px]', style: { width: '100%', height: '120px' } }}
                    penColor="black" minWidth={1} maxWidth={2.5}
                  />
                  <div className="absolute bottom-2 left-0 right-0 pointer-events-none">
                    <div className="mx-6 border-t border-gray-300" />
                    <p className="text-center text-[10px] text-gray-400 mt-1">Sign above this line</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={clearSignature} className="flex-1 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-all text-muted-foreground flex items-center justify-center gap-1.5" type="button">
                    <Eraser className="w-3.5 h-3.5" /> Clear
                  </button>
                  <button onClick={confirmSignature} className="flex-1 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-1.5" type="button">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Signature
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <p className="text-xs text-emerald-700 font-medium">Signature captured successfully</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {receipt && !loading && !error && (
          <div className="border-t border-border p-5 flex gap-2.5 shrink-0">
            <button onClick={handlePrint} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-all flex items-center justify-center gap-2" type="button">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={handleSavePdf} className="flex-1 h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-2" type="button">
              <Download className="w-4 h-4" /> Save as PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
