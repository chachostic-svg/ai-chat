const API_VERSION = 2;

export default function handler(_req, res) {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    ok: true,
    apiVersion: API_VERSION,
    platform: 'vercel',
    gemini: geminiConfigured,
    geminiConfigured,
    model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
  });
}
