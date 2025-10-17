/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, {useRef, useEffect, useState} from 'react';
import {Video} from '../types';
import {TrashIcon} from './icons';

interface VideoMaskEditorProps {
  videoUrl: string;
  onMaskChange: (isMasking: boolean) => void;
}

const VideoMaskEditor: React.FC<VideoMaskEditorProps> = ({
  videoUrl,
  onMaskChange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasMask, setHasMask] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const setCanvasDimensions = () => {
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
      // Re-apply drawing styles after resize/reset
      context.strokeStyle = 'rgba(168, 85, 247, 0.7)';
      context.lineWidth = 20;
      context.lineCap = 'round';
      context.lineJoin = 'round';
    };

    video.addEventListener('loadedmetadata', setCanvasDimensions);
    window.addEventListener('resize', setCanvasDimensions);

    // Initial setup
    if (video.readyState >= 1) {
      setCanvasDimensions();
    }

    return () => {
      video.removeEventListener('loadedmetadata', setCanvasDimensions);
      window.removeEventListener('resize', setCanvasDimensions);
    };
  }, [hasMask]); // Rerun when mask is cleared to reset context styles

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context) return;

    const {offsetX, offsetY} = event.nativeEvent;
    context.beginPath();
    context.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    if (!hasMask) {
      setHasMask(true);
      onMaskChange(true);
    }
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context) return;

    const {offsetX, offsetY} = event.nativeEvent;
    context.lineTo(offsetX, offsetY);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context) return;

    context.closePath();
    setIsDrawing(false);
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context || !canvas) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasMask(false);
    onMaskChange(false);
  };

  return (
    <div className="relative aspect-w-16 aspect-h-9 bg-black rounded-lg overflow-hidden group shadow-inner">
      <video
        ref={videoRef}
        src={videoUrl}
        muted
        className="w-full h-full object-contain pointer-events-none"
        preload="metadata"
        aria-hidden="true"
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      {hasMask && (
        <button
          onClick={clearMask}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Clear mask">
          <TrashIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

interface EditVideoPageProps {
  video: Video;
  onSave: (
    updatedVideo: Video,
    options: {
      numberOfVideos: number;
      quality: 'fast' | 'quality';
      duration: 'short' | 'medium' | 'long';
      aspectRatio: '16:9' | '9:16' | '1:1';
    },
  ) => void;
  onCancel: () => void;
}

/**
 * A page that allows the user to edit the description of a video.
 * It provides input field for the description and buttons to save or cancel the changes.
 */
export const EditVideoPage: React.FC<EditVideoPageProps> = ({
  video,
  onSave,
  onCancel,
}) => {
  const [editPrompt, setEditPrompt] = useState('');
  const [isMaskActive, setIsMaskActive] = useState(false);
  const [numberOfVideos, setNumberOfVideos] = useState(1);
  const [quality, setQuality] = useState<'fast' | 'quality'>('fast');
  const [duration, setDuration] = useState<'short' | 'medium' | 'long'>(
    'medium',
  );
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>(
    '16:9',
  );

  const handleSave = () => {
    let finalDescription = video.description;
    if (isMaskActive && editPrompt.trim() !== '') {
      finalDescription = `${video.description}\n\nIn the highlighted area, please ${editPrompt}.`;
    }
    onSave(
      {...video, description: finalDescription},
      {numberOfVideos, quality, duration, aspectRatio},
    );
  };

  const incrementVideos = () => setNumberOfVideos((v) => Math.min(v + 1, 4));
  const decrementVideos = () => setNumberOfVideos((v) => Math.max(v - 1, 1));

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-3xl bg-gray-800 p-6 md:p-8 rounded-lg shadow-2xl">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            Remix Video
          </h1>
          <p className="text-gray-400">
            Draw on the video to specify an area to change, then describe your
            edit.
          </p>
        </header>

        <main>
          <div className="mb-6">
            <VideoMaskEditor
              videoUrl={video.videoUrl}
              onMaskChange={setIsMaskActive}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="edit-prompt"
              className="block text-sm font-medium text-gray-300 mb-2">
              Describe your change
            </label>
            <textarea
              id="edit-prompt"
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder={
                isMaskActive
                  ? 'e.g., add a cat wearing a party hat'
                  : 'Draw on the video above to enable...'
              }
              disabled={!isMaskActive}
              aria-label="Describe the change for the selected area"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Original Prompt (for context)
            </label>
            <div className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-400 text-sm h-24 overflow-y-auto">
              {video.description}
            </div>
          </div>
          <div className="mb-8 space-y-6">
            <h2 className="text-xl font-semibold text-white">
              Generation Settings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="variations"
                  className="block text-sm font-medium text-gray-300 mb-2">
                  Variations
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={decrementVideos}
                    disabled={numberOfVideos <= 1}
                    className="px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    -
                  </button>
                  <input
                    type="text"
                    id="variations"
                    readOnly
                    className="w-12 text-center bg-gray-900 border border-gray-700 rounded-lg p-2 text-gray-200"
                    value={numberOfVideos}
                  />
                  <button
                    onClick={incrementVideos}
                    disabled={numberOfVideos >= 4}
                    className="px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quality
                </label>
                <div className="flex rounded-lg bg-gray-700 p-1">
                  <button
                    onClick={() => setQuality('fast')}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      quality === 'fast'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-gray-600'
                    }`}>
                    Fast
                  </button>
                  <button
                    onClick={() => setQuality('quality')}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      quality === 'quality'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-gray-600'
                    }`}>
                    High
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Duration
                </label>
                <div className="flex rounded-lg bg-gray-700 p-1">
                  <button
                    onClick={() => setDuration('short')}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      duration === 'short'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-gray-600'
                    }`}>
                    Short
                  </button>
                  <button
                    onClick={() => setDuration('medium')}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      duration === 'medium'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-gray-600'
                    }`}>
                    Medium
                  </button>
                  <button
                    onClick={() => setDuration('long')}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      duration === 'long'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-gray-600'
                    }`}>
                    Long
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Aspect Ratio
                </label>
                <div className="flex rounded-lg bg-gray-700 p-1">
                  <button
                    onClick={() => setAspectRatio('16:9')}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      aspectRatio === '16:9'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-gray-600'
                    }`}>
                    16:9
                  </button>
                  <button
                    onClick={() => setAspectRatio('9:16')}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      aspectRatio === '9:16'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-gray-600'
                    }`}>
                    9:16
                  </button>
                  <button
                    onClick={() => setAspectRatio('1:1')}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      aspectRatio === '1:1'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-gray-600'
                    }`}>
                    1:1
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors">
            Generate new video
          </button>
        </footer>
      </div>
    </div>
  );
};