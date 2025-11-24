import { useState } from "react";
import ExifReader from "exifreader";

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
}

function App() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

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

      // Detect AI generation
      const { isAI, indicators } = detectAIGeneration(tags);

      // Prepare analysis
      const analysisData: ImageAnalysis = {
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(2)} KB`,
        dimensions: `${img.width} x ${img.height}`,
        metadata: tags,
        isAIGenerated: isAI,
        aiIndicators: indicators,
      };

      setAnalysis(analysisData);
    } catch (error) {
      console.error("Error analyzing image:", error);
      alert("เกิดข้อผิดพลาดในการวิเคราะห์ภาพ / Error analyzing image");
    } finally {
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
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
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
        <div className="mb-8">
          <label className="block">
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border-2 border-dashed border-purple-500/50 rounded-2xl p-12 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-500/20 transition-all duration-300">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <svg
                className="w-16 h-16 mx-auto mb-4 text-purple-400"
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
                คลิกเพื่ออัปโหลดภาพ
              </p>
              <p className="text-purple-300">
                รองรับไฟล์ JPG, PNG, WebP และอื่นๆ
              </p>
            </div>
          </label>
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

              {/* AI Detection Result */}
              <div
                className={`backdrop-blur-md border-2 rounded-2xl p-6 ${
                  analysis.isAIGenerated
                    ? "bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/50"
                    : "bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/50"
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  {analysis.isAIGenerated ? (
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
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
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
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
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                  )}
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      {analysis.isAIGenerated ? "ภาพจาก AI" : "ภาพธรรมชาติ"}
                    </h3>
                    <p className="text-sm text-white/80">
                      {analysis.isAIGenerated
                        ? "ตรวจพบข้อมูลว่าเป็นภาพที่สร้างจาก AI"
                        : "ไม่พบข้อมูลว่าเป็นภาพจาก AI"}
                    </p>
                  </div>
                </div>

                {analysis.isAIGenerated && analysis.aiIndicators.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-semibold text-white/90">
                      ตัวบ่งชี้:
                    </p>
                    {analysis.aiIndicators.map((indicator, index) => (
                      <div
                        key={index}
                        className="bg-black/30 rounded-lg px-3 py-2"
                      >
                        <p className="text-sm text-white/80">{indicator}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                        className="bg-purple-500/10 rounded-lg p-3 hover:bg-purple-500/20 transition-colors"
                      >
                        <p className="text-purple-400 font-semibold text-sm mb-2">
                          {key}
                        </p>
                        <div className="space-y-1 pl-3">
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
                      className="bg-purple-500/10 rounded-lg p-3 hover:bg-purple-500/20 transition-colors"
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
    </div>
  );
}

export default App;
