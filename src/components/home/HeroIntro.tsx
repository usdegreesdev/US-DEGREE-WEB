function TrustDot() {
  return (
    <span
      className="text-[#9ca3af] text-[6px] sm:text-[8px] lg:text-[10px] leading-none select-none"
      aria-hidden="true"
    >
      ●
    </span>
  );
}

export default function HeroIntro() {
  return (
    <>
      <span className="mb-5 inline-block rounded-full bg-[#ff3b30] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white">
        TOP-TIER EDUCATION
      </span>

      <h1
        className="
                mb-4 lg:mb-6
                max-w-[600px]
                text-[48px]
                sm:text-[64px]
                lg:text-[78px]
                font-bold
                leading-[0.95]
                tracking-[-0.04em]
                text-[#111827]
              "
      >
        The Neutral Way to Choose a
        <span className="text-[#3b5bdb]"> U.S. </span>
        <span> Degree </span>
      </h1>

      {/* Trust badges */}
      <p
        className="
                mb-6
                flex flex-wrap items-center
                gap-x-1.5 sm:gap-x-2 gap-y-1
                text-[12px] sm:text-[20px] lg:text-[25px]
                text-[#1f2937]
                tracking-[-0.01em]
              "
      >
        <span>Family-funded</span>
        <TrustDot />
        <span>Conflict-free</span>
        <TrustDot />
        <span>Built on verified data</span>
      </p>

      <p
        className="
                mb-6 lg:mb-8
                max-w-[650px]
                text-[16px]
                sm:text-[18px]
                leading-[1.3]
                text-[#4b5563]
              "
      >
        Navigate the complex world of American higher education with ease. Our
        mission is to connect ambitious students with programs that fuel passion
        and guarantee success.
      </p>
    </>
  );
}
