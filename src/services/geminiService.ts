import { GoogleGenAI } from "@google/genai";
import { Transaction, Asset, UserProfile } from "../types";
import { formatCurrency } from "../lib/financeUtils";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getFinancialAdvice(
  transactions: Transaction[],
  assets: Asset[],
  user: UserProfile | null,
  stats: any
) {
  if (!process.env.GEMINI_API_KEY) {
    return "Please configure the Gemini API key to get financial advice.";
  }

  const recentTxs = transactions.slice(0, 20).map(t => ({
    date: t.date,
    title: t.title,
    amount: t.amount,
    type: t.type,
    category: t.category
  }));

  const assetSummary = assets.map(a => ({
    name: a.name,
    type: a.type,
    invested: a.investedAmount,
    current: a.currentValue || a.investedAmount
  }));

  const prompt = `
    You are an expert financial advisor and personal treasury manager. Analyze the following financial data for ${user?.name || 'the user'} and provide an "Executive Summary" with actionable professional advice for better financials.
    
    Structure your response with:
    1. **Financial Health Snapshot**: A quick overview of the current situation.
    2. **Immediate Actionable Steps**: 2-3 specific things to do this week/month (e.g., pay off high-interest debt, rebalance assets).
    3. **Long-term Strategy**: Advice on wealth building and optimization.
    4. **Optimization Tips**: Specific category-level recommendations based on recent transaction patterns.

    Keep it authoritative, concise, and highly practical. Use markdown with clear headings and bullet points.
    Target currency is INR (₹).

    Current Stats:
    - Monthly Income: ${formatCurrency(stats.income)}
    - Monthly Expenses: ${formatCurrency(stats.expenses)}
    - Liquid Cash (Assets): ${formatCurrency(stats.totalAssetsLiquid)}
    - Total Liabilities (Debt): ${formatCurrency(stats.totalLiabilities)}
    - Total Net Worth: ${formatCurrency(stats.netWorth)}
    - Savings Rate: ${stats.income > 0 ? Math.round(((stats.income - stats.expenses) / stats.income) * 100) : 0}%

    Recent Transactions:
    ${JSON.stringify(recentTxs, null, 2)}

    Asset Portfolio:
    ${JSON.stringify(assetSummary, null, 2)}
  `;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return response.text || "No advice generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Sorry, I couldn't generate advice right now. Please try again later.";
  }
}

export async function parseTransactionSms(smsText: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Please configure the Gemini API key.");
  }

  const prompt = `
    Extract transaction details from the following bank alert/SMS message. 
    Return a JSON object with strictly these fields:
    - title: string (A descriptive recipient or purpose, e.g., "Swiggy Payment", "ATM withdrawal")
    - amount: number (The transaction amount)
    - type: "INCOME" | "EXPENSE" (Determine if money is debited or credited)
    - category: string (One of: Food & Drinks, Shopping, Transport, Housing, Utilities, Health, Entertainment, Others)
    - mode: string (Payment mode like UPI, Card, Net Banking, ATM)
    - date: string (ISO date format YYYY-MM-DD. Use today's date if not specified. Today is ${new Date().toISOString().split('T')[0]})

    SMS Text: "${smsText}"

    If you cannot find clear transaction data, return null.
    Only return valid JSON.
  `;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || "null");
    return result;
  } catch (error) {
    console.error("Gemini SMS Parse Error:", error);
    return null;
  }
}
