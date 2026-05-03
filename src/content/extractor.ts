import { ContentType } from '../types';

export interface ExtractedPage {
  content: string;
  contentType: ContentType;
  title: string;
  url: string;
  selection?: string;
  metadata: Record<string, any>;
}

export async function extractPageData(): Promise<ExtractedPage> {
  const url = window.location.href;
  
  // Guard: Don't extract from extension pages
  if (url.startsWith('chrome-extension:') || url.includes('clarity-extension')) {
    throw new Error("Cannot extract content from this page. Switch to a webpage.");
  }

  const title = document.title;
  let selection = window.getSelection()?.toString().trim();
  
  const metadata: Record<string, any> = {
    title: title,
    url: url,
    authors: extractAuthors(),
    publicationDate: extractDate(),
    publisher: extractPublisher(),
    doi: extractDOI(),
    accessDate: new Date().toISOString()
  };

  if (selection && selection.length > 20) {
    return {
      content: selection,
      contentType: 'selected-text',
      title,
      url,
      selection,
      metadata
    };
  }

  // Gmail detection
  if (url.includes('mail.google.com')) {
    const thread = extractGmailThread();
    if (thread) return { ...thread, title, url, metadata };
  }

  // YouTube detection
  if (url.includes('youtube.com/watch')) {
    const youtube = await extractYouTubeData();
    return { ...youtube, title, url, metadata };
  }

  // Generic Article / Blog
  const article = extractArticleContent();
  return {
    content: article,
    contentType: 'article',
    title,
    url,
    metadata
  };
}

function extractAuthors(): string[] {
  const authorSelectors = [
    'meta[name="author"]',
    'meta[property="article:author"]',
    '[rel="author"]',
    '.author-name',
    '.byline'
  ];
  for (const selector of authorSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      const content = el.getAttribute('content') || el.textContent;
      if (content) return [content.trim()];
    }
  }
  return [];
}

function extractDate(): string {
  const dateSelectors = [
    'meta[name="publish-date"]',
    'meta[property="article:published_time"]',
    'time[datetime]',
    '.publish-date'
  ];
  for (const selector of dateSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      return el.getAttribute('content') || el.getAttribute('datetime') || el.textContent || '';
    }
  }
  return '';
}

function extractPublisher(): string {
  const el = document.querySelector('meta[property="og:site_name"]') || document.querySelector('meta[name="publisher"]');
  return el?.getAttribute('content') || '';
}

function extractDOI(): string {
  const el = document.querySelector('meta[name="citation_doi"]') || document.querySelector('meta[name="dc.identifier"]');
  return el?.getAttribute('content') || '';
}

function extractGmailThread() {
  // Simple heuristic for visible email content in Gmail
  const messageBodies = Array.from(document.querySelectorAll('.a3s.aiL'));
  if (messageBodies.length > 0) {
    let content = messageBodies
      .map(el => (el.textContent || '').trim())
      .filter(t => t.length > 0)
      .join('\n---\n');
    
    // Normalize whitespace
    content = content.replace(/[ \t]+/g, ' ').replace(/[\n\r]{2,}/g, '\n\n').trim();
    
    if (content.length > 10000) {
      content = content.substring(0, 10000) + "\n\n[... Email thread truncated ...]";
    }
    
    return { content, contentType: 'email' as ContentType };
  }
  return null;
}

async function extractYouTubeData() {
  // Metadata extraction
  const videoTitle = document.querySelector('h1.ytd-watch-metadata')?.textContent?.trim() || '';
  let description = document.querySelector('#description-inline-expander')?.textContent?.trim() || '';
  
  // Clean description (remove typical promo links at the end)
  if (description.length > 1000) {
     description = description.substring(0, 1000) + "...";
  }

  // Try to find transcript (Tier 1: DOM)
  let transcript = '';
  const transcriptParts = Array.from(document.querySelectorAll('ytd-transcript-segment-renderer .segment-text'));
  if (transcriptParts.length > 0) {
    transcript = transcriptParts.map(t => t.textContent?.trim()).join(' ');
  }
  
  let content = `Title: ${videoTitle}\nDescription: ${description}\nTranscript: ${transcript || 'Transcript unavailable.'}`;
  
  if (content.length > 12000) {
    content = content.substring(0, 12000) + "\n\n[... Transcript/Data truncated ...]";
  }

  return {
    content,
    contentType: 'youtube' as ContentType
  };
}

function extractArticleContent() {
  const selectors = ['article', 'main', '.post-content', '.article-body', '.entry-content'];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el.textContent?.trim() || '';
  }
  
  // Fallback to body but try to clean it
  const body = document.body.cloneNode(true) as HTMLElement;
  ['script', 'style', 'nav', 'footer', 'header', 'aside', 'noscript', 'svg', 'canvas', 'video', 'button', 'input', 'select', 'textarea'].forEach(tag => {
    body.querySelectorAll(tag).forEach(el => el.remove());
  });

  // Remove elements that are likely not main content (ads, popups, sidebars)
  const junkSelectors = [
    '[aria-hidden="true"]',
    '.ads',
    '.sidebar',
    '.newsletter',
    '.related-posts',
    '.social-share',
    '.comments-section',
    '#comments',
    '.footer',
    '.header',
    'nav'
  ];
  junkSelectors.forEach(selector => {
    body.querySelectorAll(selector).forEach(el => el.remove());
  });

  let extractedText = body.textContent || '';
  
  // 1. Normalize whitespace: Collapse multiple spaces and newlines
  extractedText = extractedText
    .replace(/[ \t]+/g, ' ')      // Tabs/spaces to single space
    .replace(/[\n\r]{2,}/g, '\n\n') // Multiple newlines to double newline
    .replace(/([!?.#*=-])\1{3,}/g, '$1$1$1') // Reduce long strings of repeated punctuation/decorators (to max 3)
    .trim();

  // 2. Truncate if excessively long (e.g., > 12,000 characters ~ 3k-4k tokens)
  // This prevents hitting context limits and optimizes cost
  const MAX_CHARS = 15000;
  if (extractedText.length > MAX_CHARS) {
    extractedText = extractedText.substring(0, MAX_CHARS) + "\n\n[... Content truncated to optimize analysis speed and cost ...]";
  }

  return extractedText;
}
