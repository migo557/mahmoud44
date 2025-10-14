/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import {ErrorDetails} from '../types';
import {XMarkIcon} from './icons';

interface ErrorModalProps {
  error: ErrorDetails;
  onClose: () => void;
  onSelectKey: () => void;
}

/**
 * A modal component that displays a categorized error message to the user.
 * It includes a title, the error message, a close button, and a visual error icon.
 */
export const ErrorModal: React.FC<ErrorModalProps> = ({
  error,
  onClose,
  onSelectKey,
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="error-modal-title">
      <div
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md relative p-8 m-4 text-center"
        onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white z-10 p-2 rounded-full bg-transparent hover:bg-gray-700 transition-colors"
          aria-label="Close error message">
          <XMarkIcon className="w-6 h-6" />
        </button>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 mb-4">
          <svg
            className="h-6 w-6 text-red-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2
          id="error-modal-title"
          className="text-xl font-bold text-white mb-2">
          {error.title}
        </h2>
        {error.messages.map((m, index) => (
          <p key={index} className="text-gray-400">
            {m}
          </p>
        ))}
        <div className="mt-8 flex justify-center gap-4">
          {error.type === 'api_key' ? (
            <>
              <button
                onClick={onSelectKey}
                className="px-8 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800">
                Add API Key
              </button>
              <button
                onClick={onClose}
                className="px-8 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800">
                Close
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-8 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
