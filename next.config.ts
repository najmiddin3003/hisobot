import type { NextConfig } from "next";

/** Barcha sahifa va API javoblariga qo'shiladigan xavfsizlik sarlavhalari */
const securityHeaders = [
  // Sayt boshqa saytlar ichida (iframe) ochilmasin — clickjacking'dan himoya
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Brauzer saytni faqat https orqali ochsin (http'da — localhost'da — e'tiborga olinmaydi)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Shaxsiy moliya — qidiruv tizimlarida ko'rinmasin
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
