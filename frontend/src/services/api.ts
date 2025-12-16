const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Channel {
  id: string;
  title: string;
  description?: string;
  thumbnail_url: string;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  region: string;
  keywords_matched: string[];
  last_upload_date?: string;
  days_since_last_upload?: number;
  score: number;
  channel_url: string;
  contact_email?: string;
  social_links?: Record<string, string>;
}

export interface SearchParams {
  keywords: string[];
  regions: string[];
  min_subscribers: number;
  max_subscribers: number;
  max_days_since_upload: number;
  max_results?: number;
}

export interface SearchResponse {
  success: boolean;
  data: Channel[];
  total_results: number;
  params: SearchParams;
  timestamp: string;
}

export interface OutreachRequest {
  channel_ids: string[];
  template?: string;
  custom_message?: string;
}

export interface OutreachResponse {
  success: boolean;
  message: string;
  sent_count: number;
  failed_count: number;
  timestamp: string;
}

export const sendOutreach = async (request: OutreachRequest): Promise<OutreachResponse> => {
  try {
    const response = await fetch(`${API_URL}/api/outreach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending outreach:', error);
    throw error;
  }
};

export const searchPodcasts = async (params: SearchParams): Promise<SearchResponse> => {
  try {
    console.log('Making API call to:', `${API_URL}/api/search`);
    console.log('Search params:', params);
    
    const response = await fetch(`${API_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
    return data;
  } catch (error) {
    console.error('Error searching podcasts:', error);
    throw error;
  }
};

export const exportToCSV = async (params: SearchParams): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/api/export/csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    // Create download link
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'podcast_channels.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw error;
  }
};

export const generateOutreachScript = (channel: Channel): string => {
  const { title, subscriber_count, region } = channel;
  
  return `Subject: Professional Podcast Editing for ${title}

Hi [First Name],

I came across your podcast "${title}" and was really impressed by your content! With ${subscriber_count.toLocaleString()} subscribers in the ${region} region, I can see you're serious about delivering quality content.

I specialize in helping podcasters like you save time and elevate their production quality. My services include:
- Professional audio editing and mastering
- Show notes and timestamps
- Social media clips and highlights
- Full episode repurposing

Would you be open to a quick chat about how I can help you streamline your production process?

Best regards,
[Your Name]
[Your Contact Information]`;
};

export const checkHealth = async (): Promise<{ status: string; timestamp: string }> => {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};
