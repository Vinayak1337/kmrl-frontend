'use client'; 

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { LayoutDashboard, FileText, BarChart3, Bell, Search, Upload, UserPlus, X, File, Edit3, Image as ImageIcon, Check, Bold as BoldIcon, Italic as ItalicIcon, Heading1, List, Link as LinkIcon } from 'lucide-react';

// Define TypeScript interfaces
interface RichTextEditorProps {
  data: string;
  onChange: (content: string) => void;
}

interface StatItem {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  change: string;
}

interface ActivityItem {
  id: number;
  action: string;
  time: string;
  status: 'success' | 'warning' | 'info';
}

interface ProgressStep {
  label: string;
  status: 'pending' | 'active' | 'completed';
}

// Progress Bar Component
const ProgressBar: React.FC<{ steps: ProgressStep[] }> = ({ steps }) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step.status === 'completed' ? 'bg-green-500 border-green-500 text-white' :
                step.status === 'active' ? 'bg-blue-500 border-blue-500 text-white animate-pulse' :
                'bg-gray-100 border-gray-300 text-gray-500'
              }`}>
                {step.status === 'completed' ? <Check className="h-5 w-5" /> : index + 1}
              </div>
            </div>

            {index < steps.length - 1 && (
              <div className={`h-1 w-16 mx-2 ${
                steps[index + 1].status === 'completed' || steps[index + 1].status === 'active'
                  ? 'bg-blue-500' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="flex justify-between text-sm">
        {steps.map((step, index) => (
          <span key={index} className={`
            ${step.status === 'completed' ? 'text-green-600 font-medium' :
            step.status === 'active' ? 'text-blue-600 font-medium' :
            'text-gray-500'}`}> 
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
};


const RichTextEditor: React.FC<RichTextEditorProps> = ({ data, onChange }) => {

  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const formatText = (command: string): void => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = data.substring(start, end);
    
    let newText = data;
    let replacement = '';

    switch (command) {
      case 'bold':
        replacement = `**${selectedText}**`;
        break;
      case 'italic':
        replacement = `*${selectedText}*`;
        break;
      case 'heading':
        replacement = `# ${selectedText}`;
        break;
      case 'bullet':
        replacement = `• ${selectedText}`;
        break;
      case 'link':
        const url = prompt('Enter URL:');
        if (url) replacement = `[${selectedText || 'Link text'}](${url})`;
        break;
      default:
        replacement = selectedText;
    }

    newText = data.substring(0, start) + replacement + data.substring(end);
    onChange(newText);

    // Restore focus
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + replacement.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Create a file reader to convert image to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string; 
      const textarea = textareaRef.current; 
      if (!textarea) return; 
 
      const start = textarea.selectionStart; 
      const end = textarea.selectionEnd; 
 
      // Keep local preview list
      setUploadedImages(prev => ([...prev, imageUrl]));
      
      // Insert an inline data URL directly so that parent can ingest without extra state
      const imageToken = `![Image](${imageUrl})`;
      const newText = data.substring(0, start) + imageToken + data.substring(end);
      onChange(newText); 
 
      // Restore focus 
      setTimeout(() => { 
        textarea.focus(); 
        const newPosition = start + imageToken.length; 
        textarea.setSelectionRange(newPosition, newPosition); 
      }, 0); 
    };
    reader.readAsDataURL(file);
  };

  const handleTextSelect = (): void => {
    // no-op: selection state not used in UI
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/*  Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-3 sticky top-0 z-10">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => formatText('bold')}
            className="h-9 px-3 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-100 flex items-center justify-center"
            title="Bold"
            aria-label="Bold"
          >
            <BoldIcon className="h-4 w-4 text-gray-800" />
          </button>
          <button
            type="button"
            onClick={() => formatText('italic')}
            className="h-9 px-3 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-100 flex items-center justify-center"
            title="Italic"
            aria-label="Italic"
          >
            <ItalicIcon className="h-4 w-4 text-gray-800" />
          </button>
          <button
            type="button"
            onClick={() => formatText('heading')}
            className="h-9 px-3 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-100 flex items-center justify-center"
            title="Heading"
            aria-label="Heading"
          >
            <Heading1 className="h-4 w-4 text-gray-800" />
          </button>
          <button
            type="button"
            onClick={() => formatText('bullet')}
            className="h-9 px-3 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-100 flex items-center justify-center"
            title="Bullet Point"
            aria-label="Bullet List"
          >
            <List className="h-4 w-4 text-gray-800" />
          </button>
          <button
            type="button"
            onClick={() => formatText('link')}
            className="h-9 px-3 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-100 flex items-center justify-center"
            title="Add Link"
            aria-label="Add Link"
          >
            <LinkIcon className="h-4 w-4 text-gray-800" />
          </button>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="h-9 px-3 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-100 flex items-center justify-center"
            title="Upload Image"
            aria-label="Upload Image"
          >
            <ImageIcon className="h-4 w-4 text-gray-800" />
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
        {/* Image preview thumbnails */}
        {uploadedImages.length > 0 && (
          <div className="mt-3 flex items-center space-x-2 overflow-x-auto">
            {uploadedImages.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt={`upload-${i}`} className="h-16 w-16 object-cover rounded-md border" />
            ))}
          </div>
        )}
        <div className="mt-2 text-xs text-gray-500">
          Select text to format it. Supports Markdown syntax and image uploads.
        </div>
      </div>

      {/* Text Area - Increased height for visibility */}
      <textarea
        ref={textareaRef}
        className="w-full h-60 p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
        placeholder="Start typing your document content...

You can use Markdown formatting:
**Bold text**
*Italic text*
# Heading
- Bullet points
[Link text](URL)
![Image](URL)"
        value={data}
        onChange={(e) => onChange(e.target.value)}
        onSelect={handleTextSelect}
        onMouseUp={handleTextSelect}
        onKeyUp={handleTextSelect}
      />

      {/* Preview - Compact version */}
      {data && (
        <div className="border-t border-gray-200 bg-white p-3">
          <div className="text-xs font-medium text-gray-700 mb-2">Preview:</div>
          <div 
            className="prose prose-sm max-w-none text-gray-800 text-sm max-h-48 overflow-y-auto"
            dangerouslySetInnerHTML={{
              __html: (() => {
                return data
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/^# (.*$)/gm, '<h1 class="text-lg font-bold mb-1">$1</h1>')
                  .replace(/^• (.*$)/gm, '<li class="ml-4">$1</li>')
                  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline">$1</a>')
                  // standard image markdown, including data URLs
                  .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto max-h-20 rounded" />')
                  .replace(/\n/g, '<br>');
              })()
            }}
          />
        </div>
      )}
    </div>
  );
};

export default function DashboardPage(): React.ReactElement {
  const [showUploadDialog, setShowUploadDialog] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'editor' | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [editorContent, setEditorContent] = useState<string>('');
  const [documentTitle, setDocumentTitle] = useState<string>('');
  type DemoPage = { page: number; html?: string; image?: string; content?: Record<string, string> };
  type DemoPreview = { title?: string; language?: string; languages?: string[]; pages: DemoPage[] };
  const [demoPreview, setDemoPreview] = useState<null | DemoPreview>(null);
  const [activePreviewPage, setActivePreviewPage] = useState<number>(1);
  const [previewLanguage, setPreviewLanguage] = useState<string>('en');
  const [session, setSession] = useState<null | { role: 'ADMIN' | 'MANAGER'; permissions?: string[]; docTypes?: string[]; grants?: Array<{ dept: string; type: string; actions: string[] }> }> (null);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string | null; title?: string | null; summary?: string | null; textContent?: string }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<ProgressStep[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats: StatItem[] = [
    { title: 'Total Documents', value: '1,234', icon: FileText, change: '+12%' },
    { title: 'Translations', value: '456', icon: LayoutDashboard, change: '+23%' },
    { title: 'Unread documents', value: '8,901', icon: BarChart3, change: '+8%' },
    { title: 'Total Users & Admins', value: '123', icon: Bell, change: '+5%' },
  ];

  const recentActivity: ActivityItem[] = [
    { id: 1, action: 'Document uploaded', time: '2 minutes ago', status: 'success' },
    { id: 2, action: 'Translation completed', time: '5 minutes ago', status: 'success' },
    { id: 3, action: 'API limit warning', time: '1 hour ago', status: 'warning' },
    { id: 4, action: 'New user registered', time: '2 hours ago', status: 'info' },
    { id: 5, action: 'System update', time: '3 hours ago', status: 'info' },
  ];


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    const files: File[] = fileList ? Array.from(fileList) : [];
    const validTypes = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/markdown',
      'text/html',
    ]);
    const validFiles = files.filter(file => validTypes.has(file.type) || /\.(pdf|doc|docx|pptx|txt|md|html?)$/i.test(file.name));
    // Silently drop unsupported files (no popups)
    setSelectedFiles(validFiles);
    // Try load demo preview for the first file (by name)
    if (validFiles[0]) {
      const base = validFiles[0].name.replace(/\.[^.]+$/, '');
      const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      void loadDemoPreview(slug);
    }
  };

  const loadDemoPreview = async (slug: string) => {
    const tryFetch = async (path: string) => {
      try {
        const res = await fetch(path);
        if (!res.ok) return null;
        return (await res.json()) as DemoPreview;
      } catch {
        return null;
      }
    };
    let data = await tryFetch(`/demo/previews/${slug}.json`);
    if (!data) data = await tryFetch(`/demo/previews/default.json`);
    if (data && Array.isArray(data.pages) && data.pages.length > 0) {
      setDemoPreview(data);
      setActivePreviewPage(data.pages[0].page || 1);
      setPreviewLanguage(data.language || 'en');
    } else {
      setDemoPreview(null);
    }
  };

  // Load session to gate features by role/permissions
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        setSession(data.user || null);
      } catch {
        setSession(null);
      }
    })();
  }, []);

  const hasPermission = (perm: string) => {
    if (!session) return false;
    if (session.role === 'ADMIN') return true;
    // Map to grants if present; fallback to legacy permissions
    if (Array.isArray(session.grants)) {
      if (perm === 'upload') return session.grants.some(g => g.actions.includes('ingest'));
      if (perm === 'manage-users') return false; // admin-only handled elsewhere
    }
    const perms = session.permissions || [];
    return perms.includes('*') || perms.includes(perm);
  };

  const hasDocType = (docType: string) => {
    if (!session) return false;
    if (session.role === 'ADMIN') return true;
    if (Array.isArray(session.grants)) {
      return session.grants.some(g => g.type?.toLowerCase() === docType.toLowerCase() && g.actions.includes('read'));
    }
    const types = session.docTypes || [];
    return types.includes(docType);
  };

  const runSearch = async () => {
    if (!searchInput.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(searchInput)}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };


  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  // Convert very simple markdown-ish content into minimal HTML for ingestion
  const markdownToHtml = (content: string): string => {
    let html = content;
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^# (.*)$/gm, '<h1>$1<\/h1>')
      .replace(/^• (.*)$/gm, '<li>$1<\/li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1<\/a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" \/>');
    // Wrap loose lines into paragraphs
    html = html.split(/\n{2,}/).map(block => `<p>${block.replace(/\n/g, '<br\/>')}<\/p>`).join('');
    return `<article>${html}<\/article>`;
  };

  const postIngest = async (title: string, html: string) => {
    const res = await fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, title }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Ingest failed');
    }
    return res.json();
  };

  const handleUploadSubmit = async () => {
    if (uploadMode === 'file') {
      if (selectedFiles.length === 0) {
        alert('Please select at least one file');
        return;
      }
    } else if (uploadMode === 'editor') {
      if (!documentTitle.trim() || !editorContent.trim()) {
        alert('Please provide a document title and content');
        return;
      }
    }
    
    setIsUploading(true);
    
    try {
      setUploadProgress([
        { label: 'Uploading', status: 'active' },
        { label: 'Processing', status: 'pending' },
        { label: 'Indexing', status: 'pending' },
        { label: 'Complete', status: 'pending' },
      ]);

      if (uploadMode === 'editor') {
        const htmlBody = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${documentTitle}</title></head><body>${markdownToHtml(editorContent)}</body></html>`;
        await postIngest(documentTitle, htmlBody);
      } else if (uploadMode === 'file') {
        // Process files sequentially to keep UI simple
        for (const file of selectedFiles) {
          const title = file.name.replace(/\.[^.]+$/, '');
          if (file.type === 'text/plain' || /\.(txt|md)$/i.test(file.name)) {
            const text = await file.text();
            const htmlFromMd = markdownToHtml(text);
            const htmlBody = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${htmlFromMd}</body></html>`;
            await postIngest(title, htmlBody);
          } else if (file.type === 'text/html' || /\.(html?)$/i.test(file.name)) {
            const html = await file.text();
            await postIngest(title, html);
          } else {
            // Skip unsupported file types silently (no popup)
          }
        }
      }

      // Simulate processing steps visually with realistic pacing (~4.6–4.8s total)
      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
      await sleep(1400); // Uploading completes
      setUploadProgress(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'completed' } : i === 1 ? { ...s, status: 'active' } : s));
      await sleep(1400); // Processing completes
      setUploadProgress(prev => prev.map((s, i) => i <= 1 ? { ...s, status: 'completed' } : i === 2 ? { ...s, status: 'active' } : s));
      await sleep(1100); // Indexing completes
      setUploadProgress(prev => prev.map((s, i) => i <= 2 ? { ...s, status: 'completed' } : i === 3 ? { ...s, status: 'active' } : s));
      await sleep(700); // Finalize
      setUploadProgress(prev => prev.map(s => ({ ...s, status: 'completed' })));

      // Prepare redirect to demo page to show slides all at once
      let slug = 'kochidocs';
      if (uploadMode === 'file' && selectedFiles[0]) {
        slug = slugify(selectedFiles[0].name.replace(/\.[^.]+$/, '')) || 'kochidocs';
      } else if (uploadMode === 'editor' && documentTitle.trim()) {
        slug = slugify(documentTitle.trim()) || 'kochidocs';
      }

      // Reset dialog UI then redirect
      setShowUploadDialog(false);
      setUploadMode(null);
      setSelectedFiles([]);
      setEditorContent('');
      setDocumentTitle('');
      setIsUploading(false);
      setUploadProgress([]);

      if (typeof window !== 'undefined') {
        window.location.href = `/demo?doc=${encodeURIComponent(slug)}&view=all`;
      }

    } catch (error) {
      console.error(error);
      setIsUploading(false);
      setUploadProgress([]);
      alert((error as Error)?.message || 'Upload failed. Please try again.');
    }
  };

  const resetDialog = () => {
    if (isUploading) return; // Prevent closing during upload
    
    setShowUploadDialog(false);
    setUploadMode(null);
    setSelectedFiles([]);
    setEditorContent('');
    setDocumentTitle('');
    setIsUploading(false);
    setUploadProgress([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">Welcome back! Here&apos;s what&apos;s happening with your platform.</p>
          </div>
          <div className="flex space-x-2">
            {hasPermission('upload') && (
              <button 
                onClick={() => setShowUploadDialog(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="h-5 w-5 mr-2" />
                Upload Doc
              </button>
            )}
            {hasPermission('manage-users') && (
              <Link href="/dashboard/users/new" className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <UserPlus className="h-5 w-5 mr-2" />
                Add Users
              </Link>
            )}
            {hasPermission('manage-users') && (
              <Link href="/dashboard/audit" className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-black transition-colors">
                Audit Logs
              </Link>
            )}
            {hasDocType('policy') && (
              <a href="#" className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                Policy Workspace
              </a>
            )}
          </div>
        </div>

        {/* AI Assistant */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">
                  Ask me anything about your documents, translations, or how to use the platform!
                </p>
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }}
                  placeholder="Type your question here..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
                <button onClick={runSearch} disabled={searchLoading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  {searchLoading ? 'Searching…' : 'Send'}
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="mt-6 space-y-4">
                  {searchResults.map((r, i) => (
                    <div key={r.id || i} className="p-4 border rounded-lg bg-white">
                      <div className="text-sm text-gray-500">Result {i + 1}</div>
                      {r.title && <div className="font-semibold text-gray-900">{r.title}</div>}
                      {r.summary ? (
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{r.summary}</div>
                      ) : (
                        <div className="text-sm text-gray-700 truncate">{r.textContent?.slice(0, 300)}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-xl">
            <input
              type="text"
              placeholder="Search documents, translations, or users..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className={`text-sm font-medium ${
                    stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                <p className="text-sm text-gray-600 mt-1">{stat.title}</p>
              </div>
            );
          })}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.status === 'success' ? 'bg-green-500' :
                          activity.status === 'warning' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`} />
                        <p className="text-sm text-gray-900">{activity.action}</p>
                      </div>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-3 border-t border-gray-200">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View all activity →
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-6 space-y-3">
                <button 
                  onClick={() => setShowUploadDialog(true)}
                  className="w-full text-left px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Upload Document
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {uploadMode === 'file' ? 'Upload Files' : 
                 uploadMode === 'editor' ? 'Create Document' : 'Upload Document'}
              </h2>
              <button
                onClick={resetDialog}
                disabled={isUploading}
                className={`text-gray-400 hover:text-gray-600 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {isUploading ? (
                // Progress Bar
                <div className="py-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
                    {uploadMode === 'file' ? 'Uploading Your Files...' : 'Creating Your Document...'}
                  </h3>
                  <ProgressBar steps={uploadProgress} />
                  <div className="text-center text-sm text-gray-600 mt-4">
                    Please wait while we process your {uploadMode === 'file' ? 'files' : 'document'}...
                  </div>
                </div>
              ) : !uploadMode ? (
                // Mode Selection
                <div className="space-y-4">
                  <p className="text-gray-600 mb-6">Choose how you&apos;d like to add your document:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setUploadMode('file')}
                      className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                    >
                      <File className="h-12 w-12 text-blue-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload PDF/DOC</h3>
                      <p className="text-sm text-gray-600">Upload existing PDF or Word documents from your computer</p>
                    </button>
                    <button
                      onClick={() => setUploadMode('editor')}
                      className="p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group"
                    >
                      <Edit3 className="h-12 w-12 text-green-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Create with Editor</h3>
                      <p className="text-sm text-gray-600">Create or paste content using our built-in rich text editor with image support</p>
                    </button>
                  </div>
                </div>
              ) : uploadMode === 'file' ? (
                // File Upload Mode
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Files (PDF, DOC, DOCX, PPTX)
                    </label>
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg text-gray-600 mb-2">
                        Click to select files or drag and drop
                      </p>
                      <p className="text-sm text-gray-500">
                        Supports PDF, DOC, DOCX, and PPTX files
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.pptx,.txt,.md,.html,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown,text/html"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Selected Files:</h4>
                      <div className="space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <File className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {/* Demo preview block (page-wise) */}
                      {demoPreview && (
                        <div className="mt-6 border rounded-lg bg-white">
                          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-lg">
                            <div className="text-sm text-gray-700">
                              Demo Preview{demoPreview.title ? ` — ${demoPreview.title}` : ''}
                            </div>
                            <div className="flex items-center gap-3">
                              {Array.isArray(demoPreview.languages) && demoPreview.languages.length > 0 && (
                                <select
                                  value={previewLanguage}
                                  onChange={(e) => setPreviewLanguage(e.target.value)}
                                  className="px-2 py-1 text-sm border border-gray-300 rounded"
                                >
                                  {demoPreview.languages.map((lng) => (
                                    <option key={lng} value={lng}>{lng.toUpperCase()}</option>
                                  ))}
                                </select>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {demoPreview.pages.map(p => (
                                  <button
                                    key={p.page}
                                    onClick={() => setActivePreviewPage(p.page)}
                                    className={`px-3 py-1 text-sm rounded border ${activePreviewPage === p.page ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                                  >
                                    Page {p.page}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="p-4 max-h-80 overflow-y-auto">
                            {demoPreview.pages.filter(p => p.page === activePreviewPage).map(p => {
                              const page = p as DemoPage;
                              const html = page.html || (page.content ? (page.content[previewLanguage] || Object.values(page.content)[0] || '') : '');
                              return (
                                <div key={page.page} className="prose prose-sm max-w-none">
                                  {page.image && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={page.image} alt={`Slide ${page.page}`} className="mb-4 rounded border max-h-48 w-auto" />
                                  )}
                                  <div dangerouslySetInnerHTML={{ __html: html }} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // Editor Mode
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Title
                    </label>
                    <input
                      type="text"
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      placeholder="Enter document title..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500 bg-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Content
                    </label>
                    <RichTextEditor
                      data={editorContent}
                      onChange={setEditorContent}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => uploadMode ? setUploadMode(null) : resetDialog()}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {uploadMode ? 'Back' : 'Cancel'}
              </button>
              
              {uploadMode && (
                <button
                  onClick={handleUploadSubmit}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {uploadMode === 'file' ? 'Upload Files' : 'Create Document'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
