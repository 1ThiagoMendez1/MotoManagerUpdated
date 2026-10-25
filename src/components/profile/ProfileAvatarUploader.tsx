'use client';
import { useRef, useState } from 'react';
import { Camera, Loader2, UserRound } from 'lucide-react';
import { uploadOwnAvatar } from '@/app/clientes/reputation-actions';
export function ProfileAvatarUploader({ initialUrl, name, onUploaded }: { initialUrl?: string | null; name?: string; onUploaded?: (url: string) => void }) {
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setMessage('La foto debe pesar menos de 2 MB.'); return; }
    setLoading(true); setMessage('');
    try {
      const form = new FormData();
      form.set('avatar', file);
      const res = await uploadOwnAvatar(form);
      setMessage(res.message);
      if (res.success && res.url) { setUrl(res.url); onUploaded?.(res.url); }
    } catch { setMessage('No se pudo cargar la imagen.'); }
    finally { setLoading(false); if (fileRef.current) fileRef.current.value = ''; }
  }
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-blue-400/40 bg-slate-800">
        {url ? <img src={url} alt="Tu foto de perfil" className="h-full w-full object-cover" /> :
          <UserRound aria-hidden="true" className="absolute inset-5 h-10 w-10 text-slate-400" />}
      </div>
      <div>
        <div className="font-semibold text-sm">{name ? 'Perfil de ' + name : 'Mi foto de perfil'}</div>
        <p className="mb-2 text-xs opacity-70">JPG, PNG o WebP · Máximo 2 MB · Foto privada</p>
        <input ref={fileRef} type="file" className="sr-only" id="profile-avatar-upload"
          accept="image/jpeg,image/png,image/webp" disabled={loading}
          onChange={event => void upload(event.target.files?.[0])} />
        <label htmlFor="profile-avatar-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-400/40 px-3 py-2 text-sm hover:bg-blue-500/10">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {loading ? 'Subiendo foto...' : 'Cambiar mi foto'}
        </label>
        {message && <p role="status" className="mt-2 max-w-sm text-xs opacity-85">{message}</p>}
      </div>
    </div>
  );
}
