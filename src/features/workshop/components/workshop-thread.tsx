import { type RefObject, useEffect, useState } from 'react';

interface WorkshopThreadProps {
  roomRef: RefObject<HTMLDivElement | null>;
}

export function WorkshopThread({ roomRef }: WorkshopThreadProps) {
  const [path, setPath] = useState('');

  useEffect(() => {
    const room = roomRef.current;
    if (!room) return;
    const overview = room.querySelector('.overview-duck-feed');
    const surfaces = [...room.querySelectorAll<HTMLElement>('[data-surface]')];
    if (!overview || surfaces.length === 0) return;

    function measure() {
      if (!room || !overview) return;
      const bounds = room.getBoundingClientRect();
      const start = overview.getBoundingClientRect();
      const x = start.left - bounds.left + start.width * 0.4;
      const y = start.top - bounds.top + start.height * 0.7;
      let d = `M ${x} ${y}`;
      let previousX = x;
      let previousY = y;

      for (const [index, surface] of surfaces.entries()) {
        const rect = surface.getBoundingClientRect();
        const targetX =
          rect.left -
          bounds.left +
          rect.width * [0.42, 0.64, 0.38, 0.57][index % 4];
        const targetY =
          rect.top -
          bounds.top +
          rect.height * [0.58, 0.46, 0.64, 0.51][index % 4];
        const edge = index % 2 === 0 ? -32 : bounds.width + 32;
        // Cross the gap below the preceding caption, then tuck under the next plane.
        const previousArea = surfaces[index - 1]?.closest('.work-area');
        const bendY = previousArea
          ? previousArea.getBoundingClientRect().bottom - bounds.top - 28
          : previousY + (targetY - previousY) * 0.2;
        const direction = index % 2 === 0 ? -1 : 1;
        const exitY = previousArea
          ? surfaces[index - 1].getBoundingClientRect().bottom - bounds.top + 18
          : bendY;
        if (previousArea) {
          const previousRect = surfaces[index - 1].getBoundingClientRect();
          const hemY = previousRect.bottom - bounds.top;
          const slack = [26, 42, 32, 48][index % 4];
          const loopX = previousX + (edge - previousX) * 0.58;
          const loopWidth = Math.min(52, bounds.width * 0.065);
          d += ` C ${previousX + direction * 65} ${previousY + 90}, ${loopX - direction * 80} ${hemY + slack}, ${loopX} ${hemY + 24}`;
          if (index % 2 === 1) {
            d += ` C ${loopX + direction * loopWidth} ${hemY - 20}, ${loopX - direction * loopWidth} ${hemY - 18}, ${loopX - direction * 12} ${hemY + 22}`;
            d += ` C ${loopX + direction * 14} ${hemY + 54}, ${edge - direction * 65} ${exitY - 10}, ${edge} ${exitY}`;
          } else {
            d += ` C ${loopX + direction * 48} ${hemY - 2}, ${edge - direction * 85} ${exitY + 46}, ${edge} ${exitY}`;
          }
        } else {
          d += ` C ${previousX - 140} ${previousY + 90}, 130 ${exitY + 38}, ${edge} ${exitY}`;
        }
        if (previousArea) {
          d += ` C ${edge + direction * 80} ${exitY + 60}, ${edge + direction * 55} ${bendY - 60}, ${edge} ${bendY}`;
        }
        d += ` C ${edge + direction * 100} ${bendY + 100}, ${edge - direction * 110} ${targetY + 70}, ${targetX} ${targetY}`;
        previousX = targetX;
        previousY = targetY;
      }
      const lastBottom =
        surfaces[surfaces.length - 1].getBoundingClientRect().bottom -
        bounds.top;
      d += ` C ${previousX - 100} ${previousY + 45}, 25 ${lastBottom - 30}, -35 ${lastBottom + 18}`;
      setPath(d);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(room);
    for (const surface of surfaces) observer.observe(surface);
    measure();
    return () => observer.disconnect();
  }, [roomRef]);

  return (
    <svg className="workshop-thread" fill="none" aria-hidden="true">
      <path d={path} />
      <path className="fibre-fuzz" d={path} />
    </svg>
  );
}
