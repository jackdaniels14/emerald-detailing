'use client';

import { useState } from 'react';

export default function SchedulePage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [view, setView] = useState<'week' | 'day'>('week');

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM to 6 PM

  // Demo schedule data
  const scheduleData = [
    { day: 1, hour: 10, employee: 'Alex M.', client: 'John Smith', service: 'Full Detail', duration: 3 },
    { day: 1, hour: 14, employee: 'Jordan T.', client: 'Sarah J.', service: 'Interior', duration: 2 },
    { day: 2, hour: 9, employee: 'Alex M.', client: 'Mike W.', service: 'Exterior', duration: 2 },
    { day: 3, hour: 11, employee: 'Casey W.', client: 'Emily B.', service: 'Full Detail', duration: 4 },
    { day: 4, hour: 8, employee: 'Jordan T.', client: 'David L.', service: 'Interior', duration: 2 },
    { day: 5, hour: 13, employee: 'Alex M.', client: 'Lisa K.', service: 'Premium Full', duration: 5 },
  ];

  const getWeekDates = () => {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  };

  const weekDates = getWeekDates();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-500 mt-1">Manage appointments and employee schedules</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('day')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'day' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'week' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const newDate = new Date(currentWeek);
              newDate.setDate(newDate.getDate() - 7);
              setCurrentWeek(newDate);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {weekDates[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <p className="text-sm text-gray-500">
              {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
              {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => {
              const newDate = new Date(currentWeek);
              newDate.setDate(newDate.getDate() + 7);
              setCurrentWeek(newDate);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header row with days */}
            <div className="grid grid-cols-8 border-b border-gray-200">
              <div className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50">
                Time
              </div>
              {weekDates.map((date, index) => (
                <div
                  key={index}
                  className={`p-3 text-center border-l border-gray-200 ${
                    date.toDateString() === new Date().toDateString() ? 'bg-emerald-50' : 'bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-500">{days[index]}</p>
                  <p className={`text-lg font-semibold ${
                    date.toDateString() === new Date().toDateString() ? 'text-emerald-600' : 'text-gray-900'
                  }`}>
                    {date.getDate()}
                  </p>
                </div>
              ))}
            </div>

            {/* Time slots */}
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
                <div className="p-3 text-center text-sm text-gray-500 bg-gray-50 border-r border-gray-200">
                  {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                </div>
                {weekDates.map((date, dayIndex) => {
                  const appointment = scheduleData.find(
                    (s) => s.day === dayIndex && s.hour === hour
                  );
                  return (
                    <div
                      key={dayIndex}
                      className="p-1 border-l border-gray-100 min-h-[60px] relative"
                    >
                      {appointment && (
                        <div
                          className="absolute inset-x-1 bg-emerald-100 border-l-4 border-emerald-500 rounded p-2 text-xs overflow-hidden"
                          style={{ height: `${appointment.duration * 60 - 8}px` }}
                        >
                          <p className="font-semibold text-emerald-800 truncate">{appointment.client}</p>
                          <p className="text-emerald-600 truncate">{appointment.service}</p>
                          <p className="text-emerald-500 truncate">{appointment.employee}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Employees</h3>
        <div className="flex flex-wrap gap-4">
          {['Alex M.', 'Jordan T.', 'Casey W.'].map((employee, index) => (
            <div key={index} className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                index === 0 ? 'bg-emerald-500' : index === 1 ? 'bg-blue-500' : 'bg-purple-500'
              }`} />
              <span className="text-sm text-gray-600">{employee}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
