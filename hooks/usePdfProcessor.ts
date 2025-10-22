import { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@^4.5.136/build/pdf.worker.min.mjs`;
}

export const usePdfProcessor = () => {
    const [file, setFile] = useState<File | null>(null);
    const [pageSelection, setPageSelection] = useState('1-5');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [extractedText, setExtractedText] = useState<string>('');
    const [pagePreviews, setPagePreviews] = useState<string[]>([]);

    const parsePageRanges = (rangeStr: string): number[] => {
        const pages: Set<number> = new Set();
        const parts = rangeStr.split(',');
        for (const part of parts) {
            const trimmedPart = part.trim();
            if (trimmedPart.includes('-')) {
                const [start, end] = trimmedPart.split('-').map(Number);
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = start; i <= end; i++) {
                        pages.add(i);
                    }
                }
            } else {
                const pageNum = Number(trimmedPart);
                if (!isNaN(pageNum)) {
                    pages.add(pageNum);
                }
            }
        }
        return Array.from(pages).sort((a, b) => a - b);
    };

    const processFile = useCallback(async () => {
        if (!file) {
            setError('No file selected.');
            return;
        }
        setIsProcessing(true);
        setError(null);
        setExtractedText('');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const pagesToProcess = parsePageRanges(pageSelection);
            let textContent = '';

            for (const pageNum of pagesToProcess) {
                if (pageNum > 0 && pageNum <= pdf.numPages) {
                    const page = await pdf.getPage(pageNum);
                    const text = await page.getTextContent();
                    textContent += text.items.map(item => 'str' in item ? item.str : '').join(' ') + '\n\n';
                }
            }
            setExtractedText(textContent);
        } catch (e: any) {
            console.error('Error processing PDF text:', e);
            setError(`Failed to process PDF text: ${e.message}`);
        } finally {
            setIsProcessing(false);
        }
    }, [file, pageSelection]);

    const renderPreviews = useCallback(async () => {
        if (!file) {
            setError('No file selected for preview.');
            return;
        }
        if (pagePreviews.length > 0) return; // Don't re-render if already have them

        setIsRendering(true);
        setError(null);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const previews: string[] = [];
            const numPreviewPages = Math.min(5, pdf.numPages);

            for (let i = 1; i <= numPreviewPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.5 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                if (context) {
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    previews.push(canvas.toDataURL('image/jpeg'));
                }
            }
            setPagePreviews(previews);
        } catch (e: any) {
            console.error('Error rendering PDF preview:', e);
            setError(`Failed to render PDF preview: ${e.message}`);
        } finally {
            setIsRendering(false);
        }
    }, [file, pagePreviews.length]);

    return {
        file,
        setFile,
        pageSelection,
        setPageSelection,
        isProcessing,
        isRendering,
        error,
        extractedText,
        pagePreviews,
        // FIX: Expose setPagePreviews to allow components to reset the previews state.
        setPagePreviews,
        processFile,
        renderPreviews,
    };
};