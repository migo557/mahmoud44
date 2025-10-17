/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, {useRef, useState} from 'react';
import {EditVideoPage} from './components/EditVideoPage';
import {ErrorModal} from './components/ErrorModal';
import {
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  VideoCameraIcon,
} from './components/icons';
import {SavingProgressPage} from './components/SavingProgressPage';
import {VideoGrid} from './components/VideoGrid';
import {VideoPlayer} from './components/VideoPlayer';
import {MOCK_VIDEOS} from './constants';
import {ErrorDetails, Video} from './types';

import {GeneratedVideo, GoogleGenAI} from '@google/genai';

const VEO_MODEL_NAME = 'veo-3.0-fast-generate-001';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

// ---

function bloblToBase64(blob: Blob) {
  return new Promise<string>(async (resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      resolve(url.split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });
}

// ---

async function generateVideoFromText(
  prompt: string,
  numberOfVideos = 1,
  aspectRatio: '16:9' | '9:16' | '1:1' = '16:9',
): Promise<string[]> {
  let operation = await ai.models.generateVideos({
    model: VEO_MODEL_NAME,
    prompt,
    config: {
      numberOfVideos,
      aspectRatio,
    },
  });

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    console.log('...Generating...');
    operation = await ai.operations.getVideosOperation({operation});
  }

  if (operation?.response) {
    const videos = operation.response?.generatedVideos;
    if (videos === undefined || videos.length === 0) {
      throw new Error('No videos generated');
    }

    return await Promise.all(
      videos.map(async (generatedVideo: GeneratedVideo) => {
        const url = decodeURIComponent(generatedVideo.video.uri);
        const res = await fetch(`${url}&key=${process.env.API_KEY}`);
        if (!res.ok) {
          throw new Error(
            `Failed to fetch video: ${res.status} ${res.statusText}`,
          );
        }
        const blob = await res.blob();
        return bloblToBase64(blob);
      }),
    );
  } else {
    throw new Error('No videos generated');
  }
}

/**
 * Main component for the Veo3 Gallery app.
 * It manages the state of videos, playing videos, editing videos and error handling.
 */
export const App: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>(MOCK_VIDEOS);
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [generationError, setGenerationError] = useState<ErrorDetails | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const videoUrl = URL.createObjectURL(file);
    const newVideo: Video = {
      id: self.crypto.randomUUID(),
      title: file.name.replace(/\.[^/.]+$/, ''), // Use filename as title
      description: 'A user-uploaded video.',
      videoUrl,
    };

    setVideos((currentVideos) => [newVideo, ...currentVideos]);

    // Reset input value to allow re-uploading the same file
    if (event.target) {
      event.target.value = '';
    }
  };

  const handlePlayVideo = (video: Video) => {
    setPlayingVideo(video);
  };

  const handleClosePlayer = () => {
    setPlayingVideo(null);
  };

  const handleStartEdit = (video: Video) => {
    setPlayingVideo(null); // Close player
    setEditingVideo(video); // Open edit page
  };

  const handleCancelEdit = () => {
    setEditingVideo(null); // Close edit page, return to grid
  };

  const generateAndAddNewVideos = async (
    prompt: string,
    numberOfVideos: number,
    baseTitle: string,
    baseDescription: string,
    aspectRatio: '16:9' | '9:16' | '1:1' = '16:9',
  ) => {
    setIsSaving(true);
    setGenerationError(null);

    try {
      const videoObjects = await generateVideoFromText(
        prompt,
        numberOfVideos,
        aspectRatio,
      );

      if (!videoObjects || videoObjects.length === 0) {
        throw new Error('Video generation returned no data.');
      }

      const mimeType = 'video/mp4';

      const newVideos: Video[] = videoObjects.map((videoSrc, index) => {
        const src = `data:${mimeType};base64,${videoSrc}`;
        const title =
          numberOfVideos > 1
            ? `${baseTitle} (${index + 1}/${numberOfVideos})`
            : baseTitle;

        return {
          id: self.crypto.randomUUID(),
          title,
          description: baseDescription,
          videoUrl: src,
        };
      });

      setVideos((currentVideos) => [...newVideos, ...currentVideos]);
      setPlayingVideo(newVideos[0]); // Go to the new video
    } catch (error) {
      console.error('Video generation failed:', error);
      // Default to the most common error as per original app behavior
      let errorDetails: ErrorDetails = {
        title: 'Generation Failed',
        messages: [
          'Veo 3 is only available on the Paid Tier.',
          'Please select your Cloud Project to get started.',
        ],
        type: 'api_key',
      };

      if (error instanceof Error) {
        if (error.message.includes('No videos generated')) {
          errorDetails = {
            title: 'Generation Failed',
            messages: [
              'The model did not return any video.',
              'This could be due to your prompt. Please try a different prompt.',
            ],
            type: 'generation_failed',
          };
        } else if (error.message.includes('Failed to fetch video')) {
          errorDetails = {
            title: 'Download Failed',
            messages: [
              'The generated video could not be downloaded.',
              'Please check your network connection and try again.',
            ],
            type: 'network',
          };
        }
      }

      setGenerationError(errorDetails);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async (
    originalVideo: Video,
    options: {
      numberOfVideos: number;
      quality: 'fast' | 'quality';
      duration: 'short' | 'medium' | 'long';
      aspectRatio: '16:9' | '9:16' | '1:1';
    },
  ) => {
    setEditingVideo(null);
    let promptText = originalVideo.description;

    if (options.quality === 'quality') {
      promptText += '\n\nhigh quality, cinematic, 4k';
    }

    if (options.duration === 'short') {
      promptText += '\n\n(Short video, ~4 seconds)';
    } else if (options.duration === 'medium') {
      promptText += '\n\n(Medium video, ~10 seconds)';
    } else if (options.duration === 'long') {
      promptText += '\n\n(Long video, ~15 seconds)';
    }

    await generateAndAddNewVideos(
      promptText,
      options.numberOfVideos,
      `Remix of "${originalVideo.title}"`,
      originalVideo.description,
      options.aspectRatio,
    );
  };

  const handleGenerateFromSearch = async (prompt: string) => {
    await generateAndAddNewVideos(
      prompt,
      1,
      `Generated from: "${prompt}"`,
      prompt,
    );
    setSearchQuery(''); // Clear search after generation
  };

  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Enter' && searchQuery.trim() !== '') {
      handleGenerateFromSearch(searchQuery);
    }
  };

  const filteredVideos = videos.filter(
    (video) =>
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (isSaving) {
    return <SavingProgressPage />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {editingVideo ? (
        <EditVideoPage
          video={editingVideo}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      ) : (
        <div className="mx-auto max-w-[1080px]">
          <header className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text inline-flex items-center gap-4">
                  <VideoCameraIcon className="w-10 h-10 md:w-12 md:h-12" />
                  <span>Veo Gallery</span>
                </h1>
                <p className="text-gray-400 mt-2 text-lg">
                  Select a video to generate your own variations
                </p>
              </div>
              <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-4 md:flex-grow md:justify-end">
                <div className="relative w-full sm:w-auto md:max-w-xs lg:max-w-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="search"
                    name="search"
                    id="search"
                    className="block w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-10 pr-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition"
                    placeholder="Search or enter a prompt..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                  />
                </div>
                <button
                  onClick={handleUploadClick}
                  className="flex-shrink-0 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-5 rounded-lg transition-colors text-base"
                  aria-label="Upload a video from your device">
                  <ArrowUpTrayIcon className="w-6 h-6" />
                  <span>Upload Video</span>
                </button>
              </div>
            </div>
          </header>
          <main className="px-4 md:px-8 pb-8">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="video/*"
            />
            {filteredVideos.length > 0 ? (
              <VideoGrid videos={filteredVideos} onPlayVideo={handlePlayVideo} />
            ) : searchQuery ? (
              <div className="text-center py-20 px-6">
                <h2 className="text-2xl font-semibold text-white mb-2">
                  No Results Found
                </h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  We couldn't find any videos matching your search. Would you
                  like to generate a new video based on this prompt?
                </p>
                <button
                  onClick={() => handleGenerateFromSearch(searchQuery)}
                  className="flex-shrink-0 inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-base">
                  <VideoCameraIcon className="w-6 h-6" />
                  <span>Generate Video</span>
                </button>
              </div>
            ) : (
              <VideoGrid videos={filteredVideos} onPlayVideo={handlePlayVideo} />
            )}
          </main>
        </div>
      )}

      {playingVideo && (
        <VideoPlayer
          video={playingVideo}
          onClose={handleClosePlayer}
          onEdit={handleStartEdit}
        />
      )}

      {generationError && (
        <ErrorModal
          error={generationError}
          onClose={() => setGenerationError(null)}
          onSelectKey={async () => await window.aistudio?.openSelectKey()}
        />
      )}
    </div>
  );
};