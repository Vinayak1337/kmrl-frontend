"use client";

import React, { useState } from 'react';
import { Search, Filter, X, FileText, Clock, Tag } from 'lucide-react';
import { Card, CardContent } from '@/components/UI/card';
import { Input } from '@/components/UI/input';
import { Button } from '@/components/UI/button';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/UI/select';
import { Label } from '@/components/UI/label';
import { Radio } from '@/components/UI/radio';

interface SearchResult {
  id: string;
  title: string;
  summary: string;
  department?: string;
  documentType?: string;
  createdAt?: Date;
  similarity?: number;
  nodeCount?: number;
  tags?: string[];
}

interface DocumentSearchProps {
  onSearch: (query: string, filters?: SearchFilters) => Promise<SearchResult[]>;
  onDocumentClick?: (doc: SearchResult) => void;
}

interface SearchFilters {
  department?: string;
  documentType?: string;
  dateRange?: { start: Date; end: Date };
  searchNodes?: boolean;
}

export const DocumentSearch: React.FC<DocumentSearchProps> = ({
  onSearch,
  onDocumentClick
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() && !Object.keys(filters).length) return;

    setLoading(true);
    setSearched(true);
    try {
      const searchResults = await onSearch(query, filters);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setFilters({});
    setSearched(false);
  };

  return (
    <Card>
      {/* Search Bar */}
      <CardContent className="border-b p-4">
        <form onSubmit={handleSearch} className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents by content, title, or keywords..."
              className="pl-10"
            />
          </div>

          <Button type="button" variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-5 w-5" />
          </Button>

          <Button type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </Button>

          {searched && (
            <Button type="button" variant="ghost" onClick={clearSearch}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </form>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={filters.department || ''}
                  onValueChange={(v) => setFilters({ ...filters, department: v || undefined })}
                  placeholder="All Departments"
                >
                  <SelectTrigger />
                  <SelectContent>
                    <SelectItem value="">All Departments</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Safety">Safety</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Procurement">Procurement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select
                  value={filters.documentType || ''}
                  onValueChange={(v) => setFilters({ ...filters, documentType: v || undefined })}
                  placeholder="All Types"
                >
                  <SelectTrigger />
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="safety_circular">Safety Circular</SelectItem>
                    <SelectItem value="technical_specification">Technical Specification</SelectItem>
                    <SelectItem value="procurement">Procurement</SelectItem>
                    <SelectItem value="hr_policy">HR Policy</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="regulatory">Regulatory</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Search Mode</Label>
                <div className="flex gap-4 items-center">
                  <Radio
                    name="searchMode"
                    checked={!filters.searchNodes}
                    onChange={() => setFilters({ ...filters, searchNodes: false })}
                    label="Documents"
                  />
                  <Radio
                    name="searchMode"
                    checked={filters.searchNodes === true}
                    onChange={() => setFilters({ ...filters, searchNodes: true })}
                    label="Sections"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Results */}
      <CardContent className="p-4">
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-1" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No documents found matching your search.</p>
            <p className="text-sm mt-1">Try different keywords or adjust filters.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </div>
            
            {results.map((result) => (
              <div
                key={result.id}
                onClick={() => onDocumentClick?.(result)}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{result.title}</h3>
                  {result.similarity && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                      {(result.similarity * 100).toFixed(0)}% match
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {result.summary}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {result.department && (
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {result.department}
                    </span>
                  )}
                  {result.documentType && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {result.documentType.replace('_', ' ')}
                    </span>
                  )}
                  {result.nodeCount && (
                    <span>{result.nodeCount} sections</span>
                  )}
                  {result.createdAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(result.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                {result.tags && result.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {result.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && !searched && (
          <div className="text-center py-8 text-gray-400">
            <Search className="h-12 w-12 mx-auto mb-3" />
            <p>Enter keywords to search documents</p>
            <p className="text-sm mt-1">Use filters for more precise results</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
