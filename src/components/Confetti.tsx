'use client';

import { useEffect, useState } from 'react';

const COLOURS = ['#facc15', '#34d399', '#60a5fa', '#f472b6', '#fb923c', '#a78bfa'];
const COUNT = 24;

interface Piece {
  id: number;
  colour: string;
  left: number;
  delay: number;
  size: number;
  duration: number;
}

export default function Confetti() {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    setPieces(
      Array.from({ length: COUNT }, (_, i) => ({
        id: i,
        colour: COLOURS[i % COLOURS.length],
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        size: 6 + Math.random() * 6,
        duration: 0.9 + Math.random() * 0.6,
      })),
    );
  }, []);

  if (pieces.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: 0,
            width: p.size,
            height: p.size,
            background: p.colour,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-out forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
