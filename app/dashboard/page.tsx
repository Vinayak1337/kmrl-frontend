import { LayoutDashboard, FileText, Settings, BarChart3, Bell, Search } from 'lucide-react';

export default function DashboardPage() {
  const stats = [
    { title: 'Total Documents', value: '1,234', icon: FileText, change: '+12%' },
    { title: 'Translations', value: '456', icon: LayoutDashboard, change: '+23%' },
    { title: 'API Calls', value: '8,901', icon: BarChart3, change: '+8%' },
    { title: 'Active Users', value: '123', icon: Bell, change: '+5%' },
  ];

  const recentActivity = [
    { id: 1, action: 'Document uploaded', time: '2 minutes ago', status: 'success' },
    { id: 2, action: 'Translation completed', time: '5 minutes ago', status: 'success' },
    { id: 3, action: 'API limit warning', time: '1 hour ago', status: 'warning' },
    { id: 4, action: 'New user registered', time: '2 hours ago', status: 'info' },
    { id: 5, action: 'System update', time: '3 hours ago', status: 'info' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back! Here&apos;s what&apos;s happening with your platform.</p>
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
                <button className="w-full text-left px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
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

        {/* AI Chat Preview */}
        <div className="mt-8">
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
      </div>
    </div>
  );
}
