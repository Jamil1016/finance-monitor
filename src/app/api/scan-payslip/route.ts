import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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
    const { image, mediaType } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
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
        model: 'claude-sonnet-4-20250514',
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
