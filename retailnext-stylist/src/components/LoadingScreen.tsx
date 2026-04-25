import type { PipelineState } from "@/types";

interface Props {
  state: PipelineState;
}

export function LoadingScreen({ state }: Props) {
  const steps = [
    { label: "Imagining your perfect look…", done: !!state.dalleImageUrl },
    { label: "Analyzing the style…", done: !!state.analyzed },
    { label: "Finding matches in our collection…", done: state.stage === "done" },
  ];

  if (state.stage === "error") {
    return (
      <div className="max-w-2xl mx-auto px-12 py-24 text-center">
        <h2 className="font-display text-3xl mb-4">Something went wrong</h2>
        <p className="text-ink/70">{state.error ?? "Please try again."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-12 py-24 text-center">
      {state.dalleImageUrl && (
        <div className="mb-12 animate-in fade-in duration-700">
          <img
            src={state.dalleImageUrl}
            alt="Your style inspiration"
            className="w-[360px] h-[360px] mx-auto rounded-sm shadow-xl object-cover"
          />
          <div className="text-[10px] uppercase tracking-widest text-ink/50 mt-4">your style inspiration</div>
        </div>
      )}

      <div className="space-y-6 max-w-md mx-auto">
        {steps.map((s, i) => {
          const inProgress = !s.done && (i === 0 || steps[i - 1].done);
          return (
            <div key={i} className="flex items-center gap-4 text-left">
              <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                {s.done ? (
                  <span className="text-accent text-lg">✓</span>
                ) : inProgress ? (
                  <span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin" />
                ) : (
                  <span className="w-3 h-3 rounded-full border border-ink/20" />
                )}
              </div>
              <span className={`font-display text-xl ${s.done ? "text-ink" : "text-ink/50"}`}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
