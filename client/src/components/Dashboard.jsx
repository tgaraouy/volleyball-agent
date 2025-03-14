import React, { useState } from 'react';
import InterestForm from './forms/InterestForm';
import TryoutEvaluationForm from './forms/TryoutEvaluationForm';
import DrillsSection from './DrillsSection';
import { 
  UserGroupIcon, 
  CalendarIcon, 
  BellIcon,
  ChartBarIcon,
  UserPlusIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

const StatCard = ({ stat }) => {
  const colorClasses = {
    indigo: {
      bar: 'bg-indigo-500',
      bg: 'bg-indigo-50',
      text: 'text-indigo-600'
    },
    emerald: {
      bar: 'bg-emerald-500',
      bg: 'bg-emerald-50',
      text: 'text-emerald-600'
    },
    violet: {
      bar: 'bg-violet-500',
      bg: 'bg-violet-50',
      text: 'text-violet-600'
    },
    blue: {
      bar: 'bg-blue-500',
      bg: 'bg-blue-50',
      text: 'text-blue-600'
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100">
      <div className={`h-1 w-full ${colorClasses[stat.color].bar}`} />
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-500">{stat.name}</h3>
            <div className="mt-2 flex items-baseline space-x-2">
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <span className={`text-sm font-medium ${
                stat.changeType === 'increase' 
                  ? 'text-emerald-600' 
                  : 'text-gray-500'
              }`}>
                {stat.change}
              </span>
            </div>
          </div>
          <div className={`rounded-full p-3 ${colorClasses[stat.color].bg}`}>
            <stat.icon className={`h-6 w-6 ${colorClasses[stat.color].text}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityItem = ({ activity }) => {
  const colorClasses = {
    indigo: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600'
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600'
    }
  };

  return (
    <div className="flex items-start space-x-4">
      <div className={`flex-shrink-0 rounded-full p-3 ${colorClasses[activity.color].bg}`}>
        <activity.icon className={`h-5 w-5 ${colorClasses[activity.color].text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{activity.title}</p>
        <p className="text-sm text-gray-600 truncate">{activity.name} - {activity.detail}</p>
        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
      </div>
    </div>
  );
};

const EventCard = ({ event }) => (
  <div className="flex items-start space-x-4">
    <div className="flex-shrink-0 w-14 h-14 bg-indigo-50 rounded-lg flex flex-col items-center justify-center">
      <p className="text-lg font-bold text-indigo-600">{event.date.day}</p>
      <p className="text-xs font-medium text-indigo-500">{event.date.month}</p>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
      <p className="text-sm text-gray-600 truncate">{event.time}</p>
      <p className="text-xs text-gray-500 mt-1">{event.location}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const stats = [
    {
      name: 'Total Interest Forms',
      value: '24',
      change: '+4',
      changeType: 'increase',
      icon: UserGroupIcon,
      color: 'indigo'
    },
    {
      name: 'Upcoming Tryouts',
      value: '2',
      change: 'Next: Aug 24',
      changeType: 'neutral',
      icon: CalendarIcon,
      color: 'emerald'
    },
    {
      name: 'Newsletter Subscribers',
      value: '156',
      change: '+12',
      changeType: 'increase',
      icon: BellIcon,
      color: 'violet'
    },
    {
      name: 'Program Growth',
      value: '32%',
      change: '+2.5%',
      changeType: 'increase',
      icon: ChartBarIcon,
      color: 'blue'
    }
  ];

  const recentActivity = [
    {
      type: 'interest',
      title: 'New Interest Form',
      name: 'Sarah Johnson',
      detail: 'Grade 8',
      time: '2 hours ago',
      icon: UserPlusIcon,
      color: 'indigo'
    },
    {
      type: 'evaluation',
      title: 'Tryout Evaluation',
      name: 'Mike Smith',
      detail: 'Varsity',
      time: '5 hours ago',
      icon: ClipboardDocumentCheckIcon,
      color: 'emerald'
    }
  ];

  const upcomingEvents = [
    {
      date: { day: '24', month: 'AUG' },
      title: 'Middle School Tryouts',
      time: '9:00 AM',
      location: 'Main Gym'
    },
    {
      date: { day: '25', month: 'AUG' },
      title: 'High School Tryouts',
      time: '9:00 AM',
      location: 'Main Gym'
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'interest':
        return <InterestForm />;
      case 'tryouts':
        return <TryoutEvaluationForm playerId="test" evaluatorId="test" />;
      case 'drills':
        return <DrillsSection />;
      case 'overview':
      default:
        return (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat) => (
                <StatCard key={stat.name} stat={stat} />
              ))}
            </div>

            {/* Three Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h2>
                <div className="space-y-6">
                  {recentActivity.map((activity, index) => (
                    <ActivityItem key={index} activity={activity} />
                  ))}
                </div>
              </div>

              {/* Upcoming Events */}
              <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Upcoming Events</h2>
                <div className="space-y-6">
                  {upcomingEvents.map((event, index) => (
                    <EventCard key={index} event={event} />
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h2>
                <div className="space-y-4">
                  <button
                    onClick={() => setActiveTab('interest')}
                    className="w-full flex items-center space-x-3 p-4 rounded-lg text-left transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 bg-indigo-50 hover:bg-indigo-100 focus:ring-indigo-500"
                  >
                    <div className="flex-shrink-0 rounded-full p-2 bg-indigo-100">
                      <UserPlusIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-indigo-900">New Interest Form</p>
                      <p className="text-sm text-indigo-600">Register new player</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('tryouts')}
                    className="w-full flex items-center space-x-3 p-4 rounded-lg text-left transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 bg-emerald-50 hover:bg-emerald-100 focus:ring-emerald-500"
                  >
                    <div className="flex-shrink-0 rounded-full p-2 bg-emerald-100">
                      <ClipboardDocumentCheckIcon className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-900">Tryout Evaluation</p>
                      <p className="text-sm text-emerald-600">Evaluate player</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <h1 className="text-2xl font-bold text-gray-900">Volleyball Program Dashboard</h1>
            <nav className="flex space-x-2">
              {['overview', 'interest', 'tryouts', 'drills'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard; 