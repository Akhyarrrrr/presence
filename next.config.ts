import type { NextConfig } from 'next'

function getSupabaseHostname() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!supabaseUrl) return '*.supabase.co'

  try {
    return new URL(supabaseUrl).hostname
  } catch {
    return '*.supabase.co'
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: getSupabaseHostname(),
      },
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      encoding: false,
      fs: false,
    }

    return config
  },
}

export default nextConfig
