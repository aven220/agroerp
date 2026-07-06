interface SkeletonProps {
  variant?: 'text' | 'title' | 'avatar' | 'rect';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({ variant = 'text', width, height, className = '' }: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  const variantClass = {
    text: 'ds-skeleton-text',
    title: 'ds-skeleton-title',
    avatar: 'ds-skeleton-avatar',
    rect: '',
  }[variant];

  return <div className={`ds-skeleton ${variantClass} ${className}`.trim()} style={style} aria-hidden />;
}

export function SkeletonGroup({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <Skeleton variant="title" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} variant="text" width={i === rows - 1 ? '70%' : '100%'} />
      ))}
    </div>
  );
}
