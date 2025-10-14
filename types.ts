/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Interface defining the structure of a video object, including its ID, URL,
 * title, and description.
 */
export interface Video {
  id: string;
  videoUrl: string;
  title: string;
  description: string;
}

export type ErrorType =
  | 'api_key'
  | 'generation_failed'
  | 'network'
  | 'unknown';

export interface ErrorDetails {
  title: string;
  messages: string[];
  type: ErrorType;
}
