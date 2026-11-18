import type { DocumentSection } from '@/types/docsetu';

export function SourceImages({ section }: { section: DocumentSection }) {
  const images = section.images?.filter(image =>
    /^image\/(?:png|jpeg|gif|webp)$/i.test(image.mimeType) && image.base64 && /^[a-z0-9+/]+=*$/i.test(image.base64),
  );
  if (!images?.length) return null;
  return <details className="source-disclosure">
    <summary>Source images ({images.length})</summary>
    {images.map((image, index) => <figure className="mt-4" key={index}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Authorized inline source image with unknown dimensions. */}
      <img className="block h-auto max-w-full" src={`data:${image.mimeType};base64,${image.base64}`}
        alt={image.caption || `Source image ${index + 1} from ${section.title}`} loading="lazy" />
      {image.caption && <figcaption className="muted">{image.caption}</figcaption>}
    </figure>)}
  </details>;
}
