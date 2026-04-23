import { useState, useRef } from "react";
import { Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  name: string;
  photoUrl: string | null;
  studentId: string;
  canUpload?: boolean;
  onUploaded?: (url: string) => void;
}

export default function StudentAvatar({ name, photoUrl, studentId, canUpload = false, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const showImage = photoUrl && !imgError;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `profiles/${studentId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("student-photos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("student-photos")
        .getPublicUrl(path);

      await supabase.from("students").update({ profile_photo_url: publicUrl }).eq("id", studentId);
      setImgError(false);
      onUploaded?.(publicUrl);
      toast.success("Photo updated!");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group">
      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/30 flex-shrink-0">
        {showImage ? (
          <img
            src={photoUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full gradient-primary flex items-center justify-center text-primary-foreground text-3xl font-bold">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {canUpload && (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </>
      )}
    </div>
  );
}
