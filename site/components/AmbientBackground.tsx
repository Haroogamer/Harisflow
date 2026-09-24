/**
 * AmbientBackground — the drifting gradient orbs behind the page.
 *
 * Purely decorative (aria-hidden, pointer-events-none). If the animation
 * ever feels heavy on low-end devices, delete this component's usage in
 * app/page.tsx — the page works fine on the flat base color.
 */
const orbs = [
  "absolute -top-40 -left-32 h-[560px] w-[560px] rounded-full bg-[#a5b4fc] opacity-70 blur-[130px] [animation:snc-float-1_16s_ease-in-out_infinite]",
  "absolute top-[20%] -right-40 h-[520px] w-[520px] rounded-full bg-[#f9a8d4] opacity-60 blur-[130px] [animation:snc-float-2_20s_ease-in-out_infinite]",
  "absolute top-[55%] -left-40 h-[480px] w-[480px] rounded-full bg-[#99e6d9] opacity-55 blur-[130px] [animation:snc-float-3_18s_ease-in-out_infinite]",
  "absolute bottom-[-10%] right-[10%] h-[460px] w-[460px] rounded-full bg-[#fdba74] opacity-50 blur-[130px] [animation:snc-float-1_22s_ease-in-out_infinite]",
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
