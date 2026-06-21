"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function HomePage() {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("recall_theme", "dark");
  }, []);

  return (
    <main
      id="main-content"
      className="landing-page relative min-h-dvh flex flex-col bg-[var(--color-bg)]"
    >
      <div className="relative z-10 px-6 sm:px-10 py-6 sm:py-8">
        <Logo href="/" size="header" />
      </div>

      <div className="relative z-10 flex-1 flex items-center pl-6 pr-6 sm:pl-10 sm:pr-10 lg:pl-12 lg:pr-12 pb-16 w-full max-w-[1600px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-5 xl:gap-6 items-center w-full">
          <div className="space-y-8 min-w-0 lg:max-w-xl lg:justify-self-start lg:ml-10 xl:ml-16">
            <div className="space-y-5">
              <p className="tag-eyebrow font-sans w-fit">
                Detection · Analysis · Pre-emptive Recall
              </p>
              <h1
                className="font-display text-5xl sm:text-6xl lg:text-[4rem] xl:text-[4.5rem] leading-[1.08] text-balance"
                style={{ color: "var(--color-text)" }}
              >
                Automated{" "}
                <span className="whitespace-nowrap">follow-ups</span> for
                patients at risk.
              </h1>
              <p
                className="font-sans text-base sm:text-lg leading-relaxed max-w-lg font-normal"
                style={{ color: "var(--color-muted-2)" }}
              >
                We use real scans to analyze, triage, and detect early stages
                of disease to proactively catch them before they progress.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-1 font-sans">
              <Link href="/dashboard" className="btn-accent">
                Open workspace
              </Link>
              <Link href="/upload" className="btn-primary">
                Upload report
              </Link>
            </div>

            <div
              className="font-sans flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm pt-1"
              style={{ color: "var(--color-muted-2)" }}
            >
              <Link
                href="/p/tok_sarah_abc123"
                className="hover:underline"
                style={{ color: "var(--color-muted)" }}
              >
                Patient portal
              </Link>
              <span aria-hidden>·</span>
              <Link
                href="/p/tok_grandma_chen_xyz789?lang=zh"
                className="hover:underline"
                style={{ color: "var(--color-muted)" }}
              >
                中文 demo
              </Link>
              <span aria-hidden>·</span>
              <Link
                href="/p/tok_alex_ar789?lang=ar-TN"
                className="hover:underline"
                style={{ color: "var(--color-muted)" }}
              >
                عربي demo
              </Link>
            </div>
          </div>

          <div className="flex justify-center lg:justify-start w-full -mt-6 sm:-mt-8 lg:-mt-12">
            <div className="overflow-hidden bg-black size-[min(92vw,480px)] sm:size-[min(85vw,560px)] md:size-[min(75vw,640px)] lg:size-[min(78dvh,740px)] xl:size-[min(84dvh,840px)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/mrigif.gif?v=3"
                alt="Animated MRI scan slices"
                className="block size-full object-contain"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </div>

      <footer
        className="font-sans relative z-10 px-6 sm:px-10 py-6 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm border-t"
        style={{
          color: "var(--color-muted-2)",
          borderColor: "var(--color-border)",
        }}
      >
        <span>Recall · decision support only</span>
        <span>Radiologist sign-off required before patient contact</span>
      </footer>
    </main>
  );
}
