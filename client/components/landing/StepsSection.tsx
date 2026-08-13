/**
 * StepsSection
 *
 * "Four Steps From First Tap to Real Opportunity" explainer for the ROICARD
 * journey in the warm marketing palette.
 */

const STEPS = [
  {
    number: "01",
    label: "CREATE",
    title: "Create",
    description:
      "Build your professional identity profile — who you are, what you do, and what you're seeking or offering.",
  },
  {
    number: "02",
    label: "CONNECT",
    title: "Connect",
    description:
      "Share it instantly through your Smart Card, a tap, a QR code, or your profile link. No app. No fumbling.",
  },
  {
    number: "03",
    label: "ENGAGE",
    title: "Engage",
    description:
      "The connection doesn't end at the tap. Message, follow up, and build the relationship over time.",
  },
  {
    number: "04",
    label: "DISCOVER",
    title: "Discover Opportunities",
    description:
      "Every profile, every connection, every conversation feeds into one thing: real opportunity.",
  },
] as const;

export function StepsSection() {
  return (
    <section id="how" className="border-t border-white/[0.08] px-8 py-[100px]">
      <div className="mx-auto max-w-[1180px]">
        <div className="mx-auto mb-14 max-w-[640px] text-center">
          <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-[rgba(255,122,61,0.4)] bg-[rgba(255,122,61,0.08)] px-[14px] py-[7px] font-display text-[12.5px] font-bold uppercase tracking-[0.08em] text-[#FF7A3D]">
            How it works
          </p>
          <h2 className="font-display text-[32px] font-extrabold tracking-[-0.02em] text-[#F5F3F0] sm:text-[40px]">
            Four Steps From First Tap to Real Opportunity
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#A8A29A]">
            Roicard isn&apos;t a one-time exchange. It&apos;s a journey — from
            the moment someone taps your card to the relationships and
            opportunities that follow.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="relative rounded-[18px] border border-white/[0.08] bg-[#16130F] px-6 py-7"
            >
              <p className="mb-4 font-display text-[13px] font-extrabold tracking-[0.05em] text-[#FF7A3D]">
                {step.number} — {step.label}
              </p>
              <h3 className="font-display text-[17px] font-bold text-[#F5F3F0]">
                {step.title}
              </h3>
              <p className="mt-[10px] text-[14px] leading-[1.6] text-[#A8A29A]">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-[16px] italic text-[#A8A29A]">
          <strong className="font-semibold not-italic text-[#F5F3F0]">
            Meaningful relationships create meaningful opportunities.
          </strong>
          <br />
          This is how Roicard makes that real, one connection at a time.
        </p>
      </div>
    </section>
  );
}