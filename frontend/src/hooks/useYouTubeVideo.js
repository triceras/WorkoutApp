// ./frontend/src/hooks/useYouTubeVideo.js

import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axiosInstance';

const fetchYouTubeVideo = async (videoId) => {
  const response = await axiosInstance.get(`/youtube-video/?video_id=${videoId}`);
  return response.data;
};

const useYouTubeVideo = (videoId) => {
  return useQuery(['youtubeVideo', videoId], () => fetchYouTubeVideo(videoId), {
    staleTime: 1000 * 60 * 60, // 1 hour
    cacheTime: 1000 * 60 * 60 * 2, // 2 hours
    enabled: !!videoId, // Only run if videoId exists
  });
};

export default useYouTubeVideo;
