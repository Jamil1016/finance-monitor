import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ADMIN_BYPASS_PASSWORD = process.env.SCAN_BYPASS_PASSWORD || 'fintrack2026admin';
const MONTHLY_SCAN_LIMIT = 10;

const PROMPT = `Analyze this payslip and extract the following information. Return ONLY a valid JSON object with these exact fields (use 0 if a field is not found or shows a dash):

IMPORTANT: For the "month" field, use the PAY PERIOD month (not the pay date). For example if the pay period is "Mar 16-31, 2026" but pay date is "April 10, 2026", the month should be "2026-03" (March, from the pay period).

{
  "month": "YYYY-MM format based on the PAY PERIOD, not the pay date",
  "payPeriod": "the pay period text as shown",
  "basicPay": number,
  "allowances": number,
  "overtime": number,
  "overtimeHours": number,
  "deMinimis": number,
  "holidayPay": number,
  "nsd": number,
  "nsdHours": number,
  "grossPay": number,
  "sss": number,
  "philhealth": number,
  "pagibig": number,
  "tax": number,
  "otherDeductions": number,
  "totalDeductions": number,
  "netPay": number,
  "employerName": "company name",
  "employeeName": "employee name"
}

Return ONLY the JSON object, no explanation, no markdown code fences.`;

export async function POST(request: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI scanner not configured. Add ANTHROPIC_API_KEY in Vercel settings.' }, { status: 500 });
  }

  try {
    const { image, mediaType, userId, bypassPassword } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Rate limit: check monthly scan count
    if (userId) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://xkiukujfcsgvfdnvzgwm.supabase.co',
        ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
         'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhraXVrdWpmY3NndmZkbnZ6Z3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDUxNjEsImV4cCI6MjA5MTM4MTE2MX0',
         'evjYh8FxUnFxuNQBmUkdBsufNTIJ3OfOOJgOy115Yx4'].join('.')
      );

      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Get scan count from a simple tracking table or use transactions count
      const { count } = await supabase
        .from('scan_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('month', monthKey);

      const scanCount = count || 0;

      if (scanCount >= MONTHLY_SCAN_LIMIT) {
        // Check bypass password
        if (!bypassPassword || bypassPassword !== ADMIN_BYPASS_PASSWORD) {
          return NextResponse.json({
            error: `Monthly scan limit reached (${MONTHLY_SCAN_LIMIT}/${MONTHLY_SCAN_LIMIT}). Try again next month.`,
            limitReached: true,
            scansUsed: scanCount,
            scansLimit: MONTHLY_SCAN_LIMIT,
          }, { status: 429 });
        }
        // Bypass accepted — continue
      }

      // Log this scan
      await supabase.from('scan_usage').insert({ user_id: userId, month: monthKey });
    }

    // Determine if this is a PDF or image
    const isPdf = mediaType === 'application/pdf';
    const cleanMediaType = isPdf ? 'application/pdf' :
      mediaType?.startsWith('image/') ? mediaType : 'image/jpeg';

    // Build the content block based on file type
    const fileContent = isPdf
      ? {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: image,
          },
        }
      : {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: cleanMediaType,
            data: image,
          },
        };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: [fileContent, { type: 'text', text: PROMPT }],
          },
        ],
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('Anthropic API error:', responseText);
      // Extract useful error message
      try {
        const errJson = JSON.parse(responseText);
        const msg = errJson.error?.message || 'AI processing failed';
        return NextResponse.json({ error: msg }, { status: 500 });
      } catch {
        return NextResponse.json({ error: 'AI processing failed. File may be too large (max ~5MB).' }, { status: 500 });
      }
    }

    const data = JSON.parse(responseText);
    const text = data.content?.[0]?.text || '';

    // Extract JSON from the response (handle possible markdown fences)
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse payslip data. Please try a clearer image.' }, { status: 422 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: error.message || 'Processing failed. Please try again.' }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
