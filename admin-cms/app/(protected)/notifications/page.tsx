'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Trash2 } from 'lucide-react';

// Dummy data for notifications
const dummyNotifications = [
  {
    id: '1',
    fullName: 'kieca',
    message: 'Training on NBSE Connect App',
    school: 'Dummy School (For Testing Purposes) - Chumukedima',
    date: '21st January, 2026',
    fileUrl: '#',
  },
  {
    id: '2',
    fullName: 'Ruchu',
    message: 'Training on NBSE Connect App',
    school: 'Dummy School (For Testing Purposes) - Chumukedima',
    date: '21st January, 2026',
    fileUrl: '#',
  },
  {
    id: '3',
    fullName: 'akhrie',
    message: 'Training on NBSE Connect App',
    school: 'Dummy School (For Testing Purposes) - Chumukedima',
    date: '21st January, 2026',
    fileUrl: '#',
  },
  {
    id: '4',
    fullName: 'Araile',
    message: 'Training on NBSE Connect App',
    school: 'Dummy School (For Testing Purposes) - Chumukedima',
    date: '21st January, 2026',
    fileUrl: '#',
  },
  {
    id: '5',
    fullName: 'Siduniu Rentta',
    message: 'Training on NBSE Connect App',
    school: 'Dummy School (For Testing Purposes) - Chumukedima',
    date: '21st January, 2026',
    fileUrl: '#',
  },
  {
    id: '6',
    fullName: 'Dziesevolie Tsurho',
    message: 'Training on NBSE Connect App',
    school: 'Dummy School (For Testing Purposes) - Chumukedima',
    date: '21st January, 2026',
    fileUrl: '#',
  },
  {
    id: '7',
    fullName: 'thungdemo',
    message: 'Training on NBSE Connect App',
    school: 'Dummy School (For Testing Purposes) - Chumukedima',
    date: '21st January, 2026',
    fileUrl: '#',
  },
  {
    id: '8',
    fullName: 'Akumla Longchar',
    message: 'Training on NBSE Connect App',
    school: 'Govt. High School - Mokokchung',
    date: '20th January, 2026',
    fileUrl: '#',
  },
];

const notificationTypes = [
  'Training on NBSE Connect App',
  'System Update Notification',
  'Exam Schedule Alert',
  'Holiday Announcement',
];

export default function NotificationsPage() {
  const [selectedType, setSelectedType] = useState('Training on NBSE Connect App');
  const [notifications, setNotifications] = useState(dummyNotifications);

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const handleViewFile = (fileUrl: string) => {
    console.log('Viewing file:', fileUrl);
    // Open file in new tab or modal
  };

  const filteredNotifications = notifications.filter(
    (n) => n.message === selectedType
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-white">General Notifications</h1>

      {/* Filters Card */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        {/* Filter Row */}
        <div className="flex gap-4 items-end mb-6">
          <div className="flex-1">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Select notification type" />
              </SelectTrigger>
              <SelectContent>
                {notificationTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="bg-blue-600 hover:bg-blue-700 px-6">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Notifications Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Sl No.</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Full Name</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Message</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">School</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Date</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotifications.map((notification, index) => (
                <tr key={notification.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                  <td className="py-4 px-4 text-slate-300">{index + 1}</td>
                  <td className="py-4 px-4 text-blue-400 font-medium">{notification.fullName}</td>
                  <td className="py-4 px-4 text-slate-300">{notification.message}</td>
                  <td className="py-4 px-4 text-blue-400">{notification.school}</td>
                  <td className="py-4 px-4 text-slate-300">{notification.date}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewFile(notification.fileUrl)}
                        className="text-emerald-400 border-emerald-400 hover:bg-emerald-400/10"
                      >
                        View File
                      </Button>
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
