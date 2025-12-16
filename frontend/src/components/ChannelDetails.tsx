import type { Channel } from '../services/api';
import { generateOutreachScript } from '../services/api';

interface ChannelDetailsProps {
  channel: Channel | null;
}

export const ChannelDetails = ({ channel }: ChannelDetailsProps) => {
  if (!channel) return null;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You can add a toast notification here
      alert('Outreach script copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const outreachScript = generateOutreachScript(channel);

  return (
    <div className="bg-white rounded-lg shadow-xl">
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex items-start space-x-4">
            <img 
              src={channel.thumbnail_url} 
              alt={channel.title}
              className="h-16 w-16 rounded-full"
            />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{channel.title}</h2>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-sm text-gray-600">
                  {formatNumber(channel.subscriber_count)} subscribers
                </span>
                <span className="text-sm text-gray-600">
                  {formatNumber(channel.video_count)} videos
                </span>
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  {channel.region}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Channel Stats</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2">
              <div className="border-b border-gray-100 pb-2">
                <dt className="text-sm font-medium text-gray-500">Subscribers</dt>
                <dd className="text-sm text-gray-900">{formatNumber(channel.subscriber_count)}</dd>
              </div>
              <div className="border-b border-gray-100 pb-2">
                <dt className="text-sm font-medium text-gray-500">Total Views</dt>
                <dd className="text-sm text-gray-900">{formatNumber(channel.view_count)}</dd>
              </div>
              <div className="border-b border-gray-100 pb-2">
                <dt className="text-sm font-medium text-gray-500">Videos</dt>
                <dd className="text-sm text-gray-900">{formatNumber(channel.video_count)}</dd>
              </div>
              <div className="border-b border-gray-100 pb-2">
                <dt className="text-sm font-medium text-gray-500">Last Upload</dt>
                <dd className="text-sm text-gray-900">
                  {channel.last_upload_date 
                    ? new Date(channel.last_upload_date).toLocaleDateString()
                    : 'N/A'}
                  {channel.days_since_last_upload && (
                    <span className="text-gray-500 ml-1">
                      ({channel.days_since_last_upload} days ago)
                    </span>
                  )}
                </dd>
              </div>
              <div className="border-b border-gray-100 pb-2">
                <dt className="text-sm font-medium text-gray-500">Match Score</dt>
                <dd className="text-sm text-gray-900">
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${channel.score}%` }}
                      ></div>
                    </div>
                    <span>{Math.round(channel.score)}/100</span>
                  </div>
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Outreach Script</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
                {outreachScript}
              </pre>
              <button
                onClick={() => copyToClipboard(outreachScript)}
                className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <a
            href={channel.channel_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Channel
          </a>
        </div>
      </div>
    </div>
  );
};
