'use client';

import { useState } from 'react';
import { Wrench } from 'lucide-react';

export function WorkshopImage({ src, name, className = '', imageClassName = 'object-cover' }: {
  src?: string | null; name: string; className?: string; imageClassName?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return <div className={`relative overflow-hidden bg-muted ${className}`}>
    {src && failedSrc !== src
      ? <img src={src} alt={`Imagen de ${name}`} loading="lazy" decoding="async"
          className={`h-full w-full ${imageClassName}`} onError={() => setFailedSrc(src)} />
      : <div className="flex h-full w-full items-center justify-center bg-primary/5 text-primary/60">
          <Wrench aria-hidden="true" className="h-10 w-10" />
          <span className="sr-only">{name}: imagen pendiente</span>
        </div>}
  </div>;
}
