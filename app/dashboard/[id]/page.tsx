'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/UI/button';
import { 
  ArrowLeft, 
  FileText, 
  Tag, 
  Clock, 
  ChevronRight, 
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { ChatBox } from '@/components/dashboard/ChatBox';
import { FeedbackForm } from '@/components/dashboard/FeedbackForm';

interface DocumentNode {
  id: string;
  pageRange: { start: number; end: number };
  content: string;
  images: Array<{
    page: number;
    base64: string;
    mimeType: string;
    caption?: string;
  }>;
  topicSummary?: string;
  summary: string;
  // Markdown variants (preferred rendering)
  summaryMd?: string;
  keyPointsMd?: string;
  actionsMd?: string;
  keyPoints: string[];
  actionableItems: string[];
  criticalFlags?: string[];
  crossDepartments?: string[];
  needsImage?: boolean;
  nextNodeId?: string;
  prevNodeId?: string;
}

interface ProcessedDocument {
  id: string;
  title: string;
  originalFormat: string;
  totalPages: number;
  language: string;
  nodes: DocumentNode[];
  fullSummary: string;
  overallMd?: string;
  metadata: {
    createdAt: Date;
    uploadedBy: string;
    department?: string;
    documentType?: string;
    tags?: string[];
  };
}

export default function DocumentDetailPage() {
  const params = useParams();
  const documentId = params?.id as string;
  
  const [document, setDocument] = useState<ProcessedDocument | null>(null);
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocument = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/documents/ingest?id=${documentId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Document not found');
      }
      
      const data = await response.json();
      setDocument(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (documentId) {
      void loadDocument();
    }
  }, [documentId, loadDocument]);

  const currentNode = document?.nodes[currentNodeIndex];

  // Minimal Markdown -> HTML (safe subset)
  const mdToHtml = (md: string): string => {
    const escape = (s: string) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const lines = md.split(/\r?\n/);
    let html = '';
    let inList = false;
    const flushP = (buf: string[]) => {
      if (!buf.length) return;
      const text = escape(buf.join(' '))
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/_(.+?)_/g, '<em>$1</em>');
      html += `<p>${text}</p>`;
      buf.length = 0;
    };
    const pbuf: string[] = [];
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim()) {
        if (inList) { html += '</ul>'; inList = false; }
        flushP(pbuf);
        continue;
      }
      if (/^###\s+/.test(line)) { if (inList) { html += '</ul>'; inList = false; } flushP(pbuf); html += `<h3>${escape(line.replace(/^###\s+/, ''))}</h3>`; continue; }
      if (/^##\s+/.test(line)) { if (inList) { html += '</ul>'; inList = false; } flushP(pbuf); html += `<h2>${escape(line.replace(/^##\s+/, ''))}</h2>`; continue; }
      if (/^#\s+/.test(line))  { if (inList) { html += '</ul>'; inList = false; } flushP(pbuf); html += `<h1>${escape(line.replace(/^#\s+/, ''))}</h1>`; continue; }
      if (/^[-*]\s+/.test(line)) {
        flushP(pbuf);
        if (!inList) { html += '<ul>'; inList = true; }
        const item = line.replace(/^[-*]\s+/, '');
        const esc = escape(item).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/_(.+?)_/g, '<em>$1</em>');
        html += `<li>${esc}</li>`;
        continue;
      }
      pbuf.push(line);
    }
    if (inList) html += '</ul>';
    flushP(pbuf);
    return html;
  };
  const copySummary = async () => {
    if (!document || !currentNode) return;
    const header = `${document.title} — Section ${currentNodeIndex + 1} (Pages ${currentNode.pageRange.start}-${currentNode.pageRange.end})`;
    const points = (currentNode.keyPoints || []).slice(0, 8).map((p) => `- ${p}`).join('\n');
    const actions = (currentNode.actionableItems || []).slice(0, 6).map((a) => `• ${a}`).join('\n');
    const text = [
      header,
      '',
      currentNode.topicSummary ? `Topic: ${currentNode.topicSummary}` : '',
      'Summary:',
      currentNode.summary,
      points ? '\nKey Points:\n' + points : '',
      actions ? '\nActionable Items:\n' + actions : '',
    ].filter(Boolean).join('\n');
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  const extractDueDates = (items: string[]): string[] => {
    const dates: string[] = [];
    const rx = /\b(?:\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{1,2},?\s*\d{2,4}|\b\d{4}-\d{2}-\d{2}|\b\d{1,2}\/\d{1,2}\/\d{2,4}|\bby\s+(?:EOD|\w+day)\b/gi;
    for (const it of items) {
      const m = it.match(rx);
      if (m) dates.push(...m);
    }
    return Array.from(new Set(dates));
  };

  const navigateNode = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentNodeIndex > 0) {
      setCurrentNodeIndex(currentNodeIndex - 1);
    } else if (direction === 'next' && document && currentNodeIndex < document.nodes.length - 1) {
      setCurrentNodeIndex(currentNodeIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8" />
            <div className="bg-white rounded-lg shadow p-8">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 rounded-lg p-8 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              {error || 'Document not found'}
            </h2>
            <Link 
              href="/dashboard" 
              className="text-blue-600 hover:text-blue-800"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {document.title}
                </h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                  {document.metadata.department && (
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {document.metadata.department}
                    </span>
                  )}
                  {document.metadata.documentType && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {document.metadata.documentType.replace('_', ' ')}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(document.metadata.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Summary */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Document Summary</h2>
          {document.overallMd ? (
            <div
              className="prose prose-sm max-w-none text-gray-800"
              dangerouslySetInnerHTML={{ __html: mdToHtml(document.overallMd) }}
            />
          ) : (
            <p className="text-gray-700">{document.fullSummary}</p>
          )}
          
          {document.metadata.tags && document.metadata.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {document.metadata.tags.map((tag, i) => (
                <span 
                  key={i} 
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Pages:</span>
                <span className="ml-2 font-medium">{document.totalPages}</span>
              </div>
              <div>
                <span className="text-gray-600">Sections:</span>
                <span className="ml-2 font-medium">{document.nodes.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Format:</span>
                <span className="ml-2 font-medium">{document.originalFormat.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Node Navigation */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Section {currentNodeIndex + 1} of {document.nodes.length}
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateNode('prev')}
                  disabled={currentNodeIndex === 0}
                  className="p-2 h-auto"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-sm text-gray-600">
                  Pages {currentNode?.pageRange.start} - {currentNode?.pageRange.end}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateNode('next')}
                  disabled={currentNodeIndex === document.nodes.length - 1}
                  className="p-2 h-auto"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="sm" onClick={copySummary} className="ml-2">Copy Summary</Button>
              </div>
            </div>
          </div>

          {currentNode && (
            <div className="p-6">
              {/* Topic label */}
              {currentNode.topicSummary && (
                <div className="mb-3 text-sm text-gray-600">Topic: <span className="font-medium">{currentNode.topicSummary}</span></div>
              )}

              {/* Node Summary */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
                {currentNode.summaryMd ? (
                  currentNode.summaryMd.trim().startsWith("```") ? (
                    <pre className="overflow-auto bg-gray-50 border rounded p-3 text-sm text-gray-800">
                      <code>{currentNode.summaryMd}</code>
                    </pre>
                  ) : (
                    <div
                      className="prose prose-sm max-w-none text-gray-800"
                      dangerouslySetInnerHTML={{ __html: mdToHtml(currentNode.summaryMd) }}
                    />
                  )
                ) : (
                  <p className="text-gray-700">{currentNode.summary}</p>
                )}
              </div>

              {/* Critical Flags and Cross-Departments */}
              {(currentNode.criticalFlags?.length || currentNode.crossDepartments?.length) && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentNode.criticalFlags?.length ? (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Critical Flags</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentNode.criticalFlags.map((f, i) => (
                          <span key={i} className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">{f}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {currentNode.crossDepartments?.length ? (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Cross-Departments</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentNode.crossDepartments.map((d, i) => (
                          <span key={i} className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">{d}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Key Points */}
              {(currentNode.keyPointsMd || currentNode.keyPoints.length > 0) && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Key Points
                  </h4>
                  {currentNode.keyPointsMd ? (
                    <div
                      className="prose prose-sm max-w-none text-gray-800"
                      dangerouslySetInnerHTML={{ __html: mdToHtml(currentNode.keyPointsMd) }}
                    />
                  ) : (
                    <ul className="space-y-2">
                      {currentNode.keyPoints.slice(0, 8).map((point, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          <span className="text-gray-700">{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Actionable Items */}
              {(currentNode.actionsMd || currentNode.actionableItems.length > 0) && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    Actionable Items
                  </h4>
                  {currentNode.actionsMd ? (
                    <div
                      className="prose prose-sm max-w-none text-gray-800"
                      dangerouslySetInnerHTML={{ __html: mdToHtml(currentNode.actionsMd) }}
                    />
                  ) : (
                    <ul className="space-y-2">
                      {currentNode.actionableItems.slice(0, 6).map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-orange-600 mt-1">!</span>
                          <span className="text-gray-700 font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* Due Dates */}
                  {(!currentNode.actionsMd && extractDueDates(currentNode.actionableItems).length > 0) && (
                    <div className="mt-3 text-sm">
                      <span className="font-semibold text-gray-900">Due Dates: </span>
                      {extractDueDates(currentNode.actionableItems).map((d, i) => (
                        <span key={i} className="inline-block mr-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">{d}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Images */}
              {currentNode.images.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Images ({currentNode.images.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {currentNode.images.map((img, i) => (
                      <div key={i} className="border rounded-lg overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={`data:${img.mimeType};base64,${img.base64}`}
                          alt={img.caption || `Image ${i + 1}`}
                          className="w-full h-auto"
                        />
                        {img.caption && (
                          <div className="p-2 bg-gray-50 text-sm text-gray-600">
                            {img.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Original Content (Collapsible) */}
              <details className="mt-6 border-t pt-6">
                <summary className="cursor-pointer font-semibold text-gray-900 hover:text-blue-600">
                  View Original Content
                </summary>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                    {currentNode.content}
                  </pre>
                </div>
              </details>
            </div>
          )}

          {/* Quick Navigation */}
          <div className="border-t px-6 py-4">
            <div className="flex gap-2 flex-wrap">
              {document.nodes.map((_, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={index === currentNodeIndex ? 'default' : 'outline'}
                  onClick={() => setCurrentNodeIndex(index)}
                >
                  Section {index + 1}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat + Feedback */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ask About This Document</h3>
            <ChatBox docId={document.id} />
          </div>
          <div className="lg:mt-8">
            <FeedbackForm docId={document.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
