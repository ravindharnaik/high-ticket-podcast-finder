import React from 'react';
import type { Channel } from '../services/api';

interface ResultsTableProps {
  channels: Channel[];
  onRowClick: (channel: Channel) => void;
  isLoading: boolean;
  onExport: () => void;
  onBulkOutreach: (channelIds: string[]) => void;
}

export const ResultsTable = ({ channels, onRowClick, isLoading, onExport, onBulkOutreach }: ResultsTableProps) => {
  const [selectedChannels, setSelectedChannels] = React.useState<Set<string>>(new Set());

  const handleChannelClick = (channelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Open in new tab but force web browser (not app)
    const webUrl = `https://www.youtube.com/channel/${channelId}`;
    window.open(webUrl, '_blank');
  };

  const handleCheckboxChange = (channelId: string, checked: boolean) => {
    const newSelected = new Set(selectedChannels);
    if (checked) {
      newSelected.add(channelId);
    } else {
      newSelected.delete(channelId);
    }
    setSelectedChannels(newSelected);
  };

  const handleBulkOutreach = () => {
    if (selectedChannels.size > 0) {
      onBulkOutreach(Array.from(selectedChannels));
    }
  };
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <p className="text-gray-500">No results found. Try adjusting your search criteria.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-gray-900">
            Found {channels.length} channels
          </h3>
          {selectedChannels.size > 0 && (
            <button
              onClick={handleBulkOutreach}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Send Outreach ({selectedChannels.size})
            </button>
          )}
        </div>
        <button
          onClick={onExport}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Export to CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedChannels(new Set(channels.map(c => c.id)));
                    } else {
                      setSelectedChannels(new Set());
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Channel
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subscribers
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Region
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Upload
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Channel Link
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {channels.map((channel) => (
              <tr 
                key={channel.id} 
                onClick={() => onRowClick(channel)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedChannels.has(channel.id)}
                    onChange={(e) => handleCheckboxChange(channel.id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <img 
                        className="h-10 w-10 rounded-full" 
                        src={channel.thumbnail_url} 
                        alt={channel.title} 
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{channel.title}</div>
                      <div className="text-sm text-gray-500">
                        {channel.keywords_matched.join(', ')}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Intl.NumberFormat().format(channel.subscriber_count)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {channel.region}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {channel.last_upload_date 
                    ? new Date(channel.last_upload_date).toLocaleDateString()
                    : 'N/A'}
                  {channel.days_since_last_upload && (
                    <span className="text-gray-400 ml-1">
                      ({channel.days_since_last_upload} days ago)
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${channel.score}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round(channel.score)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={(e) => handleChannelClick(channel.id, e)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Channel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
