/**
 * Meta Tags Utility
 * Helper functions for updating page-specific meta tags
 */

export function updatePageMeta({
  title = 'Ruang Performer',
  description = 'Ruang Performer - Manajemen band, setlist, dan gigs dalam satu platform.',
  image = '/favicon.svg',
  url = window.location.href,
  type = 'website'
}) {
  // Update title
  document.title = `${title} | Ruang Performer`;

  // Update or create meta tags
  updateMetaTag('description', description);
  updateMetaTag('og:title', title, 'property');
  updateMetaTag('og:description', description, 'property');
  updateMetaTag('og:image', image, 'property');
  updateMetaTag('og:url', url, 'property');
  updateMetaTag('og:type', type, 'property');
  updateMetaTag('twitter:title', title);
  updateMetaTag('twitter:description', description);
  updateMetaTag('twitter:image', image);
}

function updateMetaTag(name, content, type = 'name') {
  let tag = document.querySelector(`meta[${type}="${name}"]`);

  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(type, name);
    document.head.appendChild(tag);
  }

  tag.setAttribute('content', content);
}

// Page-specific metadata
export const pageMetadata = {
  home: {
    title: 'Beranda',
    description: 'Dashboard utama Ruang Performer - Kelola band, setlist, dan gigs Anda'
  },
  songs: {
    title: 'Lagu',
    description: 'Kelola koleksi lagu Anda dengan chord, lirik, dan informasi lengkap'
  },
  setlists: {
    title: 'Setlist',
    description: 'Buat dan kelola setlist untuk pertunjukan band Anda'
  },
  bands: {
    title: 'Band',
    description: 'Kelola band, anggota, dan informasi band Anda'
  },
  gigs: {
    title: 'Gigs',
    description: 'Kelola jadwal gigs dan pertunjukan band Anda'
  }
};
