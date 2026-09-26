import { CircleNotch, Coffee } from "@phosphor-icons/react/dist/ssr";

export default function TranslateLoading() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col items-center justify-center min-h-[60vh] text-center gap-8">
      {/* Brutalist pulsing card */}
      <div className="bg-[#1a130e] text-white p-8 sm:p-12 border-2 border-black max-w-xl w-full flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden">
        {/* Animated Top Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#b8f600] via-[#001ec0] to-[#b8f600] animate-pulse" />

        {/* Big Rotating Spinner */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          <CircleNotch
            size={72}
            weight="bold"
            className="animate-spin text-[#b8f600] absolute"
          />
          <Coffee size={32} weight="fill" className="text-white" />
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-mono text-[11px] font-extrabold uppercase px-2.5 py-0.5 bg-[#b8f600] text-[#141f00] self-center">
            GEMINI MULTIMODAL VIDEO AI
          </span>
          <h2 className="font-syne text-2xl sm:text-3xl font-extrabold text-[#fef8f4] tracking-tight">
            Watching Video &amp; Translating Recipe...
          </h2>
          <p className="font-body text-xs sm:text-sm text-[#d1c4bd] leading-relaxed">
            Downloading video stream via CDN, transcribing on-screen measuring overlays, and calculating equipment brew math.
          </p>
        </div>

        {/* Live Staging Steps Checklist */}
        <div className="w-full bg-[#221a15] border border-white/10 p-4 flex flex-col gap-2.5 text-left font-mono text-xs">
          <div className="flex items-center gap-2 text-[#b8f600]">
            <span className="w-2 h-2 bg-[#b8f600] rounded-full animate-ping" />
            <span>[1/3] Downloading MP4 video stream...</span>
          </div>
          <div className="flex items-center gap-2 text-[#dfe0ff]">
            <CircleNotch size={14} weight="bold" className="animate-spin text-[#001ec0]" />
            <span>[2/3] Gemini AI inspecting frames &amp; text stickers...</span>
          </div>
          <div className="flex items-center gap-2 text-[#7f756f]">
            <span className="w-2 h-2 bg-[#7f756f] rounded-full" />
            <span>[3/3] Calculating Cometeer, Vertuo &amp; Instant brew math...</span>
          </div>
        </div>

        <span className="font-mono text-[11px] text-[#a89e97]">
          Takes ~6–8 seconds. Please do not refresh.
        </span>
      </div>
    </div>
  );
}
