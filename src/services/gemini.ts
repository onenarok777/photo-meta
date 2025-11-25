import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GeminiDetectionResult {
  isAIGenerated: boolean;
  confidence: number; // 0-100
  reasoning: string;
  visualIndicators: string[];
}

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey && apiKey !== "your_api_key_here") {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite",
      });
    }
  }

  isConfigured(): boolean {
    return this.genAI !== null && this.model !== null;
  }

  private async imageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async detectAIImage(file: File): Promise<GeminiDetectionResult> {
    if (!this.isConfigured()) {
      throw new Error(
        "Gemini API is not configured. Please add your API key to .env file."
      );
    }

    try {
      const base64Image = await this.imageToBase64(file);
      const mimeType = file.type;

      const prompt = `วิเคราะห์ภาพนี้อย่างละเอียดและบอกว่าภาพนี้ถูกสร้างโดย AI image generator (เช่น Midjourney, DALL-E, Stable Diffusion ฯลฯ) หรือเป็นภาพถ่ายจริง/งานศิลปะแบบดั้งเดิม

ให้มองหาสัญญาณเหล่านี้ที่บ่งชี้ว่าเป็นภาพจาก AI:
1. **Texture artifacts**: การเบลอผิดปกติ, รูปแบบ diffusion, หรือพื้นผิวสังเคราะห์
2. **ปัญหาทางกายวิภาค**: นิ้วมือเกิน, มือผิดรูป, สัดส่วนร่างกายที่เป็นไปไม่ได้
3. **แสงเงาไม่สอดคล้อง**: เงาที่ไม่ตรงกับแหล่งกำเนิดแสง, การสะท้อนที่ไม่สมจริง
4. **ความสอดคล้องของพื้นหลัง**: วัตถุที่ผสมผสานกันอย่างไม่เป็นธรรมชาติ, รายละเอียดที่ไร้สาระ
5. **ข้อความ/สัญลักษณ์**: ข้อความที่อ่านไม่ออก หรือโลโก้ที่ผิดรูป
6. **ลักษณะเฉพาะของ AI**: ผิวเรียบเกินไป, ลักษณะ "AI aesthetic", คุณภาพเหมือนฝัน
7. **การทำซ้ำของรูปแบบ**: ความสมมาตรที่ผิดธรรมชาติ หรือองค์ประกอบที่ซ้ำกัน

**สำคัญ: ตอบกลับเป็นภาษาไทยทั้งหมด** ในรูปแบบ JSON ดังนี้ (ไม่ต้องใส่ markdown, JSON บริสุทธิ์เท่านั้น):
{
  "isAIGenerated": true หรือ false,
  "confidence": ตัวเลข 0-100,
  "reasoning": "คำอธิบายสั้นๆ เป็นภาษาไทยว่าทำไมถึงคิดแบบนั้น",
  "visualIndicators": ["ลักษณะที่พบ 1 (ภาษาไทย)", "ลักษณะที่พบ 2 (ภาษาไทย)", ...]
}

วิเคราะห์อย่างละเอียดแต่กระชับ ถ้าไม่แน่ใจก็อธิบายว่าทำไม`;

      const result = await this.model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
        prompt,
      ]);

      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      // Remove any markdown code block markers
      const cleanedText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const parsed = JSON.parse(cleanedText);

      return {
        isAIGenerated: parsed.isAIGenerated || false,
        confidence: parsed.confidence || 0,
        reasoning: parsed.reasoning || "No reasoning provided",
        visualIndicators: parsed.visualIndicators || [],
      };
    } catch (error) {
      console.error("Gemini API error:", error);
      throw new Error(
        error instanceof Error
          ? `Failed to analyze image: ${error.message}`
          : "Failed to analyze image with Gemini"
      );
    }
  }
}

export const geminiService = new GeminiService();
