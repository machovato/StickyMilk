const CATEGORIES = [
  {
    label: "Roaster / Pod Pairing",
    hint: "A bold Cometeer roast or Nespresso capsule to match this build",
  },
  {
    label: "Glassware Spec",
    hint: "Coupe, Collins, or heat-resistant highball for optimal visual layers",
  },
  {
    label: "Texture & Aeration",
    hint: "Handheld microfrother or cobbler shaker for rich dense foam",
  },
  {
    label: "Sweetened Condensed Milk",
    hint: "Longevity Brand (Ông Thọ) or Eagle Brand full-fat dairy",
  },
] as const;

export function BuildYourBar() {
  return (
    <section className="p-6 bg-[#f8f2ee] border border-[#1a130e]/15 text-left">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 bg-[#b8f600] border border-[#1a130e]/20" />
        <h2 className="font-syne text-sm sm:text-base font-bold uppercase tracking-wider text-[#1a130e]">
          Build Your StickyMilk Bar
        </h2>
      </div>
      <p className="mt-1 font-mono text-xs text-[#7f756f]">
        Lab equipment &amp; pantry staples calibrated for this drink
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.label}
            className="p-3.5 bg-white border border-[#1a130e]/10"
          >
            <p className="font-syne text-sm font-bold text-[#1a130e]">
              {cat.label}
            </p>
            <p className="mt-1 font-body text-xs text-[#4d4540]">
              {cat.hint}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
