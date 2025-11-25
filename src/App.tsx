import React, { useState, useEffect } from "react";
import ReactGA from "react-ga4";
import ExifReader from "exifreader";
import { geminiService } from "./services/gemini";
import type { GeminiDetectionResult } from "./services/gemini";

// Initialize GA4
const GA_MEASUREMENT_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
if (GA_MEASUREMENT_ID) {
  ReactGA.initialize(GA_MEASUREMENT_ID);
}

interface ImageMetadata {
  [key: string]: any;
}

interface ImageAnalysis {
  fileName: string;
  fileSize: string;
  dimensions: string;
  metadata: ImageMetadata;
  isAIGenerated: boolean;
  aiIndicators: string[];
  geminiAnalysis?: GeminiDetectionResult;
}

function App() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (GA_MEASUREMENT_ID) {
      ReactGA.send({ hitType: "pageview", page: window.location.pathname });
    }

    // Handle paste events
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            const file = items[i].getAsFile();
            if (file) processFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);

    // Global Drag & Drop
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleGlobalDragLeave = (e: DragEvent) => {
      e.preventDefault();
      // Only set to false if we're leaving the window (relatedTarget is null)
      if (e.relatedTarget === null) {
        setIsDragging(false);
      }
    };

    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith("image/")) {
        processFile(file);
      }
    };

    window.addEventListener("dragover", handleGlobalDragOver);
    window.addEventListener("dragleave", handleGlobalDragLeave);
    window.addEventListener("drop", handleGlobalDrop);

    return () => {
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("dragover", handleGlobalDragOver);
      window.removeEventListener("dragleave", handleGlobalDragLeave);
      window.removeEventListener("drop", handleGlobalDrop);
    };
  }, []);

  const detectAIGeneration = (
    metadata: ImageMetadata
  ): { isAI: boolean; indicators: string[] } => {
    const indicators: string[] = [];

    // Check for common AI generation markers
    const aiKeywords = [
      "midjourney",
      "stable diffusion",
      "dall-e",
      "dalle",
      "ai",
      "artificial intelligence",
      "generated",
      "synthesis",
      "diffusion",
      "neural",
      "gan",
      "gpt",
      "openai",
      "runway",
      "firefly",
      "adobe firefly",
      "bing image creator",
      "craiyon",
      "bluewillow",
    ];

    // Check Software/Model tags
    if (metadata.Software?.description) {
      const software = metadata.Software.description.toLowerCase();
      aiKeywords.forEach((keyword) => {
        if (software.includes(keyword)) {
          indicators.push(`Software: ${metadata.Software.description}`);
        }
      });
    }

    // Check Artist/Author
    if (metadata.Artist?.description) {
      const artist = metadata.Artist.description.toLowerCase();
      aiKeywords.forEach((keyword) => {
        if (artist.includes(keyword)) {
          indicators.push(`Artist: ${metadata.Artist.description}`);
        }
      });
    }

    // Check UserComment
    if (metadata.UserComment?.description) {
      const comment = metadata.UserComment.description.toLowerCase();
      aiKeywords.forEach((keyword) => {
        if (comment.includes(keyword)) {
          indicators.push(`Comment: ${metadata.UserComment.description}`);
        }
      });
    }

    // Check for Dream/Prompt/Parameters (Stable Diffusion)
    if (metadata.Dream || metadata.prompt || metadata.parameters) {
      indicators.push("Contains AI generation parameters");
    }

    // Check ImageDescription
    if (metadata.ImageDescription?.description) {
      const desc = metadata.ImageDescription.description.toLowerCase();
      aiKeywords.forEach((keyword) => {
        if (desc.includes(keyword)) {
          indicators.push(
            `Description: ${metadata.ImageDescription.description}`
          );
        }
      });
    }

    // Check for PNG text chunks (common in AI images)
    if (metadata.parameters || metadata.prompt || metadata["sd-metadata"]) {
      indicators.push("Contains AI metadata fields");
    }

    return {
      isAI: indicators.length > 0,
      indicators,
    };
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setGeminiError(null);
    setAnalysis(null);
    setImagePreview(null);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Read metadata
      const arrayBuffer = await file.arrayBuffer();
      const tags = ExifReader.load(arrayBuffer, { expanded: true });

      // Get image dimensions
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Detect AI generation from metadata
      const { isAI, indicators } = detectAIGeneration(tags);

      // Prepare initial analysis
      const analysisData: ImageAnalysis = {
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(2)} KB`,
        dimensions: `${img.width} x ${img.height}`,
        metadata: tags,
        isAIGenerated: isAI,
        aiIndicators: indicators,
      };

      setAnalysis(analysisData);
      setLoading(false);

      // Run Gemini analysis in background if configured
      if (geminiService.isConfigured()) {
        setGeminiLoading(true);
        try {
          const geminiResult = await geminiService.detectAIImage(file);
          setAnalysis((prev) =>
            prev ? { ...prev, geminiAnalysis: geminiResult } : prev
          );
        } catch (error) {
          console.error("Gemini analysis error:", error);
          setGeminiError(
            error instanceof Error
              ? error.message
              : "Failed to analyze with Gemini"
          );
        } finally {
          setGeminiLoading(false);
        }
      }
    } catch (error) {
      console.error("Error analyzing image:", error);
      alert("เกิดข้อผิดพลาดในการวิเคราะห์ภาพ / Error analyzing image");
      setLoading(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleUrlUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) return;

    try {
      setLoading(true);
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const file = new File([blob], "image-from-url.jpg", { type: blob.type });
      processFile(file);
      setImageUrl(""); // Clear input
    } catch (error) {
      console.error("Error fetching image:", error);
      alert(
        "ไม่สามารถโหลดภาพจากลิงก์ได้ (อาจติดสิทธิ์การเข้าถึง/CORS) กรุณาลองดาวน์โหลดภาพแล้วอัปโหลดแทน"
      );
      setLoading(false);
    }
  };

  const formatMetadataValue = (value: any): string => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "object") {
      if (value.description) return value.description;
      if (Array.isArray(value)) return value.join(", ");
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-[100]">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Photo Meta Analyzer
              </h1>
              <p className="text-sm text-purple-300">
                วิเคราะห์ข้อมูลภาพและตรวจจับภาพจาก AI
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Upload Section */}
        <div className="mb-8 space-y-4">
          <label className="block relative z-20">
            <div
              className={`bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                isDragging
                  ? "border-purple-400 bg-purple-500/30 scale-[1.02] shadow-[0_0_30px_rgba(168,85,247,0.3)]"
                  : "border-purple-500/50 hover:border-purple-400 hover:bg-purple-500/20"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <svg
                className={`w-16 h-16 mx-auto mb-4 text-purple-400 transition-transform duration-300 ${
                  isDragging ? "scale-110" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-xl font-semibold text-white mb-2">
                คลิกเพื่ออัปโหลดภาพ หรือ ลากไฟล์มาวาง
              </p>
              <p className="text-purple-300">
                รองรับไฟล์ JPG, PNG, WebP (สามารถกด Ctrl+V เพื่อวางภาพได้)
              </p>
            </div>
          </label>

          {/* URL Upload */}
          <form onSubmit={handleUrlUpload} className="flex gap-2">
            <input
              type="url"
              placeholder="หรือวางลิงก์รูปภาพที่นี่..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="flex-1 bg-black/30 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!imageUrl || loading}
              className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              โหลดภาพ
            </button>
          </form>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <p className="mt-4 text-purple-300">กำลังวิเคราะห์...</p>
          </div>
        )}

        {analysis && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Preview */}
            <div className="space-y-6">
              {imagePreview && (
                <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    ตัวอย่างภาพ
                  </h2>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full rounded-xl shadow-2xl"
                  />
                </div>
              )}

              {/* Gemini Visual Analysis */}

              {geminiLoading && (
                <div className="bg-purple-500/10 backdrop-blur-md border border-purple-500/50 rounded-2xl p-6">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-3 border-purple-500 border-t-transparent"></div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        กำลังวิเคราะห์ด้วย Gemini AI...
                      </h3>
                      <p className="text-sm text-purple-300">
                        กำลังตรวจสอบลักษณะภาพโดยตรง
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {geminiError && (
                <div className="bg-red-500/10 backdrop-blur-md border border-red-500/50 rounded-2xl p-6">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-6 h-6 text-red-400 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        ไม่สามารถวิเคราะห์ด้วย Gemini
                      </h3>
                      <p className="text-sm text-red-200">{geminiError}</p>
                    </div>
                  </div>
                </div>
              )}

              {analysis.geminiAnalysis && !geminiLoading && (
                <div
                  className={`backdrop-blur-md border-2 rounded-2xl p-6 ${
                    analysis.geminiAnalysis.isAIGenerated
                      ? "bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/50"
                      : "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/50"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-12 h-12 bg-gradient-to-br ${
                        analysis.geminiAnalysis.isAIGenerated
                          ? "from-purple-500 to-pink-500"
                          : "from-cyan-500 to-blue-500"
                      } rounded-full flex items-center justify-center`}
                    >
                      <svg
                        className="w-7 h-7 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-2xl font-bold text-white">
                          {analysis.geminiAnalysis.isAIGenerated
                            ? "Gemini: ภาพจาก AI"
                            : "Gemini: ภาพจริง"}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            analysis.geminiAnalysis.confidence >= 70
                              ? "bg-green-500/20 text-green-300"
                              : analysis.geminiAnalysis.confidence >= 40
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-orange-500/20 text-orange-300"
                          }`}
                        >
                          {analysis.geminiAnalysis.confidence}% แน่ใจ
                        </span>
                      </div>
                      <p className="text-sm text-white/80">
                        วิเคราะห์จากลักษณะภาพโดยตรง
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-black/30 rounded-lg p-3">
                      <p className="text-sm font-semibold text-white/90 mb-1">
                        เหตุผล:
                      </p>
                      <p className="text-sm text-white/80">
                        {analysis.geminiAnalysis.reasoning}
                      </p>
                    </div>

                    {analysis.geminiAnalysis.visualIndicators.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-white/90 mb-2">
                          ลักษณะที่พบ:
                        </p>
                        <div className="space-y-2">
                          {analysis.geminiAnalysis.visualIndicators.map(
                            (indicator, index) => (
                              <div
                                key={index}
                                className="bg-black/30 rounded-lg px-3 py-2 flex items-start gap-2"
                              >
                                <span className="text-purple-400 mt-0.5">
                                  •
                                </span>
                                <p className="text-sm text-white/80 flex-1">
                                  {indicator}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Basic Info */}
              <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  ข้อมูลพื้นฐาน
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-purple-300">ชื่อไฟล์:</span>
                    <span className="text-white font-medium">
                      {analysis.fileName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-purple-300">ขนาดไฟล์:</span>
                    <span className="text-white font-medium">
                      {analysis.fileSize}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-purple-300">ความละเอียด:</span>
                    <span className="text-white font-medium">
                      {analysis.dimensions}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata Details */}
            <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                ข้อมูล Metadata
              </h2>
              <div className="space-y-2 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(analysis.metadata).map(([key, value]) => {
                  if (typeof value === "object" && value !== null) {
                    return (
                      <div
                        key={key}
                        className="bg-purple-500/10 rounded-lg p-3 hover:bg-purple-500/20 transition-colors overflow-x-auto custom-scrollbar"
                      >
                        <p className="text-purple-400 font-semibold text-sm mb-2">
                          {key}
                        </p>
                        <div className="space-y-1 pl-3 overflow-x-auto custom-scrollbar">
                          {Object.entries(value).map(([subKey, subValue]) => (
                            <div key={subKey} className="text-xs">
                              <span className="text-purple-300">
                                {subKey}:{" "}
                              </span>
                              <span className="text-white/80">
                                {formatMetadataValue(subValue)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={key}
                      className="bg-purple-500/10 rounded-lg p-3 hover:bg-purple-500/20 transition-colors overflow-x-auto custom-scrollbar"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-purple-400 font-semibold text-sm">
                          {key}:
                        </span>
                        <span className="text-white/80 text-sm text-right break-all">
                          {formatMetadataValue(value)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {!analysis && !loading && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              เริ่มต้นวิเคราะห์ภาพ
            </h3>
            <p className="text-purple-300">
              อัปโหลดภาพเพื่อดูข้อมูล Metadata และตรวจสอบว่าเป็นภาพจาก AI
              หรือไม่
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-6 text-center">
        <p className="text-purple-300/60 text-sm">
          &copy; {new Date().getFullYear()} ZomJeedz. All rights reserved.
        </p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.7);
        }
      `}</style>

      {/* Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-purple-900/80 backdrop-blur-sm flex items-center justify-center pointer-events-none animate-in fade-in duration-200">
          <div className="text-center p-8 border-4 border-dashed border-white/50 rounded-3xl bg-white/10">
            <svg
              className="w-24 h-24 mx-auto mb-4 text-white animate-bounce"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <h2 className="text-3xl font-bold text-white">วางไฟล์ที่นี่</h2>
            <p className="text-purple-200 mt-2 text-lg">
              เพื่อเริ่มการวิเคราะห์
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
