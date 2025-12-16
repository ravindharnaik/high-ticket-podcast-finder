import { useState } from 'react';
import { SearchForm } from './components/SearchForm';
import { ResultsTable } from './components/ResultsTable';
import { ChannelDetails } from './components/ChannelDetails';
import { QuotaStatus } from './components/QuotaStatus';
import { searchPodcasts, exportToCSV, sendOutreach, type Channel, type SearchParams, type SearchResponse } from './services/api';

function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [showChannelView, setShowChannelView] = useState(false);

  const handleSearch = async (params: SearchParams) => {
    try {
      setIsLoading(true);
      setSearchParams(params);
      const results: SearchResponse = await searchPodcasts(params);
      setChannels(results.data);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Failed to search for podcasts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowClick = (channel: Channel) => {
    console.log('Channel clicked:', channel);
    setSelectedChannel(channel);
    setShowChannelView(true);
  };

  const handleExport = async () => {
    if (!searchParams) return;
    
    try {
      setIsLoading(true);
      await exportToCSV(searchParams);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseChannelView = () => {
    setShowChannelView(false);
    setSelectedChannel(null);
  };

  const handleBulkOutreach = async (channelIds: string[]) => {
    try {
      setIsLoading(true);
      const response = await sendOutreach({ channel_ids: channelIds });
      
      if (response.success) {
        alert(`Outreach sent successfully! Sent: ${response.sent_count}, Failed: ${response.failed_count}`);
      } else {
        alert(`Outreach failed: ${response.message}`);
      }
    } catch (error) {
      console.error('Outreach failed:', error);
      alert('Failed to send outreach. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">High-Ticket Podcast Client Finder</h1>
              <p className="mt-1 text-sm text-gray-500">
                Find podcast channels that can afford premium editing services ($1,500–$10,000/month)
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {showChannelView && selectedChannel ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleCloseChannelView}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  ← Back to Results
                </button>
              </div>
              <ChannelDetails 
                channel={selectedChannel} 
              />
            </div>
          ) : (
            <div className="space-y-6">
              <QuotaStatus />
              <SearchForm onSearch={handleSearch} isLoading={isLoading} />
              <ResultsTable 
                channels={channels} 
                onRowClick={handleRowClick} 
                isLoading={isLoading && channels.length === 0}
                onExport={handleExport}
                onBulkOutreach={handleBulkOutreach}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 overflow-hidden sm:px-6 lg:px-8">
          <p className="text-center text-base text-gray-500">
            &copy; {new Date().getFullYear()} High-Ticket Podcast Client Finder. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
