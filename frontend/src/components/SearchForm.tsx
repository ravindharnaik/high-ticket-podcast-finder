import { useState } from 'react';
import type { SearchParams } from '../services/api';

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  isLoading: boolean;
}

const defaultKeywords = [
  'business podcast',
  'entrepreneurship podcast',
  'finance podcast',
  'real estate podcast',
  'saas podcast',
  'coaching podcast',
  'marketing podcast',
];

const defaultRegions = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SG', name: 'Singapore' },
];

export const SearchForm = ({ onSearch, isLoading }: SearchFormProps) => {
  const [keywords, setKeywords] = useState<string[]>(defaultKeywords);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(defaultRegions.map(r => r.code));
  const [minSubscribers, setMinSubscribers] = useState<number>(10000);
  const [maxSubscribers, setMaxSubscribers] = useState<number>(500000);
  const [maxDaysSinceUpload, setMaxDaysSinceUpload] = useState<number>(45);
  const [customKeyword, setCustomKeyword] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      keywords,
      regions: selectedRegions,
      min_subscribers: minSubscribers,
      max_subscribers: maxSubscribers,
      max_days_since_upload: maxDaysSinceUpload,
    });
  };

  const addKeyword = () => {
    if (customKeyword.trim() && !keywords.includes(customKeyword.trim())) {
      setKeywords([...keywords, customKeyword.trim()]);
      setCustomKeyword('');
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    setKeywords(keywords.filter(k => k !== keywordToRemove));
  };

  const toggleRegion = (regionCode: string) => {
    setSelectedRegions(prev =>
      prev.includes(regionCode)
        ? prev.filter(r => r !== regionCode)
        : [...prev, regionCode]
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Search Filters</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Keywords
          </label>
          <div className="flex mb-2">
            <input
              type="text"
              value={customKeyword}
              onChange={(e) => setCustomKeyword(e.target.value)}
              placeholder="Add a custom keyword"
              className="shadow appearance-none border rounded-l py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline flex-grow"
            />
            <button
              type="button"
              onClick={addKeyword}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r focus:outline-none focus:shadow-outline"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() => removeKeyword(keyword)}
                  className="ml-2 text-blue-500 hover:text-blue-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Regions
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {defaultRegions.map((region) => (
              <label key={region.code} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={selectedRegions.includes(region.code)}
                  onChange={() => toggleRegion(region.code)}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="ml-2 text-gray-700">{region.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Subscribers Range
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-1/2">
                <label className="block text-gray-700 text-xs mb-1">Min</label>
                <input
                  type="number"
                  value={minSubscribers}
                  onChange={(e) => setMinSubscribers(Number(e.target.value))}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="w-1/2">
                <label className="block text-gray-700 text-xs mb-1">Max</label>
                <input
                  type="number"
                  value={maxSubscribers}
                  onChange={(e) => setMaxSubscribers(Number(e.target.value))}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Active Within Last (Days)
            </label>
            <input
              type="number"
              value={maxDaysSinceUpload}
              onChange={(e) => setMaxDaysSinceUpload(Number(e.target.value))}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              min="1"
              max="365"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Searching...' : 'Find High-Ticket Podcasts'}
          </button>
        </div>
      </form>
    </div>
  );
};
