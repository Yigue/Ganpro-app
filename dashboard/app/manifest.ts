import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GanPro Dashboard',
    short_name: 'GanPro',
    description: 'Gestión ganadera de Loma Alta',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f7f4',
    theme_color: '#2a6a40',
    icons: [{ src: '/icon', sizes: '512x512', type: 'image/png' }],
  };
}
