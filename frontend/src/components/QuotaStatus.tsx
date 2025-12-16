import { useState, useEffect } from 'react';

interface QuotaAlert {
  level: 'warning' | 'error' | 'critical';
  message: string;
}

interface QuotaStatus {
  daily_quota: number;
  daily_used: number;
  remaining: number;
  remaining_percent: number;
  requests_today: number;
  errors_403: number;
  resets_in_hours: number;
  last_reset_date: string;
}

interface QuotaResponse {
  quota: QuotaStatus;
  alerts: QuotaAlert[];
  using_fallback: boolean;
}

export const QuotaStatus = () => {
  const [quotaData, setQuotaData] = useState<QuotaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotaStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/quota/status');
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      setQuotaData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quota status');
    } finally {
      setLoading(false);
    }
  };

  const resetQuotaTracking = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/quota/reset', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      await fetchQuotaStatus(); // Refresh status after reset
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset quota tracking');
    }
  };

  useEffect(() => {
    fetchQuotaStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchQuotaStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">API Quota Status</h3>
        <div className="animate-pulse">Loading quota information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">API Quota Status</h3>
        <div className="text-red-600">Error: {error}</div>
        <button
          onClick={fetchQuotaStatus}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!quotaData) return null;

  const { quota, alerts, using_fallback } = quotaData;

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 border-red-400 text-red-700';
      case 'error': return 'bg-orange-100 border-orange-400 text-orange-700';
      case 'warning': return 'bg-yellow-100 border-yellow-400 text-yellow-700';
      default: return 'bg-gray-100 border-gray-400 text-gray-700';
    }
  };

  const getProgressBarColor = (percent: number) => {
    if (percent < 20) return 'bg-red-500';
    if (percent < 50) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">API Quota Status</h3>
        <div className="flex gap-2">
          {using_fallback && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
              Using Fallback Data
            </span>
          )}
          <button
            onClick={fetchQuotaStatus}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Refresh
          </button>
          <button
            onClick={resetQuotaTracking}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
          >
            Reset Tracking
          </button>
        </div>
      </div>

      {/* Quota Usage Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Quota Usage</span>
          <span>{quota.remaining_percent.toFixed(1)}% remaining</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all duration-300 ${getProgressBarColor(quota.remaining_percent)}`}
            style={{ width: `${quota.remaining_percent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{quota.daily_used.toLocaleString()} used</span>
          <span>{quota.daily_quota.toLocaleString()} total</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{quota.requests_today}</div>
          <div className="text-sm text-gray-600">Requests Today</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{quota.remaining.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Quota Remaining</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{quota.errors_403}</div>
          <div className="text-sm text-gray-600">API Errors</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{quota.resets_in_hours.toFixed(1)}</div>
          <div className="text-sm text-gray-600">Hours to Reset</div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-700">Alerts</h4>
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`border-l-4 p-3 rounded ${getAlertColor(alert.level)}`}
            >
              <div className="font-medium capitalize">{alert.level}</div>
              <div className="text-sm">{alert.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-4 text-xs text-gray-500">
        <div>Last reset: {new Date(quota.last_reset_date).toLocaleDateString()}</div>
        <div>YouTube API quota resets daily at midnight Pacific Time</div>
      </div>
    </div>
  );
};
