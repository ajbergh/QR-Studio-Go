import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { QRSettings } from '../types';
import { Download, Copy, Check, Printer, Share2, Bookmark, BookmarkCheck, Link2, ZoomIn, ZoomOut, Layers } from 'lucide-react';
import { isDesktopMode, getStorageService } from '../services';
import { useToast } from '../contexts/ToastContext';
import { Button } from './ui/Button';

export interface QRPreviewHandle {
  handleCopy: () => void;
  handleDownload: () => void;
  handleSave: () => void;
}

interface QRPreviewProps {
  settings: QRSettings;
  onSaveQR?: (dataUrl: string) => void;
}

/** Replace template tokens to build a safe filename (no extension). */
function resolveFilename(template: string, vars: { label: string; size: number; format: string }): string {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return template
    .replace(/\{label\}/gi, vars.label)
    .replace(/\{size\}/gi, String(vars.size))
    .replace(/\{date\}/gi, date)
    .replace(/\{format\}/gi, vars.format)
    // Strip characters that are unsafe in filenames on all platforms
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    || 'qr-code';
}

export const QRPreview = forwardRef<QRPreviewHandle, QRPreviewProps>(({ settings, onSaveQR }, ref) => {
  const domRef = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'svg' | 'jpeg' | 'webp'>('png');
  const [filenameTemplate, setFilenameTemplate] = useState('{label}_{date}');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const printMenuRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  const [isCompactLayout, setIsCompactLayout] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameStyle = settings.frameOptions.style;
  const isFramed = frameStyle !== 'none';
  const toast = useToast();
  const storage = getStorageService();

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const handleChange = () => setIsCompactLayout(query.matches);
    handleChange();
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  // Load persisted download format and filename template on mount
  useEffect(() => {
    storage.getSetting('last_format').then(fmt => {
      if (fmt && ['png', 'svg', 'jpeg', 'webp'].includes(fmt)) {
        setDownloadFormat(fmt as typeof downloadFormat);
      }
    });
    storage.getSetting('filename_template').then(tpl => {
      if (tpl) setFilenameTemplate(tpl);
    });
  }, []);

  useEffect(() => {
    // Initialize standard library instance
    qrCode.current = new QRCodeStyling(settings as any);
    if (domRef.current) {
      qrCode.current.append(domRef.current);
    }
  }, []); 

  useEffect(() => {
    if (qrCode.current) {
      setIsUpdating(true);
      qrCode.current.update(settings as any);
      if (updateTimer.current) clearTimeout(updateTimer.current);
      updateTimer.current = setTimeout(() => setIsUpdating(false), 200);
    }
  }, [settings]);

  // Copy to clipboard function for PNG
  const handleCopy = async () => {
    if (!qrCode.current) return;
    try {
        const blob = await qrCode.current.getRawData('png');
        if (blob) {
            const validBlob = blob as Blob;
            await navigator.clipboard.write([
                new ClipboardItem({
                    [validBlob.type]: validBlob
                })
            ]);
            setCopied(true);
            toast('Copied to clipboard!', 'success');
            setTimeout(() => setCopied(false), 2000);
        }
    } catch (err) {
        console.error("Failed to copy", err);
        toast('Copy not supported in this browser context.', 'error');
    }
  };

  // Export QR at multiple sizes
  const handleExportAllSizes = async () => {
    const sizes = [256, 512, 1024, 2048];
    const label = (settings.data || 'qr').slice(0, 40).replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'qr';
    try {
      for (const size of sizes) {
        const tempQR = new QRCodeStyling({ ...settings as any, width: size, height: size });
        const blob = await tempQR.getRawData('png');
        if (blob) {
          const url = URL.createObjectURL(blob as Blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${resolveFilename(filenameTemplate, { label, size, format: 'png' })}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          await new Promise(r => setTimeout(r, 150));
        }
      }
      toast('Exported 4 sizes (256, 512, 1024, 2048 px)', 'success');
    } catch (err) {
      console.error('Export all sizes failed', err);
      toast('Export failed — please try again.', 'error');
    }
  };

  const handleShare = async () => {
    if (!qrCode.current) return;
    // Mobile / browsers that support Web Share API with files
    if (navigator.share && navigator.canShare) {
      try {
        const blob = await qrCode.current.getRawData('png');
        if (!blob) return;
        const file = new File([blob as Blob], 'qr-code.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'QR Code', text: settings.data || '' });
          return;
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        // fall through to menu
      }
    }
    // Desktop / browsers without native share → show share menu
    setShareMenuOpen(v => !v);
  };

  // Close share menu when clicking outside
  useEffect(() => {
    if (!shareMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShareMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shareMenuOpen]);

  const handleShareCopyImage = async () => {
    setShareMenuOpen(false);
    if (!qrCode.current) return;
    try {
      const blob = await qrCode.current.getRawData('png');
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ [(blob as Blob).type]: blob as Blob })]);
      setCopied(true);
      toast('Image copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Copy failed — try the Copy button instead.', 'warning');
    }
  };

  const handleShareCopyURL = () => {
    setShareMenuOpen(false);
    const url = settings.data || '';
    if (url) navigator.clipboard.writeText(url)
      .then(() => toast('URL copied to clipboard!', 'success'))
      .catch(() => toast('Failed to copy URL.', 'error'));
  };

  // Escape HTML entities in user-supplied strings before injecting into print HTML
  const escHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Close print menu when clicking outside
  useEffect(() => {
    if (!printMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (printMenuRef.current && !printMenuRef.current.contains(e.target as Node)) {
        setPrintMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [printMenuOpen]);

  const openPrintWindow = async (mode: 'qr-only' | 'with-label' | 'sticker-sheet') => {
    setPrintMenuOpen(false);
    if (!qrCode.current) return;
    try {
      const blob = await qrCode.current.getRawData('png');
      if (!blob) return;
      const imgUrl = URL.createObjectURL(blob as Blob);
      const label = escHtml((settings.textContent?.trim() || settings.data || '').slice(0, 120));
      const win = window.open('', '_blank');
      if (!win) return;

      let styles = '';
      let body = '';

      if (mode === 'qr-only') {
        styles = `
          body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; }
          img { width: 80vmin; height: 80vmin; display: block; }
        `;
        body = `<img src="${imgUrl}" onload="window.print()" />`;
      } else if (mode === 'with-label') {
        styles = `
          body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
                 min-height: 100vh; font-family: system-ui, sans-serif; background: #fff; gap: 14px; }
          img { width: 68vmin; height: 68vmin; display: block; }
          .label { font-size: 0.85rem; color: #333; word-break: break-all; max-width: 68vmin;
                   text-align: center; line-height: 1.4; }
          @media print { .label { font-size: 10pt; } }
        `;
        body = `<img src="${imgUrl}" onload="window.print()" /><p class="label">${label}</p>`;
      } else {
        // sticker-sheet — 3×3 grid, optimised for A4/Letter label paper
        const shortLabel = escHtml((settings.textContent?.trim() || settings.data || '').slice(0, 45));
        const cell = `<div class="cell"><img src="${imgUrl}" /><p>${shortLabel}</p></div>`;
        const grid = Array(9).fill(cell).join('');
        styles = `
          @page { margin: 8mm; }
          body { margin: 0; font-family: system-ui, sans-serif; background: #fff; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; }
          .cell { display: flex; flex-direction: column; align-items: center;
                  border: 0.5pt dashed #ccc; padding: 3mm; box-sizing: border-box; }
          .cell img { width: 100%; aspect-ratio: 1/1; object-fit: contain; display: block; }
          .cell p { margin: 2mm 0 0; font-size: 7pt; color: #333;
                    word-break: break-all; text-align: center; line-height: 1.3; }
        `;
        body = `<div class="grid">${grid}</div><script>window.addEventListener('load', () => window.print());<\/script>`;
      }

      win.document.write(`<!DOCTYPE html><html><head><title>QR Code — QR Studio</title><style>${styles}</style></head><body>${body}</body></html>`);
      win.document.close();
      setTimeout(() => URL.revokeObjectURL(imgUrl), 15000);
    } catch (err) {
      console.error('Print failed', err);
      toast('Print failed — pop-ups may be blocked by your browser.', 'error');
    }
  };

  // Legacy alias so the Share menu can still call print
  const handlePrint = () => openPrintWindow('with-label');

  const handleSaveQR = async () => {
    if (!qrCode.current || !onSaveQR) return;
    try {
      const blob = await qrCode.current.getRawData('png');
      if (!blob) return;
      const blobUrl = URL.createObjectURL(blob as Blob);
      const img = new Image();
      img.src = blobUrl;
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(blobUrl); return; }
      ctx.drawImage(img, 0, 0, 400, 400);
      URL.revokeObjectURL(blobUrl);
      onSaveQR(canvas.toDataURL('image/png'));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save QR failed', err);
      toast('Failed to save QR code.', 'error');
    }
  };

  const handleDownload = async () => {
    const label = (settings.data || 'qr').slice(0, 40).replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'qr';
    const size = settings.width;
    const name = resolveFilename(filenameTemplate, { label, size, format: downloadFormat });
    if (isFramed && downloadFormat === 'svg') {
        await downloadFramedQRSVG(name);
    } else if (isFramed && (downloadFormat === 'png' || downloadFormat === 'jpeg' || downloadFormat === 'webp')) {
        await downloadFramedQR(downloadFormat as 'png' | 'jpeg', name);
    } else {
        await qrCode.current.download({
            name,
            extension: downloadFormat
        });
    }
  };

  const downloadFramedQRSVG = async (name: string) => {
    if (!qrCode.current) return;
    try {
      const svgBlob = await qrCode.current.getRawData('svg');
      if (!svgBlob) return;
      const svgText = await (svgBlob as Blob).text();

      const qrSize = settings.width;
      const frameColor = settings.frameOptions.color;
      const textColor = settings.frameOptions.textColor;
      const text = settings.frameOptions.text || '';
      const fontSize = Math.floor(qrSize * 0.07);
      const fontFamily = settings.frameOptions.fontFamily || 'Inter, Arial, sans-serif';

      // Strip outer <svg ...>...</svg> tags to get just the inner content.
      // qr-code-styling emits both xlink:href AND href on <image> elements.
      // Remove xlink:href (with its value) entirely so only the modern href remains,
      // preventing "Attribute href redefined" errors in strict XML parsers.
      const innerMatch = svgText.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
      const qrInner = (innerMatch ? innerMatch[1] : svgText)
        .replace(/\s*xlink:href="[^"]*"/g, '')
        .replace(/\s*xmlns:xlink="[^"]*"/g, '');
      const qrViewBox = `0 0 ${qrSize} ${qrSize}`;

      let totalW = qrSize;
      let totalH = qrSize;
      let qrX = 0;
      let qrY = 0;
      let frameSVG = '';

      switch (frameStyle) {
        case 'simple': {
          const pad = qrSize * 0.05;
          const textH = qrSize * 0.15;
          const r = pad;
          totalW = qrSize + pad * 2;
          totalH = qrSize + pad * 2 + textH;
          qrX = pad; qrY = pad;
          frameSVG = `<rect x="0" y="0" width="${totalW}" height="${totalH}" rx="${r}" ry="${r}" fill="${frameColor}"/>
<svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="${qrViewBox}">${qrInner}</svg>
<text x="${totalW / 2}" y="${totalH - textH / 2 - pad / 4}" font-size="${fontSize}" font-family="${fontFamily}" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${text}</text>`;
          break;
        }
        case 'balloon': {
          const bubbleH = qrSize * 0.14;
          const estTextW = text.length * fontSize * 0.6;
          const bubbleW = estTextW + qrSize * 0.2;
          const spacing = qrSize * 0.05;
          totalW = Math.max(qrSize, bubbleW);
          totalH = qrSize + spacing + bubbleH;
          qrX = (totalW - qrSize) / 2; qrY = 0;
          const bx = (totalW - bubbleW) / 2;
          const by = qrSize + spacing;
          const br = bubbleH / 2;
          frameSVG = `<svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="${qrViewBox}">${qrInner}</svg>
<rect x="${bx}" y="${by}" width="${bubbleW}" height="${bubbleH}" rx="${br}" ry="${br}" fill="${frameColor}"/>
<text x="${totalW / 2}" y="${by + bubbleH / 2}" font-size="${fontSize}" font-family="${fontFamily}" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${text}</text>`;
          break;
        }
        case 'badge': {
          const badgeH = qrSize * 0.15;
          const badgeW = qrSize * 0.8;
          const border = qrSize * 0.02;
          const bpad = border * 2;
          const badgeGap = border;
          totalW = qrSize + bpad * 2;
          // QR at top; badge clearly below with gap
          totalH = bpad + qrSize + badgeGap + badgeH + bpad;
          qrX = bpad; qrY = bpad;
          const badgeX = (totalW - badgeW) / 2;
          const badgeY = bpad + qrSize + badgeGap;
          frameSVG = `<rect x="${border}" y="${border}" width="${totalW - border*2}" height="${totalH - border*2}" rx="${qrSize*0.05}" ry="${qrSize*0.05}" fill="#ffffff" stroke="${frameColor}" stroke-width="${border}"/>
<svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="${qrViewBox}">${qrInner}</svg>
<rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="8" ry="8" fill="${frameColor}"/>
<text x="${totalW / 2}" y="${badgeY + badgeH / 2}" font-size="${fontSize}" font-family="${fontFamily}" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${text}</text>`;
          break;
        }
        case 'corners': {
          const pad = qrSize * 0.04;
          const textH = qrSize * 0.15;
          const bw = qrSize * 0.025;
          const bl = qrSize * 0.2; // bracket length
          totalW = qrSize + pad * 2;
          totalH = qrSize + pad * 2 + textH;
          qrX = pad; qrY = pad;
          const r = bw;
          // Corner brackets
          const brackets = [
            // top-left
            `M ${pad} ${pad + bl} L ${pad} ${pad} L ${pad + bl} ${pad}`,
            // top-right
            `M ${totalW - pad - bl} ${pad} L ${totalW - pad} ${pad} L ${totalW - pad} ${pad + bl}`,
            // bottom-left (above text area)
            `M ${pad} ${qrSize + pad - bl} L ${pad} ${qrSize + pad} L ${pad + bl} ${qrSize + pad}`,
            // bottom-right
            `M ${totalW - pad - bl} ${qrSize + pad} L ${totalW - pad} ${qrSize + pad} L ${totalW - pad} ${qrSize + pad - bl}`,
          ].map(d => `<path d="${d}" stroke="${frameColor}" stroke-width="${bw}" stroke-linecap="round" fill="none" stroke-linejoin="round"/>`).join('\n');
          const bubbleW = (text.length * fontSize * 0.6) + qrSize * 0.2;
          const bx = (totalW - bubbleW) / 2;
          const by = qrSize + pad * 2;
          const br2 = textH / 2;
          frameSVG = `<svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="${qrViewBox}">${qrInner}</svg>
${brackets}
<rect x="${bx}" y="${by}" width="${bubbleW}" height="${textH}" rx="${br2}" ry="${br2}" fill="${frameColor}"/>
<text x="${totalW / 2}" y="${by + textH / 2}" font-size="${fontSize}" font-family="${fontFamily}" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${text}</text>`;
          break;
        }
        case 'arrow': {
          const textH = qrSize * 0.14;
          const triH = qrSize * 0.06; // upward triangle height
          const triW = qrSize * 0.08;
          totalW = qrSize;
          totalH = qrSize + triH + textH;
          qrX = 0; qrY = 0;
          const bubbleW = (text.length * fontSize * 0.6) + qrSize * 0.2;
          const bx = (totalW - bubbleW) / 2;
          const by = qrSize + triH;
          const ax = totalW / 2;
          // Upward triangle connecting label to QR
          const triPts = `${ax},${qrSize} ${ax - triW/2},${by} ${ax + triW/2},${by}`;
          frameSVG = `<svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="${qrViewBox}">${qrInner}</svg>
<polygon points="${triPts}" fill="${frameColor}"/>
<rect x="${bx}" y="${by}" width="${bubbleW}" height="${textH}" rx="6" ry="6" fill="${frameColor}"/>
<text x="${totalW / 2}" y="${by + textH / 2}" font-size="${fontSize}" font-family="${fontFamily}" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${text}</text>`;
          break;
        }
        default: {
          // No frame — just download plain SVG
          await qrCode.current.download({ name: `qr-studio-${Date.now()}`, extension: 'svg' });
          return;
        }
      }

      const fullSVG = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">\n${frameSVG}\n</svg>`;
      const blob = new Blob([fullSVG], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('SVG framed export failed', err);
      toast('SVG export failed — please try again.', 'error');
    }
  };

  const downloadFramedQR = async (format: 'png' | 'jpeg', name: string) => {
      if (!qrCode.current) return;

      try {
        const qrBlob = await qrCode.current.getRawData('png');
        if (!qrBlob) return;

        const qrImage = new Image();
        qrImage.src = URL.createObjectURL(qrBlob as Blob);
        
        await new Promise((resolve) => {
            qrImage.onload = resolve;
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const qrSize = settings.width;
        
        let totalWidth = qrSize;
        let totalHeight = qrSize;
        let qrX = 0;
        
        const frameColor = settings.frameOptions.color;
        const textColor = settings.frameOptions.textColor;
        const text = settings.frameOptions.text;
        const fontSize = Math.floor(qrSize * 0.07);
        const fontFamily = settings.frameOptions.fontFamily || 'Inter, Arial, sans-serif';

        switch(frameStyle) {
            case 'simple': {
                const innerPadding = qrSize * 0.05; 
                const textHeight = qrSize * 0.15;
                totalWidth = qrSize + (innerPadding * 2);
                totalHeight = qrSize + (innerPadding * 2) + textHeight;
                canvas.width = totalWidth;
                canvas.height = totalHeight;
                ctx.font = `bold ${fontSize}px ${fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = frameColor;
                if (ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(0, 0, totalWidth, totalHeight, innerPadding); 
                    ctx.fill();
                } else {
                    ctx.fillRect(0, 0, totalWidth, totalHeight);
                }
                ctx.drawImage(qrImage, innerPadding, innerPadding, qrSize, qrSize);
                ctx.fillStyle = textColor;
                ctx.fillText(text, totalWidth / 2, totalHeight - (textHeight / 2) - (innerPadding / 4));
                break;
            }
            case 'balloon': {
                const bubbleHeight = qrSize * 0.14;
                ctx.font = `bold ${fontSize}px ${fontFamily}`;
                const bubbleWidth = ctx.measureText(text).width + (qrSize * 0.2);
                const spacing = qrSize * 0.05;
                totalWidth = Math.max(qrSize, bubbleWidth);
                totalHeight = qrSize + spacing + bubbleHeight;
                qrX = (totalWidth - qrSize) / 2;
                canvas.width = totalWidth;
                canvas.height = totalHeight;
                // Re-apply context state after canvas resize (resize resets all state)
                ctx.font = `bold ${fontSize}px ${fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.drawImage(qrImage, qrX, 0, qrSize, qrSize);
                const bubbleX = (totalWidth - bubbleWidth) / 2;
                const bubbleY = qrSize + spacing;
                ctx.fillStyle = frameColor;
                if (ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleHeight/2);
                    ctx.fill();
                } else {
                    ctx.fillRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
                }
                ctx.fillStyle = textColor;
                ctx.fillText(text, totalWidth / 2, bubbleY + (bubbleHeight / 2));
                break;
            }
            case 'badge': {
                const badgeHeight = qrSize * 0.15;
                const badgeWidth = qrSize * 0.8;
                const borderWidth = qrSize * 0.02;
                const boxPadding = borderWidth * 2;
                const badgeGap = borderWidth;
                totalWidth = qrSize + boxPadding * 2;
                // QR at top, badge clearly below with gap
                totalHeight = boxPadding + qrSize + badgeGap + badgeHeight + boxPadding;
                canvas.width = totalWidth;
                canvas.height = totalHeight;
                // Re-apply all context state after canvas resize
                ctx.font = `bold ${fontSize}px ${fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.strokeStyle = frameColor;
                ctx.lineWidth = borderWidth;
                ctx.fillStyle = '#ffffff';
                if (ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(borderWidth, borderWidth, totalWidth - borderWidth*2, totalHeight - borderWidth*2, qrSize*0.05);
                    ctx.fill();
                    ctx.stroke();
                } else {
                    ctx.fillRect(0, 0, totalWidth, totalHeight);
                    ctx.strokeRect(0, 0, totalWidth, totalHeight);
                }
                // Draw QR at top with padding
                ctx.drawImage(qrImage, boxPadding, boxPadding, qrSize, qrSize);
                // Badge label clearly below QR
                const badgeX = (totalWidth - badgeWidth) / 2;
                const badgeY = boxPadding + qrSize + badgeGap;
                ctx.fillStyle = frameColor;
                if (ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 8);
                    ctx.fill();
                } else {
                    ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
                }
                ctx.fillStyle = textColor;
                ctx.fillText(text, totalWidth / 2, badgeY + badgeHeight / 2);
                break;
            }
            case 'corners': {
                const pad = qrSize * 0.04;
                const textHeight = qrSize * 0.15;
                const bracketW = qrSize * 0.025;
                const bracketLen = qrSize * 0.2;
                totalWidth = qrSize + pad * 2;
                totalHeight = qrSize + pad * 2 + textHeight;
                canvas.width = totalWidth;
                canvas.height = totalHeight;
                ctx.drawImage(qrImage, pad, pad, qrSize, qrSize);
                // Corner brackets
                ctx.strokeStyle = frameColor;
                ctx.lineWidth = bracketW;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                const corners: [number, number, number, number][] = [
                    [pad, pad, 1, 1],
                    [totalWidth - pad, pad, -1, 1],
                    [pad, pad + qrSize, 1, -1],
                    [totalWidth - pad, pad + qrSize, -1, -1],
                ];
                for (const [x, y, dx, dy] of corners) {
                    ctx.beginPath();
                    ctx.moveTo(x, y + bracketLen * dy);
                    ctx.lineTo(x, y);
                    ctx.lineTo(x + bracketLen * dx, y);
                    ctx.stroke();
                }
                // Pill label
                ctx.font = `bold ${fontSize}px ${fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const bw2 = ctx.measureText(text).width + qrSize * 0.2;
                const bx2 = (totalWidth - bw2) / 2;
                const by2 = pad + qrSize + pad * 0.5;
                ctx.fillStyle = frameColor;
                if (ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(bx2, by2, bw2, textHeight * 0.8, textHeight * 0.4);
                    ctx.fill();
                } else {
                    ctx.fillRect(bx2, by2, bw2, textHeight * 0.8);
                }
                ctx.fillStyle = textColor;
                ctx.fillText(text, totalWidth / 2, by2 + textHeight * 0.4);
                break;
            }
            case 'arrow': {
                const textHeight = qrSize * 0.14;
                const triH = qrSize * 0.06;
                const triW = qrSize * 0.08;
                totalWidth = qrSize;
                totalHeight = qrSize + triH + textHeight;
                canvas.width = totalWidth;
                canvas.height = totalHeight;
                // Re-apply context state after canvas resize
                ctx.font = `bold ${fontSize}px ${fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.drawImage(qrImage, 0, 0, qrSize, qrSize);
                const bw3 = ctx.measureText(text).width + qrSize * 0.2;
                const bx3 = (totalWidth - bw3) / 2;
                const by3 = qrSize + triH;
                const ax = totalWidth / 2;
                ctx.fillStyle = frameColor;
                // Upward triangle connecting QR to label
                ctx.beginPath();
                ctx.moveTo(ax, qrSize);
                ctx.lineTo(ax - triW / 2, by3);
                ctx.lineTo(ax + triW / 2, by3);
                ctx.closePath();
                ctx.fill();
                // Label rectangle
                if (ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(bx3, by3, bw3, textHeight, 6);
                    ctx.fill();
                } else {
                    ctx.fillRect(bx3, by3, bw3, textHeight);
                }
                ctx.fillStyle = textColor;
                ctx.fillText(text, totalWidth / 2, by3 + textHeight / 2);
                break;
            }
            default: break;
        }

        const dataUrl = canvas.toDataURL(`image/${format}`, 1.0);
        const link = document.createElement('a');
        link.download = `${name}.${format}`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
          console.error("Failed to generate framed QR", err);
          toast('Failed to generate framed QR — please try again.', 'error');
      }
  };

  // Styles for live preview wrappers
  const getPreviewStyles = () => {
      const color = settings.frameOptions.color;
      const textColor = settings.frameOptions.textColor;
      const fontFamily = settings.frameOptions.fontFamily || 'Inter, Arial, sans-serif';
      
      switch(frameStyle) {
          case 'simple':
              return {
                  wrapper: {
                    backgroundColor: color,
                    padding: '1.5rem',
                    paddingBottom: '0.75rem',
                    borderRadius: '1rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  },
                  text: { marginTop: '0.75rem', color: textColor, fontWeight: '700', textAlign: 'center' as const, fontFamily }
              };
           case 'balloon':
              return {
                  wrapper: {},
                  text: {
                      marginTop: '0.5rem',
                      backgroundColor: color, color: textColor, padding: '0.5rem 1.5rem',
                      borderRadius: '9999px', fontWeight: '700', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      whiteSpace: 'nowrap' as const, fontFamily, alignSelf: 'center' as const
                  }
              };
            case 'badge':
                return {
                    wrapper: {
                        border: `4px solid ${color}`, backgroundColor: '#ffffff',
                        padding: '1rem', borderRadius: '1rem'
                    },
                    text: {
                        marginTop: '0.75rem', backgroundColor: color, color: textColor,
                        padding: '0.4rem 1rem', width: '80%', textAlign: 'center' as const,
                        borderRadius: '0.5rem', fontWeight: '700', whiteSpace: 'nowrap' as const, fontFamily
                    }
                }
            case 'corners':
                return {
                    wrapper: {
                        position: 'relative' as const,
                        padding: '0.75rem',
                        paddingBottom: '3rem'
                    },
                    // Corner bracket overlay rendered via CSS box-shadow isn't ideal — render as pseudo approach via after
                    cornerStyle: { color, textColor },
                    textContainer: {
                        position: 'absolute' as const, bottom: '0.5rem', left: '50%', transform: 'translateX(-50%)',
                        backgroundColor: color, color: textColor, padding: '0.35rem 1.25rem',
                        borderRadius: '9999px', fontWeight: '700', boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        whiteSpace: 'nowrap' as const, fontFamily
                    }
                };
            case 'arrow':
                return {
                    wrapper: {},
                    textContainer: {
                        backgroundColor: color, color: textColor, padding: '0.4rem 1.25rem',
                        borderRadius: '0.5rem', fontWeight: '700',
                        whiteSpace: 'nowrap' as const, fontFamily
                    }
                };
           default: return {};
      }
  };

  // Expose imperative handle to parent (used by Ctrl+Shift+S keyboard shortcut)
  useImperativeHandle(ref, () => ({
    handleCopy,
    handleDownload,
    handleSave: handleSaveQR,
  }), [toast, onSaveQR]);

  const previewStyles = getPreviewStyles();
  const previewBaseSize = isCompactLayout ? 272 : 320;
  const previewSize = Math.round(previewBaseSize * zoom / 100);

  return (
    <div className="flex flex-col items-center gap-4 md:gap-8 w-full animate-in zoom-in-95 duration-500 motion-reduce:animate-none">
      
      {/* Card Preview Area */}
      <div
        className="relative group p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-indigo-100 dark:shadow-none border border-slate-100 dark:border-slate-800 flex items-center justify-center transition-all duration-300"
        style={{ width: `${previewSize}px`, maxWidth: '90vw', minHeight: `min(${previewSize}px, 90vw)` }}
      >
        {/* Updating ring indicator */}
        {isUpdating && (
          <div className="absolute inset-0 rounded-3xl border-2 border-indigo-400/60 animate-pulse motion-reduce:animate-none pointer-events-none z-20" />
        )}
        {/* Visual Frame Wrapper */}
        <div 
            className={`flex flex-col items-center justify-center transition-all duration-300 ease-in-out w-full ${isUpdating ? 'opacity-70' : 'opacity-100'}`}
            style={previewStyles.wrapper}
        >
            {/* Scanner corner brackets (corners style) */}
            {frameStyle === 'corners' && (() => {
              const c = settings.frameOptions.color;
              const bw = 3;
              const bl = '22%';
              const cs: React.CSSProperties = { position: 'absolute', width: bl, height: bl };
              return (<>
                <div style={{ ...cs, top: 0, left: 0, borderTop: `${bw}px solid ${c}`, borderLeft: `${bw}px solid ${c}`, borderRadius: '4px 0 0 0' }} />
                <div style={{ ...cs, top: 0, right: 0, borderTop: `${bw}px solid ${c}`, borderRight: `${bw}px solid ${c}`, borderRadius: '0 4px 0 0' }} />
                <div style={{ ...cs, bottom: '2.5rem', left: 0, borderBottom: `${bw}px solid ${c}`, borderLeft: `${bw}px solid ${c}`, borderRadius: '0 0 0 4px' }} />
                <div style={{ ...cs, bottom: '2.5rem', right: 0, borderBottom: `${bw}px solid ${c}`, borderRight: `${bw}px solid ${c}`, borderRadius: '0 0 4px 0' }} />
              </>);
            })()}
            <div 
            ref={domRef} 
            className="qr-container flex items-center justify-center w-full [&_canvas]:!max-w-full [&_canvas]:!h-auto [&_svg]:!max-w-full [&_svg]:!h-auto"
            />
            {isFramed && frameStyle === 'arrow' && (
                <div style={{ marginTop: '0.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {/* Upward triangle connecting label to QR */}
                    <div style={{ width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: `9px solid ${settings.frameOptions.color}` }} />
                    <div style={previewStyles.textContainer}>
                        {settings.frameOptions?.text}
                    </div>
                </div>
            )}
            {isFramed && frameStyle !== 'arrow' && (
                <div style={previewStyles.text || previewStyles.textContainer}>
                    {settings.frameOptions?.text}
                </div>
            )}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2 w-full max-w-[400px]">
        <button
          onClick={() => setZoom(z => Math.max(50, z - 10))}
          disabled={zoom <= 50}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30"
          title="Zoom out"
        ><ZoomOut className="w-3.5 h-3.5" /></button>
        <input
          type="range"
          min={50}
          max={200}
          step={10}
          value={zoom}
          aria-label="Preview zoom"
          aria-valuemin={50}
          aria-valuemax={200}
          aria-valuenow={zoom}
          aria-valuetext={`${zoom}%`}
          onChange={e => setZoom(Number(e.target.value))}
          className="flex-1 accent-indigo-600 h-1.5 cursor-pointer"
          title={`Zoom: ${zoom}%`}
        />
        <button
          onClick={() => setZoom(z => Math.min(200, z + 10))}
          disabled={zoom >= 200}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30"
          title="Zoom in"
        ><ZoomIn className="w-3.5 h-3.5" /></button>
        <button
          onClick={() => setZoom(100)}
          className={`text-[10px] font-medium tabular-nums w-9 text-right transition-colors ${zoom !== 100 ? 'text-indigo-500 hover:underline cursor-pointer' : 'text-slate-400 dark:text-slate-500 cursor-default'}`}
          title={zoom !== 100 ? 'Reset zoom' : undefined}
        >{zoom}%</button>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col gap-2 md:gap-3 w-full max-w-[400px]">
        <div className="flex gap-2">
            <div className="relative flex-1">
                <select
                    value={downloadFormat}
                    onChange={(e) => {
                      const fmt = e.target.value as typeof downloadFormat;
                      setDownloadFormat(fmt);
                      storage.setSetting('last_format', fmt).catch(() => {});
                    }}
                    className="absolute inset-y-0 right-0 w-12 opacity-0 cursor-pointer z-10"
                    title="Change download format"
                >
                    <option value="png">PNG</option>
                    <option value="svg">SVG</option>
                    <option value="jpeg">JPEG</option>
                    <option value="webp">WebP</option>
                </select>
                <div className="flex w-full shadow-lg shadow-indigo-100 dark:shadow-none rounded-xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700">
                    <Button 
                        onClick={handleDownload} 
                        className="flex-1 rounded-none bg-indigo-600 hover:bg-indigo-700 h-12 text-base z-0"
                    >
                    <Download className="w-5 h-5 mr-2" />
                    Download {downloadFormat.toUpperCase()}
                    </Button>
                    <Button 
                        className="w-12 rounded-none bg-indigo-700 hover:bg-indigo-800 h-12 flex items-center justify-center"
                        title="Select Format"
                    >
                        <span className="text-[10px] font-bold">▼</span>
                    </Button>
                </div>
            </div>
            
            <Button 
                variant="outline" 
                className="h-12 w-12 !px-0 rounded-xl border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800"
                title="Copy to Clipboard"
                onClick={handleCopy}
            >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </Button>
        </div>

        {/* Export All Sizes */}
        <button
          onClick={handleExportAllSizes}
          className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          title="Download PNG at 256, 512, 1024, and 2048 px"
        >
          <Layers className="w-3 h-3" />
          Export all sizes (256–2048 px)
        </button>

        {/* Filename template */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <label className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0" htmlFor="filename-tpl">Filename:</label>
          <input
            id="filename-tpl"
            type="text"
            value={filenameTemplate}
            aria-label="Filename template"
            placeholder="{label}_{date}"
            onChange={e => {
              setFilenameTemplate(e.target.value);
              storage.setSetting('filename_template', e.target.value).catch(() => {});
            }}
            className="flex-1 text-[10px] font-mono bg-transparent border-b border-dashed border-slate-200 dark:border-slate-700 focus:border-indigo-400 dark:focus:border-indigo-500 outline-none text-slate-500 dark:text-slate-400 py-0.5 min-w-0"
          />
          <span className="text-[9px] text-slate-300 dark:text-slate-600 shrink-0 hidden sm:block" title="Available tokens: {label} {size} {date} {format}">{'{label} {size} {date}'}</span>
        </div>

        {/* Secondary actions: Save, Share, Print */}
        <div className="flex gap-2">
            {onSaveQR && (
              <Button
                  variant="outline"
                  className={`flex-1 h-9 text-xs gap-1.5 border-slate-200 dark:border-slate-700 transition-colors ${saved ? 'border-green-400 text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-400'}`}
                  onClick={handleSaveQR}
                  title="Save QR to gallery"
              >
                  {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                  {saved ? 'Saved!' : 'Save'}
              </Button>
            )}
            {/* Share — native share sheet on mobile, dropdown menu otherwise */}
            <div className="relative flex-1" ref={shareMenuRef}>
              <Button
                  variant="outline"
                  className={`w-full h-9 text-xs gap-1.5 border-slate-200 dark:border-slate-700 transition-colors ${shareMenuOpen ? 'border-indigo-400 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-400'}`}
                  onClick={handleShare}
                  title="Share QR Code"
              >
                  <Share2 className="w-3.5 h-3.5" /> Share
              </Button>
              {shareMenuOpen && (
                <div className="absolute bottom-full mb-1.5 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 overflow-hidden py-1 text-xs">
                  <button
                    onClick={handleShareCopyImage}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <Copy className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    Copy image to clipboard
                  </button>
                  {settings.dataType === 'url' && settings.data && (
                    <button
                      onClick={handleShareCopyURL}
                      className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <Link2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      Copy URL
                    </button>
                  )}
                  {!isDesktopMode() && settings.dataType === 'url' && settings.data && (
                    <a
                      href={settings.data}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setShareMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      Open URL in browser
                    </a>
                  )}
                  <button
                    onClick={() => { setShareMenuOpen(false); handlePrint(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    Print QR code
                  </button>
                </div>
              )}
            </div>
            {/* Print — dropdown with layout options */}
            <div className="relative flex-1" ref={printMenuRef}>
              <Button
                variant="outline"
                className={`w-full h-9 text-xs gap-1.5 border-slate-200 dark:border-slate-700 transition-colors ${printMenuOpen ? 'border-indigo-400 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-400'}`}
                onClick={() => setPrintMenuOpen(v => !v)}
                title="Print QR Code"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
              {printMenuOpen && (
                <div className="absolute bottom-full mb-1.5 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 overflow-hidden py-1 text-xs min-w-[180px]">
                  {/* Header */}
                  <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1">Layout</p>
                  <button
                    onClick={() => openPrintWindow('qr-only')}
                    className="w-full flex items-start gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-px" />
                    <span>
                      <span className="font-medium block">QR only</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Clean QR, no text</span>
                    </span>
                  </button>
                  <button
                    onClick={() => openPrintWindow('with-label')}
                    className="w-full flex items-start gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-px" />
                    <span>
                      <span className="font-medium block">With label</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">QR + content text below</span>
                    </span>
                  </button>
                  <button
                    onClick={() => openPrintWindow('sticker-sheet')}
                    className="w-full flex items-start gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-px" />
                    <span>
                      <span className="font-medium block">Sticker sheet</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">3×3 grid for label paper</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
});
