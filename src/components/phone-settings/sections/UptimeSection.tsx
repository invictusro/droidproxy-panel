import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import type { UptimeData } from '../types';
import { getLocalDateString } from '../utils';

interface Props {
  uptimeData: UptimeData | null;
  uptimePrevDayData: UptimeData | null;
  loadingUsage: boolean;
  uptimeSelectedDate: string;
  onNavigateDate: (direction: 'prev' | 'next') => void;
  onDateChange: (date: string) => void;
}

export default function UptimeSection({
  uptimeData,
  uptimePrevDayData,
  loadingUsage,
  uptimeSelectedDate,
  onNavigateDate,
  onDateChange,
}: Props) {
  // Generate 5-minute intervals for uptime display
  const get5MinIntervals = () => {
    const intervals: { time: string; status: 'online' | 'offline' | 'nodata' }[] = [];
    // Get timezone offset to convert backend UTC hours to local hours
    const offsetHours = -new Date().getTimezoneOffset() / 60;

    if (uptimeData?.hourly || uptimePrevDayData?.hourly) {
      for (let localHour = 0; localHour < 24; localHour++) {
        // Convert local hour to UTC to match backend data
        const utcHour = (localHour - offsetHours + 24) % 24;

        // Determine if this UTC hour is from the previous day
        // If local hour < offset, the UTC hour wraps to previous day
        const isFromPreviousDay = offsetHours > 0 && localHour < offsetHours;

        // Look in the correct day's data
        const dataSource = isFromPreviousDay ? uptimePrevDayData : uptimeData;
        const hourData = dataSource?.hourly?.find(h => h.hour === utcHour);

        for (let min = 0; min < 60; min += 5) {
          const timeStr = `${String(localHour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
          if (!hourData || hourData.uptime === 0) {
            // No data or 0 uptime means we don't have tracking info - show as no data
            intervals.push({ time: timeStr, status: 'nodata' });
          } else {
            // Any uptime > 0 means we have data showing the phone was online (at least partially)
            intervals.push({ time: timeStr, status: 'online' });
          }
        }
      }
    } else {
      for (let hour = 0; hour < 24; hour++) {
        for (let min = 0; min < 60; min += 5) {
          intervals.push({ time: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`, status: 'nodata' });
        }
      }
    }
    return intervals;
  };

  const today = getLocalDateString();

  return (
    <div>
      <h3 className="text-lg font-semibold text-zinc-900 mb-4">Uptime</h3>

      {/* Date Picker */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => onNavigateDate('prev')} className="p-2 hover:bg-zinc-100 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <input type="date" value={uptimeSelectedDate} onChange={(e) => onDateChange(e.target.value)} max={today} className="px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
        </div>
        <button onClick={() => onNavigateDate('next')} disabled={uptimeSelectedDate >= today} className="p-2 hover:bg-zinc-100 rounded-lg disabled:opacity-50"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {loadingUsage ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-zinc-700">{new Date(uptimeSelectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500"></span> Online</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500"></span> Offline</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-zinc-200"></span> No data</span>
            </div>
          </div>

          {/* 5-minute intervals grid: 24 columns (hours) x 12 rows (5-min blocks) */}
          <div className="space-y-1">
            {Array.from({ length: 12 }, (_, row) => (
              <div key={row} className="flex gap-0.5">
                <span className="w-8 text-[8px] text-zinc-400 text-right pr-1">{String(row * 5).padStart(2, '0')}m</span>
                {Array.from({ length: 24 }, (_, hour) => {
                  const intervals = get5MinIntervals();
                  const idx = hour * 12 + row;
                  const interval = intervals[idx];
                  return (
                    <div
                      key={hour}
                      className={`flex-1 h-4 rounded-sm transition-colors ${
                        interval?.status === 'online' ? 'bg-emerald-500' :
                        interval?.status === 'offline' ? 'bg-red-500' : 'bg-zinc-200'
                      }`}
                      title={`${interval?.time}: ${interval?.status}`}
                    />
                  );
                })}
              </div>
            ))}
            <div className="flex gap-0.5 mt-2">
              <span className="w-8"></span>
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex-1 text-[8px] text-zinc-400 text-center">{String(h).padStart(2, '0')}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
