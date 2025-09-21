'use client'; 

import React, { useState, useRef } from 'react';
import { LayoutDashboard, FileText, Settings, BarChart3, Bell, Search, Upload, UserPlus, X, File, Edit3 } from 'lucide-react';

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

// Rich Text Editor Component with formatting toolbar
const RichTextEditor: React.FC<RichTextEditorProps> = ({ data, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleTextSelect = (): void => {
    // no-op: selection state not used in UI
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/*  Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => formatText('bold')}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold"
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => formatText('italic')}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 italic"
            title="Italic"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => formatText('heading')}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 font-semibold"
            title="Heading"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => formatText('bullet')}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
            title="Bullet Point"
          >
            •
          </button>
          <button
            type="button"
            onClick={() => formatText('link')}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 text-blue-600"
            title="Add Link"
          >
            Link
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Select text to format it. Supports Markdown syntax.
        </div>
      </div>

      {/* Text Area */}
      <textarea
        ref={textareaRef}
        className="w-full h-80 p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Start typing your document content...

You can use Markdown formatting:
**Bold text**
*Italic text*
# Heading
- Bullet points
[Link text](URL)"
        value={data}
        onChange={(e) => onChange(e.target.value)}
        onSelect={handleTextSelect}
        onMouseUp={handleTextSelect}
        onKeyUp={handleTextSelect}
      />

      {/* Preview */}
      {data && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Preview:</div>
          <div 
            className="prose prose-sm max-w-none text-gray-800"
            dangerouslySetInnerHTML={{
              __html: data
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mb-2">$1</h1>')
                .replace(/^• (.*$)/gm, '<li class="ml-4">$1</li>')
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline">$1</a>')
                .replace(/\n/g, '<br>')
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
  const [session, setSession] = useState<null | { role: 'ADMIN' | 'MANAGER'; permissions?: string[]; docTypes?: string[] }> (null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats: StatItem[] = [
    { title: 'Total Documents', value: '1,234', icon: FileText, change: '+12%' },
    { title: 'Translations', value: '456', icon: LayoutDashboard, change: '+23%' },
    { title: 'API Calls', value: '8,901', icon: BarChart3, change: '+8%' },
    { title: 'Active Users', value: '123', icon: Bell, change: '+5%' },
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
    const validFiles = files.filter(file => 
      file.type === 'application/pdf' || 
      file.type === 'application/msword' || 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    
    if (validFiles.length !== files.length) {
      alert('Please select only PDF or DOC files');
    }
    
    setSelectedFiles(validFiles);
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
    const perms = session.permissions || [];
    return perms.includes('*') || perms.includes(perm);
  };

  const hasDocType = (docType: string) => {
    if (!session) return false;
    if (session.role === 'ADMIN') return true;
    const types = session.docTypes || [];
    return types.includes(docType);
  };

  const handleUploadSubmit = () => {
    if (uploadMode === 'file') {
      if (selectedFiles.length === 0) {
        alert('Please select at least one file');
        return;
      }
      
      // Handle file upload logic here
      console.log('Uploading files:', selectedFiles);
      alert(`Uploading ${selectedFiles.length} file(s)...`);
      
    } else if (uploadMode === 'editor') {
      if (!documentTitle.trim() || !editorContent.trim()) {
        alert('Please provide a document title and content');
        return;
      }
      
      // Handle editor content submission here
      console.log('Creating document:', { title: documentTitle, content: editorContent });
      alert('Document created successfully!');
    }
    
    // Reset and close dialog
    setShowUploadDialog(false);
    setUploadMode(null);
    setSelectedFiles([]);
    setEditorContent('');
    setDocumentTitle('');
  };

  const resetDialog = () => {
    setShowUploadDialog(false);
    setUploadMode(null);
    setSelectedFiles([]);
    setEditorContent('');
    setDocumentTitle('');
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
              <a href="/dashboard/users/new" className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <UserPlus className="h-5 w-5 mr-2" />
                Add Users
              </a>
            )}
            {hasPermission('manage-users') && (
              <a href="/dashboard/audit" className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-black transition-colors">
                Audit Logs
              </a>
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
                  placeholder="Type your question here..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Send
                </button>
              </div>
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
                <button className="w-full text-left px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                  Start Translation
                </button>
                <button className="w-full text-left px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
                  Generate API Key
                </button>
                <button className="w-full text-left px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between">
                  <span>Settings</span>
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {uploadMode === 'file' ? 'Upload Files' : 
                 uploadMode === 'editor' ? 'Create Document' : 'Upload Document'}
              </h2>
              <button
                onClick={resetDialog}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-6">
              {!uploadMode ? (
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
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload via Editor</h3>
                      <p className="text-sm text-gray-600">Create or paste content using our built-in rich text editor</p>
                    </button>
                  </div>
                </div>
              ) : uploadMode === 'file' ? (
                // File Upload Mode
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Files (PDF, DOC, DOCX)
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
                        Supports PDF, DOC, and DOCX files
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
                    </div>
                  )}
                </div>
              ) : (
                // Editor Mode
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Title
                    </label>
                    <input
                      type="text"
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      placeholder="Enter document title..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
