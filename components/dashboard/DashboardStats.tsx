'use client';

import React from 'react';
import { FileText, LayoutDashboard, BarChart3, Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/UI/card';

interface StatItem {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  change?: string;
  loading?: boolean;
}

interface DashboardStatsProps {
  stats?: StatItem[];
  loading?: boolean;
}

const defaultStats: StatItem[] = [
  { title: 'Total Documents', value: '0', icon: FileText, change: '+0%' },
  { title: 'Processed Today', value: '0', icon: LayoutDashboard, change: '+0%' },
  { title: 'Pending Review', value: '0', icon: BarChart3, change: '+0%' },
  { title: 'Alerts', value: '0', icon: Bell, change: '0' },
];

export const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  stats = defaultStats,
  loading = false 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  {loading || stat.loading ? (
                    <div className="h-8 w-20 bg-gray-200 animate-pulse rounded mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  )}
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              {stat.change && (
                <p
                  className={`text-sm mt-2 ${
                    stat.change.startsWith('+')
                      ? 'text-green-600'
                      : stat.change.startsWith('-')
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}
                >
                  {stat.change} from yesterday
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
