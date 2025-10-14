/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, {useState} from 'react';
import {EditVideoPage} from './components/EditVideoPage';
import {ErrorModal} from './components/ErrorModal';
import {VideoCameraIcon} from './components/icons';
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
): Promise<string[]> {
  let operation = await ai.models.generateVideos({
    model: VEO_MODEL_NAME,
    prompt,
    config: {
      numberOfVideos,
      aspectRatio: '16:9',
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
  const [generationError, setGenerationError] = useState<ErrorDetails | null>(
    null,
  );

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

  const handleSaveEdit = async (
    originalVideo: Video,
    options: {
      numberOfVideos: number;
      quality: 'fast' | 'quality';
      duration: 'short' | 'medium' | 'long';
    },
  ) => {
    setEditingVideo(null);
    setIsSaving(true);
    setGenerationError(null);

    try {
      let promptText = originalVideo.description;
      if (options.quality === 'quality') {
        promptText += '\n\nhigh quality, cinematic, 4k';
      }

      if (options.duration === 'short') {
        promptText += '\n\n(Short video, ~4 seconds)';
      } else if (options.duration === 'long') {
        promptText += '\n\n(Long video, ~15 seconds)';
      }
      console.log('Generating video...', promptText);
      const videoObjects = await generateVideoFromText(
        promptText,
        options.numberOfVideos,
      );

      if (!videoObjects || videoObjects.length === 0) {
        throw new Error('Video generation returned no data.');
      }

      console.log('Generated video data received.');

      const mimeType = 'video/mp4';

      const newVideos: Video[] = videoObjects.map((videoSrc, index) => {
        const src = `data:${mimeType};base64,${videoSrc}`;
        const title =
          options.numberOfVideos > 1
            ? `Remix of "${originalVideo.title}" (${index + 1}/${
                options.numberOfVideos
              })`
            : `Remix of "${originalVideo.title}"`;

        return {
          id: self.crypto.randomUUID(),
          title,
          description: originalVideo.description,
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
          <header className="p-6 md:p-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text inline-flex items-center gap-4">
              <VideoCameraIcon className="w-10 h-10 md:w-12 md:h-12" />
              <span>Veo Gallery</span>
            </h1>
            <p className="text-gray-400 mt-2 text-lg">
              Select a video to generate your own variations
            </p>
          </header>
          <main className="px-4 md:px-8 pb-8">
            <VideoGrid videos={videos} onPlayVideo={handlePlayVideo} />
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
