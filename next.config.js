/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  optimizeFonts: false,
  compiler: {
    styledComponents: true,
  },
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
    domains: ['peloteras.com', 'localhost'],
  },
  swcMinify: true,
  experimental: {
    images: {
      allowFutureImage: true,
    },
  },
};

if (process.env.NODE_ENV !== 'development') {
  nextConfig.compiler.removeConsole = {
    exclude: ['error', 'warn', 'info'],
  };
}

if (process.env.NODE_ENV === 'development') {
  nextConfig.images.domains.push('localhost');
}

module.exports = {
  async headers() {
    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: Array.from(new Set(process.env.NEXT_PUBLIC_CORS_URLS)).join(',') },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        ]
      }
    ]
  }
}