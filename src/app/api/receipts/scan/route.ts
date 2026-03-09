import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractAmount(text: string): number | null {
  const totalPattern =
    /(?:grand\s*total|total\s*due|amount\s*due|balance\s*due|sub\s*total|total)\s*[:\s]*\$?\s*(\d+[.,]\d{2})/gi;

  const priorityOrder = [
    'grand total',
    'total due',
    'amount due',
    'balance due',
    'total',
    'sub total',
  ];

  let bestMatch: { priority: number; value: number } | null = null;
  let match: RegExpExecArray | null;

  while ((match = totalPattern.exec(text)) !== null) {
    const keyword = match[0]
      .replace(/\s*[:\s]*\$?\s*[\d.,]+$/, '')
      .trim()
      .toLowerCase();
    const value = parseFloat(match[1].replace(',', '.'));

    let priority = priorityOrder.length;
    for (let i = 0; i < priorityOrder.length; i++) {
      if (keyword.includes(priorityOrder[i])) {
        priority = i;
        break;
      }
    }

    // Prefer higher-priority keywords; for the same priority, prefer later
    // occurrences (receipt totals are usually at the bottom).
    if (
      !bestMatch ||
      priority < bestMatch.priority ||
      (priority === bestMatch.priority && value)
    ) {
      bestMatch = { priority, value };
    }
  }

  if (bestMatch) return bestMatch.value;

  // Fallback: find the largest dollar amount on the receipt.
  const dollarPattern = /\$?\s*(\d+[.,]\d{2})/g;
  let largest: number | null = null;

  while ((match = dollarPattern.exec(text)) !== null) {
    const value = parseFloat(match[1].replace(',', '.'));
    if (largest === null || value > largest) {
      largest = value;
    }
  }

  return largest;
}

function extractDate(text: string): string | null {
  // Month DD, YYYY  (e.g. "Jan 15, 2024" or "January 15, 2024")
  const monthNames =
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2}),?\s*(\d{4})\b/i;
  const monthMatch = text.match(monthNames);
  if (monthMatch) {
    const monthStr = monthMatch[1].toLowerCase().slice(0, 3);
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04',
      may: '05', jun: '06', jul: '07', aug: '08',
      sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const mm = monthMap[monthStr];
    const dd = monthMatch[2].padStart(2, '0');
    const yyyy = monthMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // YYYY-MM-DD
  const isoMatch = text.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  // MM/DD/YYYY or MM-DD-YYYY
  const mdyFull = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
  if (mdyFull) {
    return `${mdyFull[3]}-${mdyFull[1].padStart(2, '0')}-${mdyFull[2].padStart(2, '0')}`;
  }

  // MM/DD/YY
  const mdyShort = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2})\b/);
  if (mdyShort) {
    const year = `20${mdyShort[3]}`;
    return `${year}-${mdyShort[1].padStart(2, '0')}-${mdyShort[2].padStart(2, '0')}`;
  }

  return null;
}

function extractMerchant(text: string): string | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Skip lines that are just numbers, dates, or very short
    if (line.length < 3) continue;
    if (/^\d+$/.test(line)) continue;
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(line)) continue;

    // Must contain at least one letter
    if (/[a-zA-Z]/.test(line)) {
      return line
        .replace(/[^\w\s&'-]/g, '')
        .trim()
        .toUpperCase();
    }
  }

  return null;
}

function suggestCategory(text: string, merchant: string | null): string {
  const combined = `${text} ${merchant ?? ''}`.toLowerCase();

  const categoryKeywords: Record<string, string[]> = {
    Food: [
      'restaurant', 'cafe', 'pizza', 'burger', 'bakery', 'grocery', 'food',
      'kitchen', 'dine', 'coffee', 'starbucks', 'mcdonald', 'wendy', 'subway',
      'chipotle', 'panera', 'taco', 'sushi', 'deli', 'bistro', 'grill', 'bar',
    ],
    Transportation: [
      'gas', 'fuel', 'shell', 'exxon', 'chevron', 'bp', 'uber', 'lyft',
      'taxi', 'parking', 'toll', 'metro', 'bus', 'train', 'airline', 'flight',
    ],
    Shopping: [
      'store', 'mall', 'amazon', 'walmart', 'target', 'costco', 'shop', 'mart',
      'best buy', 'home depot', 'ikea', 'lowe', 'nordstrom', 'macy', 'gap',
      'nike', 'adidas',
    ],
    Entertainment: [
      'cinema', 'movie', 'theater', 'netflix', 'spotify', 'game', 'ticket',
      'concert', 'museum', 'park', 'zoo', 'bowling', 'arcade',
    ],
    Bills: [
      'electric', 'water', 'internet', 'phone', 'mobile', 'utility', 'comcast',
      'verizon', 'at&t', 't-mobile', 'sprint',
    ],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (combined.includes(keyword)) {
        return category;
      }
    }
  }

  return 'Other';
}

interface ParsedReceipt {
  amount: number | null;
  date: string | null;
  merchant: string | null;
  suggestedCategory: string;
  confidence: number;
  confidenceLevel: 'high' | 'medium' | 'low';
}

function parseReceiptText(text: string): ParsedReceipt {
  const amount = extractAmount(text);
  const date = extractDate(text);
  const merchant = extractMerchant(text);
  const suggestedCategory = suggestCategory(text, merchant);

  return {
    amount,
    date,
    merchant,
    suggestedCategory,
    confidence: 0,
    confidenceLevel: 'low',
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { image } = body;

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 },
      );
    }

    // Extract base64 data from data URL
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Process image with sharp for better OCR accuracy
    const processedBuffer = await sharp(imageBuffer)
      .greyscale()
      .normalize()
      .sharpen()
      .resize(2000, null, { withoutEnlargement: true })
      .toBuffer();

    // Run OCR with Tesseract.js
    const result = await Tesseract.recognize(processedBuffer, 'eng');

    const rawText = result.data.text;
    const confidence = result.data.confidence;

    // Parse the extracted text
    const parsed = parseReceiptText(rawText);
    parsed.confidence = confidence;

    if (confidence >= 80) {
      parsed.confidenceLevel = 'high';
    } else if (confidence >= 50) {
      parsed.confidenceLevel = 'medium';
    } else {
      parsed.confidenceLevel = 'low';
    }

    return NextResponse.json({
      rawText,
      parsed,
      success: true,
    });
  } catch (error) {
    console.error('POST /api/receipts/scan error:', error);
    return NextResponse.json(
      { error: 'Failed to scan receipt' },
      { status: 500 },
    );
  }
}
