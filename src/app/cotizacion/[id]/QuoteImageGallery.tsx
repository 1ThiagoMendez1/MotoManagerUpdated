"use client"

import React, { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

export function QuoteImageGallery({ images }: { images: any[] }) {
  const [selectedImage, setSelectedImage] = useState<any>(null)

  if (!images || images.length === 0) return null

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {images.map((img: any) => (
          <div 
            key={img.id} 
            className="relative group rounded-xl overflow-hidden border border-slate-800/50 bg-slate-950/50 aspect-video shadow-sm cursor-pointer"
            onClick={() => setSelectedImage(img)}
          >
            <Image
              src={img.image_url}
              alt={img.description || 'Evidencia'}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
              <p className="text-slate-200 text-sm font-medium leading-relaxed drop-shadow-md">
                {img.description || 'Ver imagen'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 overflow-hidden bg-transparent border-none shadow-none">
          <DialogTitle className="sr-only">Evidencia Fotográfica</DialogTitle>
          {selectedImage && (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <div className="relative w-full h-full">
                <Image
                  src={selectedImage.image_url}
                  alt={selectedImage.description || 'Evidencia'}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
              {selectedImage.description && (
                <div className="absolute bottom-4 inset-x-4 md:inset-x-auto md:bottom-8 bg-slate-950/80 p-4 rounded-xl text-center backdrop-blur-md border border-slate-800/50 shadow-xl max-w-2xl mx-auto">
                  <p className="text-slate-200 text-base md:text-lg">{selectedImage.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
