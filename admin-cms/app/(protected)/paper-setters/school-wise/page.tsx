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

// Dummy data for school-wise records
const dummySchoolRecords = [
  {
    id: '1',
    schoolName: 'Govt. High School, Zuketsa',
    district: 'Phek',
    totalSubmissions: 1,
    accepted: 0,
    pending: 1,
    subjects: 'Science',
  },
  {
    id: '2',
    schoolName: 'Coraggio School, Kohima',
    district: 'Kohima',
    totalSubmissions: 2,
    accepted: 0,
    pending: 2,
    subjects: 'Science',
  },
  {
    id: '3',
    schoolName: "St. Edmund's Hr. Sec. School, Dimapur",
    district: 'Dimapur',
    totalSubmissions: 3,
    accepted: 0,
    pending: 3,
    subjects: 'Mathematics, Science',
  },
  {
    id: '4',
    schoolName: 'Touch of Hope School, Shokhuvi',
    district: 'Chumukedima',
    totalSubmissions: 1,
    accepted: 0,
    pending: 1,
    subjects: 'Mathematics',
  },
  {
    id: '5',
    schoolName: 'Eklavya Model Residential School, Diphupar',
    district: 'Chumukedima',
    totalSubmissions: 1,
    accepted: 0,
    pending: 1,
    subjects: 'Science',
  },
  {
    id: '6',
    schoolName: 'T.M. Govt. Hr. Sec. School, Kohima',
    district: 'Kohima',
    totalSubmissions: 1,
    accepted: 0,
    pending: 1,
    subjects: 'Science',
  },
  {
    id: '7',
    schoolName: 'Dr. Neilhouzhü Kire Govt. Hr. Sec. School, Seikhazou',
    district: 'Kohima',
    totalSubmissions: 1,
    accepted: 0,
    pending: 1,
    subjects: 'Science',
  },
  {
    id: '8',
    schoolName: 'Modern School, Kohima',
    district: 'Kohima',
    totalSubmissions: 1,
    accepted: 0,
    pending: 1,
    subjects: 'Science',
  },
  {
    id: '9',
    schoolName: 'Assisi Hr. Sec. School, Dimapur',
    district: 'Dimapur',
    totalSubmissions: 2,
    accepted: 0,
    pending: 2,
    subjects: 'Mathematics',
  },
  {
    id: '10',
    schoolName: 'Christian Hr.Sec. School, Botsa',
    district: 'Kohima',
    totalSubmissions: 1,
    accepted: 0,
    pending: 1,
    subjects: 'Science',
  },
  {
    id: '11',
    schoolName: 'Govt. High School, Tenyiphe-I',
    district: 'Chumukedima',
    totalSubmissions: 2,
    accepted: 1,
    pending: 1,
    subjects: 'Science, Mathematics',
  },
  {
    id: '12',
    schoolName: 'Stella Hr. Sec. School, Kohima',
    district: 'Kohima',
    totalSubmissions: 1,
    accepted: 0,
    pending: 1,
    subjects: 'Science',
  },
];

export default function SchoolWiseRecordsPage() {
  const [roleFilter, setRoleFilter] = useState('checkers');

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-white">School-Wise Paper Checkers</h1>

      {/* Filters */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex gap-4 items-end mb-6">
          <div className="flex-1">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Paper Checkers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checkers">Paper Checkers</SelectItem>
                <SelectItem value="setters">Paper Setters</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="bg-blue-600 hover:bg-blue-700 px-6">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">School Name</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">District</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Total Submissions</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Accepted</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Pending</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Subjects</th>
              </tr>
            </thead>
            <tbody>
              {dummySchoolRecords.map((record) => (
                <tr key={record.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                  <td className="py-4 px-4 text-blue-400 font-medium">{record.schoolName}</td>
                  <td className="py-4 px-4 text-blue-400">{record.district}</td>
                  <td className="py-4 px-4 text-slate-300">{record.totalSubmissions}</td>
                  <td className="py-4 px-4 text-slate-300">{record.accepted}</td>
                  <td className="py-4 px-4 text-blue-400">{record.pending}</td>
                  <td className="py-4 px-4 text-blue-400">{record.subjects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
