'use client';

import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QrCodeModalProps {
    value: string;
    title?: string;
    subtitle?: string;
    onClose: () => void;
}

export function QrCodeModal({ value, title = 'QR Code', subtitle, onClose }: QrCodeModalProps) {
    const qrRef = useRef<SVGSVGElement>(null);

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=600,height=600');
        if (!printWindow) return;

        const svgData = new XMLSerializer().serializeToString(qrRef.current!);

        printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: system-ui, sans-serif; }
            h2 { margin-bottom: 0.5rem; }
            p { margin-top: 0; color: #666; }
            svg { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <h2>${title}</h2>
          ${subtitle ? `<p>${subtitle}</p>` : ''}
          ${svgData}
        </body>
      </html>
    `);

        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        };
    };

    const handleDownload = () => {
        try {
            const svg = qrRef.current;
            if (!svg) return;
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx?.fillStyle && (ctx.fillStyle = "white") && ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx?.drawImage(img, 0, 0);
                const pngFile = canvas.toDataURL("image/png");
                const downloadLink = document.createElement("a");
                downloadLink.download = `${title.replace(/\s+/g, '_')}_QR.png`;
                downloadLink.href = `${pngFile}`;
                downloadLink.click();
            };
            img.src = "data:image/svg+xml;base64," + btoa(svgData);
            toast.success('Successfully downloaded QR code');
        } catch (e) {
            toast.error('Failed to download QR code');
        }
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => {
                e.stopPropagation();
                onClose();
            }}
        >
            <div
                className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div>
                        <h2 className="text-lg font-bold font-heading">{title}</h2>
                        {subtitle && <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 flex flex-col items-center justify-center bg-muted/10">
                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-border/50">
                        <QRCodeSVG
                            ref={qrRef}
                            value={value}
                            size={200}
                            level={"M"}
                            includeMargin={false}
                        />
                    </div>
                </div>

                <div className="px-5 py-4 border-t border-border flex gap-3 bg-muted/20">
                    <button
                        onClick={handleDownload}
                        className="flex-1 h-10 px-3 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-muted text-foreground hover:bg-muted/80 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Download
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 h-10 px-3 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-[0.98]"
                    >
                        <Printer className="w-4 h-4" />
                        Print
                    </button>
                </div>
            </div>
        </div>
    );
}
