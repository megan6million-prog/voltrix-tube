"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import api from "@/lib/api";
import { Upload, X, Film, Tv, Gamepad2, BookOpen, Music } from "lucide-react";

const CATEGORIES = ["Comedy", "Music", "Sports", "Gaming", "Education", "News", "Drama", "Documentary", "Kids", "Other"];
const CONTENT_TYPES = [
  { id: "video", label: "Video", icon: Film },
  { id: "short", label: "Short", icon: Tv },
  { id: "movie", label: "Movie", icon: Film },
];

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<"select" | "details" | "uploading" | "processing">("select");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [contentId, setContentId] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    content_type: "video",
    category: "",
    tags: "",
    visibility: "public",
    is_kids_safe: false,
    monetization_type: "ads",
    ppv_price_ugx: "",
    rental_price_ugx: "",
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024 * 1024) {
      setError("File too large. Maximum 10GB.");
      return;
    }
    setFile(f);
    // Pre-fill title from filename
    if (!form.title) {
      setForm(prev => ({ ...prev, title: f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") }));
    }
    setStep("details");
  };

  const handleUpload = async () => {
    if (!file || !form.title) return;
    setStep("uploading");
    setError("");

    try {
      // 1. Get presigned upload URL
      const urlRes = await api.post("/content/upload-url", {
        filename: file.name,
        content_type_mime: file.type,
        file_size: file.size,
      });
      const { upload_url, content_id } = urlRes.data.data;
      setContentId(content_id);

      // 2. Upload to S3 directly
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.open("PUT", upload_url);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.onload = () => xhr.status < 400 ? resolve() : reject(new Error("Upload failed"));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(file);
      });

      // 3. Create content record
      await api.post("/content", {
        ...form,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        ppv_price_ugx: form.ppv_price_ugx ? parseInt(form.ppv_price_ugx) : undefined,
        rental_price_ugx: form.rental_price_ugx ? parseInt(form.rental_price_ugx) : undefined,
      });

      setStep("processing");
      setTimeout(() => router.push("/studio"), 3000);
    } catch (err: any) {
      setError(err.message || "Upload failed");
      setStep("details");
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Upload Video</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* Step: Select file */}
        {step === "select" && (
          <label className="block cursor-pointer">
            <input type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
            <div className="border-2 border-dashed border-white/20 hover:border-white/40 rounded-2xl p-16 text-center transition-colors">
              <Upload size={48} className="mx-auto mb-4 text-gray-500" />
              <p className="text-lg font-medium mb-2">Drag & drop or click to upload</p>
              <p className="text-gray-500 text-sm">MP4, MOV, AVI, MKV — Max 10GB</p>
            </div>
          </label>
        )}

        {/* Step: Details form */}
        {step === "details" && file && (
          <div className="space-y-5">
            {/* File info */}
            <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
              <div className="text-sm">
                <p className="font-medium">{file.name}</p>
                <p className="text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button onClick={() => { setFile(null); setStep("select"); }}>
                <X size={18} className="text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* Content type */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Type</label>
              <div className="flex gap-2">
                {CONTENT_TYPES.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setForm(p => ({ ...p, content_type: id }))}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors ${
                      form.content_type === id ? "bg-white text-black font-semibold" : "bg-white/10 hover:bg-white/20"
                    }`}>
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Title *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Enter a title"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 placeholder-gray-600"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe your video..."
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 placeholder-gray-600 resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30">
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Tags (comma separated)</label>
              <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
                placeholder="uganda, comedy, viral"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 placeholder-gray-600"
              />
            </div>

            {/* Visibility */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Visibility</label>
              <div className="grid grid-cols-2 gap-2">
                {["public", "unlisted", "private", "ppv"].map(v => (
                  <button key={v} onClick={() => setForm(p => ({ ...p, visibility: v }))}
                    className={`py-2.5 rounded-xl text-sm capitalize transition-colors ${
                      form.visibility === v ? "bg-white text-black font-semibold" : "bg-white/10 hover:bg-white/20"
                    }`}>
                    {v === "ppv" ? "Pay-Per-View" : v}
                  </button>
                ))}
              </div>
            </div>

            {/* PPV prices */}
            {form.visibility === "ppv" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Rental price (UGX)</label>
                  <input type="number" value={form.rental_price_ugx}
                    onChange={e => setForm(p => ({ ...p, rental_price_ugx: e.target.value }))}
                    placeholder="e.g. 5000"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Purchase price (UGX)</label>
                  <input type="number" value={form.ppv_price_ugx}
                    onChange={e => setForm(p => ({ ...p, ppv_price_ugx: e.target.value }))}
                    placeholder="e.g. 15000"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 placeholder-gray-600"
                  />
                </div>
              </div>
            )}

            {/* Kids safe */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.is_kids_safe}
                onChange={e => setForm(p => ({ ...p, is_kids_safe: e.target.checked }))}
                className="w-4 h-4 accent-red-600"
              />
              <span className="text-sm">This content is safe for kids</span>
            </label>

            <button onClick={handleUpload} disabled={!form.title}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors mt-2">
              Upload Video
            </button>
          </div>
        )}

        {/* Step: Uploading */}
        {step === "uploading" && (
          <div className="text-center py-16">
            <div className="w-24 h-24 rounded-full border-4 border-white/10 border-t-red-500 animate-spin mx-auto mb-6" />
            <p className="text-lg font-semibold mb-2">Uploading...</p>
            <p className="text-gray-400 text-sm mb-4">{file?.name}</p>
            <div className="w-full bg-white/10 rounded-full h-2 mb-2">
              <div className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-sm text-gray-400">{uploadProgress}%</p>
          </div>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✅</span>
            </div>
            <p className="text-xl font-semibold mb-2">Upload complete!</p>
            <p className="text-gray-400 text-sm">Your video is being processed. We'll notify you when it's ready.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
