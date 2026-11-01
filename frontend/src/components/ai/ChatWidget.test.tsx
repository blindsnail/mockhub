import { beforeEach, describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';
import { ChatWidget } from './ChatWidget';

// jsdom does not implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

const mockMutate = vi.fn();

vi.mock('@/hooks/use-ai', () => ({
  useChat: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

beforeEach(() => {
  mockMutate.mockReset();
});

describe('ChatWidget', () => {
  it('renders floating trigger button when closed', () => {
    renderWithProviders(<ChatWidget />);

    const openButton = screen.getByRole('button', {
      name: 'Open AI chat assistant',
    });
    expect(openButton).toBeDefined();
  });

  it('opens chat panel when trigger button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatWidget />);

    await user.click(screen.getByRole('button', { name: 'Open AI chat assistant' }));

    expect(screen.getByText('AI Assistant')).toBeDefined();
    expect(screen.getByPlaceholderText('Ask about events...')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Close chat' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDefined();
  });

  it('shows suggestion prompts when no messages', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatWidget />);

    await user.click(screen.getByRole('button', { name: 'Open AI chat assistant' }));

    expect(screen.getByText('Try asking something like:')).toBeDefined();
    expect(screen.getByText('What concerts are coming up in New York?')).toBeDefined();
    expect(screen.getByText('Find me tickets under $100')).toBeDefined();
  });

  it('fills input when suggestion is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatWidget />);

    await user.click(screen.getByRole('button', { name: 'Open AI chat assistant' }));

    await user.click(screen.getByText('What concerts are coming up in New York?'));

    const input = screen.getByPlaceholderText('Ask about events...') as HTMLInputElement;
    expect(input.value).toBe('What concerts are coming up in New York?');
  });

  it('closes chat panel when close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatWidget />);

    await user.click(screen.getByRole('button', { name: 'Open AI chat assistant' }));
    expect(screen.getByText('AI Assistant')).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'Close chat' }));

    // Trigger button should reappear
    expect(screen.getByRole('button', { name: 'Open AI chat assistant' })).toBeDefined();
    expect(screen.queryByText('AI Assistant')).toBeNull();
  });

  it('sends message and displays user message bubble', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatWidget />);

    await user.click(screen.getByRole('button', { name: 'Open AI chat assistant' }));

    const input = screen.getByPlaceholderText('Ask about events...');
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    // User message should appear
    expect(screen.getByTestId('user-message')).toBeDefined();
    expect(screen.getByText('Hello AI')).toBeDefined();

    // mutate should have been called
    expect(mockMutate).toHaveBeenCalledWith(
      { message: 'Hello AI', conversationId: null },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it('disables send button when input is empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatWidget />);

    await user.click(screen.getByRole('button', { name: 'Open AI chat assistant' }));

    const sendButton = screen.getByRole('button', { name: 'Send message' });
    expect(sendButton).toHaveProperty('disabled', true);
  });

  it('sends message on Enter key press', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatWidget />);

    await user.click(screen.getByRole('button', { name: 'Open AI chat assistant' }));

    const input = screen.getByPlaceholderText('Ask about events...');
    await user.type(input, 'Search events{Enter}');

    expect(mockMutate).toHaveBeenCalledWith(
      { message: 'Search events', conversationId: null },
      expect.any(Object),
    );
  });
});

describe('MessageContent link parsing', () => {
  it('renders internal links as Router Links', async () => {
    // We need to trigger the assistant message rendering.
    // Simulate by calling onSuccess callback from mutate.
    mockMutate.mockImplementation((_data, options) => {
      options.onSuccess({
        conversationId: 1,
        message: 'Check out [Summer Jazz](/events/summer-jazz) for a great time!',
        timestamp: new Date().toISOString(),
      });
    });

    const user = userEvent.setup();
    renderWithProviders(<ChatWidget />);

    await user.click(screen.getByRole('button', { name: 'Open AI chat assistant' }));

    const input = screen.getByPlaceholderText('Ask about events...');
    await user.type(input, 'recommend something');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    const link = screen.getByRole('link', { name: 'Summer Jazz' });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/events/summer-jazz');
  });

  it('renders external links as anchor tags with target blank', async () => {
    mockMutate.mockImplementation((_data, options) => {
      options.onSuccess({
        conversationId: 1,
        message: 'Visit [Spotify](https://spotify.com) for music!',
        timestamp: new Date().toISOString(),
      });
    });

    const user = userEvent.setup();
    renderWithProviders(<ChatWidget />);

    await user.click(screen.getByRole('button', { name: 'Open AI chat assistant' }));

    const input = screen.getByPlaceholderText('Ask about events...');
    await user.type(input, 'tell me about music');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    const link = screen.getByRole('link', { name: 'Spotify' });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('https://spotify.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders plain text without links unchanged', async () => {
    mockMutate.mockImplementation((_data, options) => {
      options.onSuccess({
        conversationId: 1,
        message: 'Here is a plain response with no links.',
        timestamp: new Date().toISOString(),
      });
    });

    const user = userEvent.setup();
    renderWithProviders(<ChatWidget />);

    await user.click(screen.getByRole('button', { name: 'Open AI chat assistant' }));

    const input = screen.getByPlaceholderText('Ask about events...');
    await user.type(input, 'hello');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(screen.getByText('Here is a plain response with no links.')).toBeDefined();
  });
});

describe('MessageContent markdown rendering', () => {
  async function sendAssistantReply(message: string) {
    mockMutate.mockImplementation((_data, options) => {
      options.onSuccess({
        conversationId: 1,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    const user = userEvent.setup();
    renderWithProviders(<ChatWidget />);
    await user.click(screen.getByRole('button', { name: 'Open AI chat assistant' }));
    await user.type(screen.getByPlaceholderText('Ask about events...'), 'hi');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
  }

  it('renders a markdown table as a table with links in cells', async () => {
    await sendAssistantReply(
      [
        '| Event | Venue | Price |',
        '|---|---|---|',
        '| [Norah Jones](/events/norah-jones) | Blue Note | $54.59 |',
      ].join('\n'),
    );

    expect(screen.getByRole('table')).toBeDefined();
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Norah Jones' }).getAttribute('href')).toBe(
      '/events/norah-jones',
    );
    expect(screen.getByRole('cell', { name: 'Blue Note' })).toBeDefined();
  });

  it('renders bold text and bullet lists', async () => {
    await sendAssistantReply('**Blue Note**\n- Show one\n- Show two');

    expect(screen.getByText('Blue Note').tagName).toBe('STRONG');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('does not render markdown images', async () => {
    await sendAssistantReply('Look ![tracker](https://evil.example/x.png?d=secret) here');

    expect(document.querySelector('img')).toBeNull();
  });

  it('treats protocol-relative links as external, not Router routes', async () => {
    await sendAssistantReply('[Offsite](//evil.example/login)');

    const link = screen.getByRole('link', { name: 'Offsite' });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('does not render javascript: links as clickable hrefs', async () => {
    await sendAssistantReply('[click me](javascript:alert(1))');

    const link = screen.queryByRole('link', { name: 'click me' });
    expect(link?.getAttribute('href') ?? '').not.toContain('javascript:');
  });
});
