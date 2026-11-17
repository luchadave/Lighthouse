
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type CustomEmoji = {
  shortcode: string;
  url: string;
  static_url: string;
  visible_in_picker: boolean;
  category: string | null;
};

export const GET: RequestHandler = async ({ fetch }) => {
  try {
    const response = await fetch(
      'https://fedi.davewinter.link/api/v1/custom_emojis'
    );

    if (!response.ok) {
      return json(
        { error: 'Unable to load custom emojis' },
        { status: response.status }
      );
    }

    const emojis: CustomEmoji[] = await response.json();

    return json(
      emojis.filter((emoji) => emoji.visible_in_picker)
    );
  } catch {
    return json(
      { error: 'Unable to connect to Hollo' },
      { status: 502 }
    );
  }
};
