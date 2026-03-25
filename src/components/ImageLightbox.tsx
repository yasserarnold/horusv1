import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  alt: string;
  onClose: () => void;
}

export const ImageLightbox = ({
  images,
  initialIndex = 0,
  alt,
  onClose,
}: ImageLightboxProps) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (images.length <= 1) {
        return;
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
      } else if (event.key === "ArrowLeft") {
        setActiveIndex((prev) => (prev + 1) % images.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, onClose]);

  if (images.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-6xl items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-20 rounded-full bg-black/60 p-3 text-white transition-colors hover:bg-black/80"
          aria-label="إغلاق الصورة"
        >
          <X className="h-6 w-6" />
        </button>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setActiveIndex((prev) => (prev - 1 + images.length) % images.length)
              }
              className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white transition-colors hover:bg-black/80"
              aria-label="الصورة السابقة"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveIndex((prev) => (prev + 1) % images.length)
              }
              className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white transition-colors hover:bg-black/80"
              aria-label="الصورة التالية"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          </>
        )}

        <img
          src={images[activeIndex]}
          alt={alt}
          className="max-h-[90vh] w-full rounded-2xl bg-slate-950 object-contain"
        />

        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-4 py-2 text-sm font-bold text-white">
            {activeIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
};
