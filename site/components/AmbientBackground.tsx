/**
 * AmbientBackground — the drifting gradient orbs behind the page.
 *
 * Purely decorative (aria-hidden, pointer-events-none). If the animation
 * ever feels heavy on low-end devices, delete this component's usage in
 * app/page.tsx — the page works fine on the flat base color.
 *
 * NOTE: keep the blur radius modest (<=70px). iOS Safari kills the web
 * process when giant blurred layers exhaust graphics memory, which shows
 * as the page flashing then going white.
 */
const orbs = [
  "absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full bg-[#a5b4fc] opacity-70 blur-[70px] [animation:snc-float-1_16s_ease-in-out_infinite]",
  "absolute top-[20%] -right-40 h-[400px] w-[400px] rounded-full bg-[#f9a8d4] opacity-60 blur-[70px] [animation:snc-float-2_20s_ease-in-out_infinite]",
  "absolute top-[55%] -left-40 h-[380px] w-[380px] rounded-full bg-[#99e6d9] opacity-55 blur-[70px] [animation:snc-float-3_18s_ease-in-out_infinite]",
  "absolute bottom-[-10%] right-[10%] h-[360px] w-[360px] rounded-full bg-[#fdba74] opacity-50 blur-[70px] [animation:snc-float-1_22s_ease-in-out_infinite]",
];

export default function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0">
      {orbs.map((classes, i) => (
        <div key={i} className={classes} />
      ))}
    </div>
  );
}
