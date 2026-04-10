import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(request: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const { image, mediaType } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType || 'image/jpeg',
                  data: image,
                },
              },
              {
                type: 'text',
                text: `Analyze this payslip image and extract the following information. Return ONLY a valid JSON object with these exact fields (use 0 if not found):

{
  "month": "YYYY-MM format of the pay period",
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

Return ONLY the JSON, no explanation or markdown.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: 'AI processing failed', details: err }, { status: 500 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse payslip data', raw: text }, { status: 422 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, data: parsed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Processing failed' }, { status: 500 });
  }
}
