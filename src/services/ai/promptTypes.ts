import type { PromptType } from '@/types';

export interface PromptTypeMeta {
  label: string;
  short: string;
  description: string;
  defaultAspect: string;
}

export const PROMPT_TYPE_META: Record<PromptType, PromptTypeMeta> = {
  image: {
    label: 'AI Image Generation',
    short: 'Image',
    description: 'Midjourney, Firefly, Flux, DALL·E',
    defaultAspect: '4:5',
  },
  video: {
    label: 'AI Video Generation',
    short: 'Video',
    description: 'Runway, Kling, Veo, Sora, Luma',
    defaultAspect: '16:9',
  },
  product: {
    label: 'Product Photography',
    short: 'Product',
    description: 'Packshots and hero product imagery',
    defaultAspect: '1:1',
  },
  realEstate: {
    label: 'Real Estate Visualization',
    short: 'Real Estate',
    description: 'Exterior & interior archviz renders',
    defaultAspect: '3:2',
  },
  social: {
    label: 'Social Media Campaign Visual',
    short: 'Social',
    description: 'Feed, story and carousel key visuals',
    defaultAspect: '4:5',
  },
  cinematic: {
    label: 'Cinematic Advertising',
    short: 'Cinematic',
    description: 'Film-grade ad frames and storyboards',
    defaultAspect: '2.39:1',
  },
};

export const ASPECT_RATIOS = ['Auto', '1:1', '4:5', '9:16', '16:9', '3:2', '2:3', '2.39:1'] as const;

export const PROMPT_STYLES = [
  'Auto',
  'Photorealistic',
  'Cinematic',
  'Editorial',
  'Minimal',
  'Luxury',
  'Architectural',
  '3D Render',
  'Illustrative',
] as const;
