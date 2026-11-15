// Kanban drag and drop for application boards (Hub and /admin), mouse and touch.
// Cards carry data-card="<id>" and data-col="<column>"; columns carry data-drop="<column>".
// Mouse: press and move. Touch: press and hold a moment, then move (a quick swipe still scrolls the page).
// Returns a function that removes the listeners.
export function enableBoardDrag(root: HTMLElement, onDrop: (id: string, col: string, card: HTMLElement, column: HTMLElement) => void): () => void {
  let card: HTMLElement | null = null;
  let ghost: HTMLElement | null = null;
  let over: HTMLElement | null = null;
  let sx = 0, sy = 0, pid = -1, touch = false, ready = false, moved = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const reset = () => {
    clearTimeout(timer);
    ghost?.remove();
    card?.classList.remove("kb-dragging", "kb-hold");
    over?.classList.remove("kb-over");
    document.documentElement.classList.remove("kb-active");
    card = ghost = over = null;
    pid = -1;
  };
  const start = () => {
    if (!card) return;
    const r = card.getBoundingClientRect();
    ghost = card.cloneNode(true) as HTMLElement;
    ghost.classList.add("kb-ghost");
    Object.assign(ghost.style, { position: "fixed", left: r.left + "px", top: r.top + "px", width: r.width + "px", margin: "0", pointerEvents: "none", zIndex: "1000" });
    document.body.appendChild(ghost);
    card.classList.add("kb-dragging");
    card.classList.remove("kb-hold");
    document.documentElement.classList.add("kb-active");
    ready = true;
  };
  const down = (e: PointerEvent) => {
    if (e.button !== 0 || card) return;
    const t = e.target as HTMLElement;
    if (t.closest("a, button, select, input, textarea, summary, label")) return;
    const c = t.closest<HTMLElement>("[data-card]");
    if (!c || !root.contains(c)) return;
    card = c; sx = e.clientX; sy = e.clientY; pid = e.pointerId; touch = e.pointerType !== "mouse"; ready = false; moved = false;
    if (touch) {
      c.classList.add("kb-hold");
      timer = setTimeout(() => { if (card === c) start(); }, 300);
    }
  };
  const move = (e: PointerEvent) => {
    if (!card || e.pointerId !== pid) return;
    const dist = Math.hypot(e.clientX - sx, e.clientY - sy);
    if (!ready) {
      if (touch) { if (dist > 8) reset(); return; } // a swipe before the hold: let the page scroll
      if (dist < 6) return;
      start();
    }
    moved = true;
    e.preventDefault();
    if (ghost) ghost.style.transform = `translate(${e.clientX - sx}px, ${e.clientY - sy}px) rotate(1.5deg)`;
    const col = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-drop]") ?? null;
    const next = col && root.contains(col) ? col : null;
    if (next !== over) { over?.classList.remove("kb-over"); next?.classList.add("kb-over"); over = next; }
    // Scroll the page near the top or bottom edge.
    if (e.clientY < 60) window.scrollBy(0, -12);
    else if (e.clientY > window.innerHeight - 60) window.scrollBy(0, 12);
  };
  const up = (e: PointerEvent) => {
    if (!card || e.pointerId !== pid) return;
    const c = card, target = over, dragged = ready && moved;
    reset();
    if (!dragged) return;
    // Swallow the click that follows a drag (it would open the card).
    const stop = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
    window.addEventListener("click", stop, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
    if (target && target.dataset.drop && target.dataset.drop !== c.dataset.col) onDrop(c.dataset.card || "", target.dataset.drop, c, target);
  };
  const cancel = (e: PointerEvent) => { if (e.pointerId === pid) reset(); };
  // While a touch drag is on, stop the page from scrolling.
  const touchMove = (e: TouchEvent) => { if (card && ready) e.preventDefault(); };
  const ctx = (e: Event) => { if (card) e.preventDefault(); };
  const key = (e: KeyboardEvent) => { if (e.key === "Escape" && card) reset(); };

  root.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancel);
  document.addEventListener("touchmove", touchMove, { passive: false });
  root.addEventListener("contextmenu", ctx);
  document.addEventListener("keydown", key);
  return () => {
    reset();
    root.removeEventListener("pointerdown", down);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancel);
    document.removeEventListener("touchmove", touchMove);
    root.removeEventListener("contextmenu", ctx);
    document.removeEventListener("keydown", key);
  };
}
