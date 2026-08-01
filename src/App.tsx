import React, { useState } from 'react';
import { Student, AttendanceRecord } from './types';
import { initialStudents } from './studentsData';

export function App() {
  const [students] = useState<Student[]>(initialStudents);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // 1. បន្ថែម State សម្រាប់រក្សាទុកវេន (morning / afternoon)
  const [selectedShift, setSelectedShift] = useState<'morning' | 'afternoon'>('morning');
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  // 2. Filter យកកំណត់ត្រាវត្តមានទៅតាម Date និង Shift ដែលបានជ្រើសរើស
  const currentRecords = records.filter(
    (r) => r.date === selectedDate && r.shift === selectedShift
  );

  // 3. Logic សម្រាប់រក្សាទុក/អាប់ដេត វត្តមានសិស្សតាម Date & Shift
  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'permission') => {
    setRecords((prev) => {
      const existingIndex = prev.findIndex(
        (r) => r.studentId === studentId && r.date === selectedDate && r.shift === selectedShift
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], status };
        return updated;
      } else {
        return [
          ...prev,
          {
            studentId,
            date: selectedDate,
            shift: selectedShift, // រក្សាទុក shift
            status,
          },
        ];
      }
    });
  };

  // Filter បញ្ជីឈ្មោះសិស្សតាមការ Search
  const filteredStudents = students.filter(
    (s) =>
      s.name.includes(searchTerm) ||
      (s.latinName && s.latinName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // រាប់ចំនួនសរុបតាម Status
  const totalStudents = students.length;
  const presentCount = currentRecords.filter((r) => r.status === 'present').length;
  const absentCount = currentRecords.filter((r) => r.status === 'absent').length;
  const lateCount = currentRecords.filter((r) => r.status === 'late').length;
  const permissionCount = currentRecords.filter((r) => r.status === 'permission').length;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Control Panel: កាលបរិច្ឆេទ & វេន (Shift) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Input កាលបរិច្ឆេទ */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600">កាលបរិច្ឆេទសន្លឹកវត្តមាន៖</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Dropdown ជ្រើសរើសវេន (Shift) */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600">វេន <span className="text-red-500">*</span></label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value as 'morning' | 'afternoon')}
                className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="morning">វេនព្រឹក (7:00–11:00)</option>
                <option value="afternoon">វេនរសៀល (1:00–4:00)</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="text-emerald-600 font-medium hover:underline text-sm"
          >
            យកថ្ងៃនេះ
          </button>
        </div>

        {/* Dashboard Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
            <div className="text-2xl font-bold text-slate-800">{totalStudents}</div>
            <div className="text-xs text-slate-500">សរុប</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
            <div className="text-2xl font-bold text-emerald-600">{presentCount}</div>
            <div className="text-xs text-slate-500">វត្តមាន</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
            <div className="text-2xl font-bold text-red-500">{absentCount}</div>
            <div className="text-xs text-slate-500">អវត្តមាន</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
            <div className="text-2xl font-bold text-amber-500">{lateCount}</div>
            <div className="text-xs text-slate-500">យឺត</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
            <div className="text-2xl font-bold text-blue-500">{permissionCount}</div>
            <div className="text-xs text-slate-500">ច្បាប់</div>
          </div>
        </div>

        {/* Search Bar & List Header */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-800">
              ស្ថានភាពវត្តមានប្រចាំថ្ងៃ ({filteredStudents.length})
            </h2>
            <input
              type="text"
              placeholder="ស្វែងរកឈ្មោះសិស្ស..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Student List */}
          <div className="space-y-3">
            {filteredStudents.map((student, idx) => {
              const record = currentRecords.find((r) => r.studentId === student.id);
              const status = record?.status;

              return (
                <div
                  key={student.id}
                  className="p-4 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-4 hover:border-slate-300 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        {student.name}
                        {student.gender === 'F' && (
                          <span className="text-[10px] bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded">ស្រី</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {student.latinName && `Telegram: ${student.latinName}`}
                      </div>
                    </div>
                  </div>

                  {/* Actions/Status Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStatusChange(student.id, 'present')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        status === 'present'
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      ✓ វត្តមាន
                    </button>
                    <button
                      onClick={() => handleStatusChange(student.id, 'absent')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        status === 'absent'
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      ✕ អវត្តមាន
                    </button>
                    <button
                      onClick={() => handleStatusChange(student.id, 'late')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        status === 'late'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      🕒 យឺត
                    </button>
                    <button
                      onClick={() => handleStatusChange(student.id, 'permission')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        status === 'permission'
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      📅 ច្បាប់
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
