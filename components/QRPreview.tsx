import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { QRSettings } from '../types';
import { Download, Copy, Check } from 'lucide-react';
import { Button } from './ui/Button';

interface QRPreviewProps {
  settings: QRSettings;
}

export const QRPreview: React.FC<QRPreviewProps> = ({ settings }) => {
  const ref = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'svg' | 'jpeg'>('png');
  const [copied, setCopied] = useState(false);
  const frameStyle = settings.frameOptions.style;
  const isFramed = frameStyle !== 'none';

  useEffect(() => {
    // Initialize standard library instance
    qrCode.current = new QRCodeStyling(settings as any);
    if (ref.current) {
      qrCode.current.append(ref.current);
    }
  }, []); 

  useEffect(() => {
    if (qrCode.current) {
      qrCode.current.update(settings as any);
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
            setTimeout(() => setCopied(false), 2000);
        }
    } catch (err) {
        console.error("Failed to copy", err);
        alert("Copy not supported in this context or browser.");
    }
  };

  const handleDownload = async () => {
    if (!qrCode.current) return;

    if (isFramed && (downloadFormat === 'png' || downloadFormat === 'jpeg')) {
        await downloadFramedQR(downloadFormat);
    } else {
        if (isFramed && downloadFormat === 'svg') {
            alert("Frame export is currently only supported for PNG and JPEG. Downloading raw QR code.");
        }
        await qrCode.current.download({
            name: `qr-studio-${Date.now()}`,
            extension: downloadFormat
        });
    }
  };

  const downloadFramedQR = async (format: 'png' | 'jpeg') => {
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

        switch(frameStyle) {
            case 'simple': {
                const innerPadding = qrSize * 0.05; 
                const textHeight = qrSize * 0.15;
                totalWidth = qrSize + (innerPadding * 2);
                totalHeight = qrSize + (innerPadding * 2) + textHeight;
                canvas.width = totalWidth;
                canvas.height = totalHeight;
                ctx.font = `bold ${fontSize}px Inter, sans-serif`;
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
                const bubbleWidth = ctx.measureText(text).width + (qrSize * 0.2);
                const spacing = qrSize * 0.05;
                totalWidth = Math.max(qrSize, bubbleWidth);
                totalHeight = qrSize + spacing + bubbleHeight;
                qrX = (totalWidth - qrSize) / 2;
                canvas.width = totalWidth;
                canvas.height = totalHeight;
                ctx.font = `bold ${fontSize}px Inter, sans-serif`;
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
                totalWidth = qrSize + boxPadding * 2;
                totalHeight = qrSize + boxPadding * 2 + badgeHeight;
                canvas.width = totalWidth;
                canvas.height = totalHeight;
                ctx.font = `bold ${fontSize}px Inter, sans-serif`;
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
                    ctx.fillRect(0,0, totalWidth, totalHeight);
                    ctx.strokeRect(0,0, totalWidth, totalHeight);
                }
                const availableHeight = totalHeight - badgeHeight - borderWidth*2;
                ctx.drawImage(qrImage, (totalWidth - qrSize)/2, (availableHeight - qrSize)/2 + borderWidth, qrSize, qrSize);
                ctx.fillStyle = frameColor;
                const badgeX = (totalWidth - badgeWidth) / 2;
                const badgeY = totalHeight - badgeHeight - borderWidth * 3;
                if (ctx.roundRect) {
                     ctx.beginPath();
                     ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight + 10, 10);
                     ctx.fill();
                } else {
                    ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
                }
                ctx.fillStyle = textColor;
                ctx.fillText(text, totalWidth / 2, badgeY + badgeHeight / 2);
                break;
            }
            default: break;
        }

        const dataUrl = canvas.toDataURL(`image/${format}`, 1.0);
        const link = document.createElement('a');
        link.download = `qr-code-framed.${format}`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
          console.error("Failed to generate framed QR", err);
      }
  };

  // Styles for live preview wrappers
  const getPreviewStyles = () => {
      const color = settings.frameOptions.color;
      const textColor = settings.frameOptions.textColor;
      
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
                  text: { marginTop: '0.75rem', color: textColor, fontWeight: '700', textAlign: 'center' as const }
              };
           case 'balloon':
              return {
                  wrapper: { position: 'relative' as const, paddingBottom: '3.5rem' },
                  textContainer: {
                      position: 'absolute' as const, bottom: '0.5rem', left: '50%', transform: 'translateX(-50%)',
                      backgroundColor: color, color: textColor, padding: '0.5rem 1.5rem',
                      borderRadius: '9999px', fontWeight: '700', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      whiteSpace: 'nowrap' as const
                  }
              };
            case 'badge':
                return {
                    wrapper: {
                        position: 'relative' as const, border: `4px solid ${color}`, backgroundColor: '#ffffff',
                        padding: '1rem', paddingBottom: '3.5rem', borderRadius: '1rem'
                    },
                    textContainer: {
                        position: 'absolute' as const, bottom: '0.75rem', left: '50%', transform: 'translateX(-50%)',
                        backgroundColor: color, color: textColor, width: '80%', padding: '0.5rem',
                        borderRadius: '0.5rem', fontWeight: '700', textAlign: 'center' as const, whiteSpace: 'nowrap' as const
                    }
                }
           default: return {};
      }
  };

  const previewStyles = getPreviewStyles();

  return (
    <div className="flex flex-col items-center gap-8 w-full animate-in zoom-in-95 duration-500">
      
      {/* Card Preview Area */}
      <div className="relative group p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-indigo-100 dark:shadow-none border border-slate-100 dark:border-slate-800 flex items-center justify-center w-full max-w-[500px] min-h-[500px] transition-colors">
        {/* Visual Frame Wrapper */}
        <div 
            className="flex flex-col items-center justify-center transition-all duration-300 ease-in-out"
            style={previewStyles.wrapper}
        >
            <div 
            ref={ref} 
            className="qr-container flex items-center justify-center [&_canvas]:!w-full [&_canvas]:!h-auto [&_canvas]:!max-w-[300px] [&_svg]:!w-full [&_svg]:!h-auto [&_svg]:!max-w-[300px]"
            />
            {isFramed && (
                <div style={previewStyles.text || previewStyles.textContainer}>
                    {settings.frameOptions?.text}
                </div>
            )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col gap-4 w-full max-w-[400px]">
        <div className="flex gap-2">
            <div className="relative flex-1">
                <select
                    value={downloadFormat}
                    onChange={(e) => setDownloadFormat(e.target.value as any)}
                    className="absolute inset-y-0 right-0 w-12 opacity-0 cursor-pointer z-10"
                    title="Change download format"
                >
                    <option value="png">PNG</option>
                    <option value="svg">SVG</option>
                    <option value="jpeg">JPEG</option>
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
      </div>
    </div>
  );
};