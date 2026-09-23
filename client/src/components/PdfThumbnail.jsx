import { useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
export default function PdfThumbnail({ src }) { const canvas = useRef();
  useEffect(() => { if (!src) return; let live = true; (async () => { try { const pdfjs = await import('pdfjs-dist'); pdfjs.GlobalWorkerOptions.workerSrc = workerUrl; const doc = await pdfjs.getDocument(src).promise; const page = await doc.getPage(1); const viewport = page.getViewport({ scale: .42 }); const ctx = canvas.current?.getContext('2d'); if (live && ctx) { canvas.current.width = viewport.width; canvas.current.height = viewport.height; await page.render({ canvasContext: ctx, viewport }).promise; } } catch {} })(); return () => { live = false; }; }, [src]);
  return <div className="flex h-40 items-center justify-center overflow-hidden bg-slate-100">{src ? <canvas ref={canvas} className="max-h-full max-w-full shadow" /> : <FileText className="h-12 w-12 text-slate-300" />}</div>;
}
