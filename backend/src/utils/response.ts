/**
 * 💎 SALARIA BACKEND — HTTP & CORS RESPONSE UTILITIES
 */

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-telegram-bot-api-secret-token',
};

export function jsonResponse(
  data: any,
  status: number = 200,
  customHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(customHeaders || {})
    }
  });
}
