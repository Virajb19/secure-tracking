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
import { Search } from 'lucide-react';

// Dummy data for paper tracking
const dummyTrackingData: {
  id: string;
  school: string;
  headmasterCS: string;
  csAtTreasury: string;
  custodianToCS: string;
  openingOfPaper: string;
  packingSealing: string;
  deliveryAtPost: string;
}[] = [];

export default function QuestionPaperTrackingPage() {
  const [selectedDate, setSelectedDate] = useState('2026-01-21');
  const [filter, setFilter] = useState('all');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-white">Question Paper Tracking</h1>

      {/* Filters */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex gap-4 items-end mb-6">
          {/* Date Filter */}
          <div className="flex-1">
            <div className="flex items-center gap-2 h-10 px-3 bg-slate-800 border border-slate-700 rounded-md">
              <span className="text-slate-400 text-sm">Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white text-sm border-none outline-none flex-1"
              />
            </div>
          </div>

          {/* All Filter */}
          <div className="flex-1">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="bg-blue-600 hover:bg-blue-700 px-6">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Paper Tracking Summary Table */}
        <div className="overflow-x-auto">
          <div className="text-center py-3 bg-slate-800 rounded-t-lg">
            <h2 className="text-lg font-semibold text-white">
              PAPER TRACKING SUMMARY - {formatDate(selectedDate)}
            </h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Sl. No.</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">School</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Headmaster / CS</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">CS at the Treasury Office / Bank</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Custodian to CS</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Opening of Question Paper</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Packing & Sealing of Answerbooks</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Delivery of packets at Post Offices</th>
              </tr>
            </thead>
            <tbody>
              {dummyTrackingData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No tracking data found for this date
                  </td>
                </tr>
              ) : (
                dummyTrackingData.map((item, index) => (
                  <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="py-4 px-4 text-slate-300">{index + 1}</td>
                    <td className="py-4 px-4 text-blue-400">{item.school}</td>
                    <td className="py-4 px-4 text-slate-300">{item.headmasterCS}</td>
                    <td className="py-4 px-4 text-slate-300">{item.csAtTreasury}</td>
                    <td className="py-4 px-4 text-slate-300">{item.custodianToCS}</td>
                    <td className="py-4 px-4 text-slate-300">{item.openingOfPaper}</td>
                    <td className="py-4 px-4 text-slate-300">{item.packingSealing}</td>
                    <td className="py-4 px-4 text-slate-300">{item.deliveryAtPost}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
