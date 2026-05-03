import { ReferenceMetadata } from '../types';

export type CitationStyle = 'APA 7' | 'MLA 9' | 'IEEE' | 'Harvard' | 'Chicago' | 'BibTeX';

export function formatCitation(metadata: ReferenceMetadata, style: CitationStyle): string {
  if (!metadata) return 'No citation metadata available.';
  
  const { title, authors, publicationDate, publisher, url, accessDate } = metadata;
  const authorStr = authors && authors.length > 0 ? authors.join(', ') : 'Unknown Author';
  const year = publicationDate ? new Date(publicationDate).getFullYear() : 'n.d.';
  const dateStr = publicationDate || 'n.d.';

  switch (style) {
    case 'APA 7':
      return `${authorStr}. (${year}). ${title}. ${publisher || ''}. ${url ? `Retrieved from ${url}` : ''}`;
    
    case 'MLA 9':
      return `${authorStr}. "${title}." ${publisher || ''}, ${dateStr}, ${url || ''}.`;
    
    case 'IEEE':
      return `[1] ${authorStr}, "${title}," ${publisher || ''}, ${year}. [Online]. Available: ${url || ''}.`;

    case 'BibTeX':
      const id = authors && authors[0] ? authors[0].toLowerCase().split(' ')[0] + year : 'key' + year;
      return `@online{${id},\n  author = {${authorStr}},\n  title = {${title}},\n  year = {${year}},\n  url = {${url || ''}}\n}`;

    default:
      return `${authorStr}. ${title}. ${year}.`;
  }
}
