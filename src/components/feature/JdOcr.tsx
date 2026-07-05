// 공고 이미지 붙여넣기 → OCR → 텍스트 + 내 공고 보관함.
// AI 면접(JD), 스토리뱅크 자소서 분석·공고별 버전의 모집공고 입력란에서 공용.
import { useEffect, useRef, useState } from "react";
import { extractJdFromImages } from "../../api/endpoints";
import { listSavedJds, addSavedJd, removeSavedJd } from "../../lib/savedJds";
import type { SavedJd } from "../../lib/savedJds";

// 이미지 파일 → 축소된 JPEG dataURL (요청 크기 한도 대응)
function fileToDataUrl(file: File, maxDim = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("image load")); };
    img.src = objectUrl;
  });
}

interface UseJdOcrOptions {
  // 추출된 텍스트를 입력란에 반영 (기존 텍스트 유지 여부는 호출부가 결정)
  onText: (text: string) => void;
}

export function useJdOcr({ onText }: UseJdOcrOptions) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedJds, setSavedJds] = useState<SavedJd[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setSavedJds(listSavedJds()); }, []);

  async function addFiles(files: File[]) {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    setError(null);
    try {
      const dataUrls = await Promise.all(imageFiles.map((f) => fileToDataUrl(f)));
      setImages((prev) => [...prev, ...dataUrls].slice(0, 5));
    } catch {
      setError("이미지를 불러오지 못했어요. 다른 이미지로 시도해주세요.");
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);
    if (files.length > 0) {
      e.preventDefault();
      addFiles(files);
    }
  }

  async function extract() {
    if (images.length === 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await extractJdFromImages(images);
      if (res.text) {
        onText(res.text);
        setImages([]);
        // 보관함에 자동 저장 → 다음부턴 칩으로 불러오기
        addSavedJd(res.text);
        setSavedJds(listSavedJds());
      } else {
        setError("이미지에서 텍스트를 읽지 못했어요. 더 선명한 이미지로 시도해주세요.");
      }
    } catch {
      setError("이미지 인식 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  function removeSaved(id: string) {
    setSavedJds(removeSavedJd(id));
  }

  const ui = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }}
      />
      {images.length > 0 && (
        <div className="mt-2 rounded-lg border border-brand-200 bg-brand-50 p-2.5 space-y-2">
          <div className="flex flex-wrap gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative">
                <img src={img} alt={`공고 이미지 ${i + 1}`} className="h-16 w-16 rounded-lg object-cover border border-gray-200" />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-gray-700 text-white text-[9px] leading-4 text-center hover:bg-red-500"
                >✕</button>
              </div>
            ))}
          </div>
          <button
            onClick={extract}
            disabled={loading}
            className="w-full rounded-lg bg-brand-500 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading
              ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" /> 이미지 읽는 중...</>
              : `이미지 ${images.length}장에서 공고 내용 추출하기`}
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </>
  );

  return {
    handlePaste,
    openFilePicker: () => fileInputRef.current?.click(),
    ui,
    savedJds,
    removeSaved,
    hasImages: images.length > 0
  };
}

// 내 공고 보관함 칩 목록 — 클릭 시 텍스트 로드
export function SavedJdChips({
  savedJds,
  onSelect,
  onRemove
}: {
  savedJds: SavedJd[];
  onSelect: (jd: SavedJd) => void;
  onRemove: (id: string) => void;
}) {
  if (savedJds.length === 0) return null;
  return (
    <div className="mt-1.5">
      <p className="text-[10px] text-gray-400 mb-1">📋 내 공고 보관함 (이미지에서 추출한 공고)</p>
      <div className="flex flex-wrap gap-1.5">
        {savedJds.map((jd) => (
          <span key={jd.id} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white pl-2.5 pr-1 py-1 text-xs text-gray-600 hover:border-brand-400">
            <button onClick={() => onSelect(jd)} className="hover:text-brand-600">{jd.name}</button>
            <button onClick={() => onRemove(jd.id)} className="text-gray-300 hover:text-red-400 px-0.5">✕</button>
          </span>
        ))}
      </div>
    </div>
  );
}
