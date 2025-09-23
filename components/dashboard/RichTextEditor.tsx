'use client';

import React, { useState, useRef } from 'react';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Heading1,
  List,
  Link as LinkIcon,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/UI/button';
import { Textarea } from '@/components/UI/textarea';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange,
  placeholder = "Start typing your document content..." 
}) => {
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const formatText = (command: string): void => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
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
        else return;
        break;
      default:
        replacement = selectedText;
    }

    const newText = value.substring(0, start) + replacement + value.substring(end);
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

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      setUploadedImages(prev => [...prev, imageUrl]);
      
      const imageToken = `![Image](${imageUrl})`;
      const newText = value.substring(0, start) + imageToken + value.substring(end);
      onChange(newText);

      setTimeout(() => {
        textarea.focus();
        const newPosition = start + imageToken.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    };
    reader.readAsDataURL(file);
  };

  const renderPreview = () => {
    return value
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^# (.*$)/gm, '<h1 class="text-lg font-bold mb-1">$1</h1>')
      .replace(/^• (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto max-h-20 rounded" />')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => formatText('bold')} title="Bold">
            <BoldIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => formatText('italic')} title="Italic">
            <ItalicIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => formatText('heading')} title="Heading">
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => formatText('bullet')} title="Bullet Point">
            <List className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => formatText('link')} title="Add Link">
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => imageInputRef.current?.click()} title="Upload Image">
            <ImageIcon className="h-4 w-4" />
          </Button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
        
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

      {/* Text Area */}
      <Textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-60 resize-none text-gray-900 bg-white"
      />

      {/* Preview */}
      {value && (
        <div className="border-t border-gray-200 bg-white p-3">
          <div className="text-xs font-medium text-gray-700 mb-2">Preview:</div>
          <div 
            className="prose prose-sm max-w-none text-gray-800 text-sm max-h-48 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: renderPreview() }}
          />
        </div>
      )}
    </div>
  );
};
