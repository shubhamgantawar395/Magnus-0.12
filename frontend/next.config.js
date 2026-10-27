/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    // Strip X-Powered-By header — minor security + saves bytes on every response
    poweredByHeader: false,

    // Enable Next.js built-in gzip/brotli compression (applies to the Next.js
    // server itself; a reverse-proxy like nginx handles this in production, but
    // this ensures local dev + direct deployments also benefit)
    compress: true,

    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    },

    images: {
        domains: ['localhost'],
        // Serve WebP/AVIF instead of JPEG/PNG — 30–50% smaller payloads
        formats: ['image/webp', 'image/avif'],
        // Cache optimised images for 60 s minimum
        minimumCacheTTL: 60,
    },

    compiler: {
        // Remove console.log (but keep console.error) in production builds
        removeConsole: process.env.NODE_ENV === 'production'
            ? { exclude: ['error', 'warn'] }
            : false,
    },

    experimental: {
        // Tree-shake large icon / UI packages at the import level — prevents
        // bundling all 1 000+ lucide icons when only a handful are used
        optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'date-fns'],
    },
}

module.exports = nextConfig
