'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Upload, UserPlus, FileText, BarChart3, Bell } from 'lucide-react';
import { Button } from '@/components/UI/button';

// Import modular components
import { DocumentUploadDialog } from '@/components/dashboard/DocumentUploadDialog';
import { DocumentSearch } from '@/components/dashboard/DocumentSearch';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ChatBox } from '@/components/dashboard/ChatBox';

// Import API services
import { 
  uploadDocuments, 
  searchDocuments, 
  getDashboardStats, 
  getRecentDocuments,
  type SearchFilters,
  type DashboardStats as StatsType,
  type DocumentToUpload,
  type SearchResult
} from '@/lib/dashboard-api';

export default function DashboardPage() {
  // State management
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [stats, setStats] = useState<StatsType | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [recentDocuments, setRecentDocuments] = useState<SearchResult[]>([]);
  const [userRole, setUserRole] = useState<'ADMIN' | 'MANAGER' | null>(null);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
    checkUserSession();
  }, []);

  const loadDashboardData = async () => {
    setLoadingStats(true);
    try {
      // Load stats
      const dashboardStats = await getDashboardStats();
      setStats(dashboardStats);

      // Load recent documents
      const recent = await getRecentDocuments(5);
      setRecentDocuments(recent);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const checkUserSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      setUserRole(data.user?.role || null);
    } catch {
      setUserRole(null);
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (documents: DocumentToUpload[]) => {
    await uploadDocuments(documents);
    // Reload stats after upload
    await loadDashboardData();
  };

  // Handle document search
  const handleDocumentSearch = async (query: string, filters?: SearchFilters) => {
    return await searchDocuments(query, filters);
  };

  // Handle document click from search - navigate to document detail
  const handleDocumentClick = (doc: SearchResult) => {
    // Open document in new tab with the document ID
    if (doc.id) {
      window.open(`/dashboard/${doc.id}`, '_blank');
    }
  };

  // Prepare stats for display - all from real data
  const statsData = stats ? [
    { 
      title: 'Total Documents', 
      value: stats.totalDocuments.toString(), 
      icon: FileText, 
      change: '' // No fake percentages
    },
    { 
      title: 'Total Nodes', 
      value: stats.nodesCount.toString(), 
      icon: BarChart3, 
      change: 'Linked sections' 
    },
    { 
      title: 'Processed Today', 
      value: stats.processedToday.toString(), 
      icon: Bell, 
      change: stats.processedToday > 0 ? 'New today' : 'None today' 
    },
  ] : undefined;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              KMRL Document Intelligence Dashboard
            </h1>
            <div className="flex gap-3">
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-5 w-5 mr-2" />
                Upload Documents
              </Button>
              <Link href="/dashboard/documents" className="inline-flex items-center">
                <Button variant="outline">
                  <FileText className="h-5 w-5 mr-2" />
                  All Documents
                </Button>
              </Link>
              
              {userRole === 'ADMIN' && (
                <Link href="/dashboard/users" className="inline-flex items-center">
                  <Button variant="outline">
                    <UserPlus className="h-5 w-5 mr-2" />
                    Manage Users
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
          <DashboardStats stats={statsData} loading={loadingStats} />
        </div>

        {/* Search Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Documents</h2>
          <DocumentSearch 
            onSearch={handleDocumentSearch}
            onDocumentClick={handleDocumentClick}
          />
        </div>

        {/* Recent Documents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Documents</h2>
            <div className="bg-white rounded-lg shadow-sm p-4">
              {recentDocuments.length > 0 ? (
                <div className="space-y-3">
                  {recentDocuments.map((doc, index) => (
                    <div key={doc.id || index} className="border-b last:border-0 pb-3 last:pb-0">
                      <h3 className="font-medium text-gray-900">{doc.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{doc.summary}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {doc.department && <span>{doc.department}</span>}
                        {doc.nodeCount && <span>{doc.nodeCount} sections</span>}
                        {doc.createdAt && (
                          <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No documents uploaded yet</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">AI Processing</span>
                  <span className="text-sm font-medium text-green-600">Active</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Search Mode</span>
                  <span className="text-sm font-medium text-green-600">Keyword</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">MongoDB</span>
                  <span className="text-sm font-medium text-green-600">Connected</span>
                </div>
                
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <Link 
                  href="/api/status" 
                  target="_blank"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View Full System Status →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Assistant */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ask the Corpus</h2>
          <ChatBox />
        </div>
      </div>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onUpload={handleDocumentUpload}
      />
    </div>
  );
}
