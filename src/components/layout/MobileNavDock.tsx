"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Scale, Search, Heart, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCompareCount } from "@/hooks/useCompareCount";
import { SAVED_EVENT } from "@/components/search/useSavedColleges";
import { useScrollAwareVisibility } from "@/hooks/useScrollAwareVisibility";
import { useAnyOverlayOpen } from "@/hooks/useAnyOverlayOpen";

interface MobileNavDockProps {
  onOpenAuthModal?: (mode: "login" | "signup") => void;
}

export default function MobileNavDock({ onOpenAuthModal }: MobileNavDockProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const compareCount = useCompareCount();

  const [savedCount, setSavedCount] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentHash, setCurrentHash] = useState<string>("");

  // Sync hash state on mount and route changes
  useEffect(() => {
    const updateHash = () => {
      if (typeof window !== "undefined") {
        setCurrentHash(window.location.hash);
      }
    };

    updateHash();
    window.addEventListener("hashchange", updateHash);
    window.addEventListener("popstate", updateHash);
    return () => {
      window.removeEventListener("hashchange", updateHash);
      window.removeEventListener("popstate", updateHash);
    };
  }, [pathname]);

  // Visibility: hidden on scroll-down (shown again on scroll-up) and hidden
  // while any modal/drawer/bottom-sheet is open. The Compare Deck (see
  // CompareDeck.tsx) stacks above this dock via --mobile-nav-height rather
  // than sharing its space, so no special-casing is needed here.
  const scrollVisible = useScrollAwareVisibility();
  const overlayOpen = useAnyOverlayOpen();
  const visible = scrollVisible && !overlayOpen;

  // Measure the dock's own footprint (height + its offset from the viewport
  // bottom) and publish it as `--mobile-nav-height` so pages can reserve
  // exactly enough bottom padding (see Footer.tsx) instead of guessing a
  // pixel value. Only updates while visible, so a temporary scroll-hide never
  // shrinks the published value.
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const measure = () => {
      const space = window.innerHeight - el.getBoundingClientRect().top;
      if (space > 0) {
        document.documentElement.style.setProperty(
          "--mobile-nav-height",
          `${Math.round(space)}px`,
        );
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Track page scroll progress for top slender indicator bar
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keep the saved-colleges badge in sync: fetch the count for a signed-in user
  // and refresh it whenever a save/unsave happens anywhere this session.
  useEffect(() => {
    let active = true;
    const updateSavedState = async () => {
      if (!user) {
        if (active) setSavedCount(0);
        return;
      }
      try {
        const { fetchSavedColleges } = await import("@/lib/auth/api");
        const list = await fetchSavedColleges();
        if (active) setSavedCount(list.length);
      } catch {
        if (active) setSavedCount(0);
      }
    };

    updateSavedState();
    window.addEventListener(SAVED_EVENT, updateSavedState);
    return () => {
      active = false;
      window.removeEventListener(SAVED_EVENT, updateSavedState);
    };
  }, [user]);

  const navItems = [
    { id: "home", label: "Home", href: "/", icon: Home },
    {
      id: "compare",
      label: "Compare",
      href: "/compare",
      icon: Scale,
      badge: user ? compareCount : 0,
    },
    {
      id: "search",
      label: "Search",
      href: "/#search-programs-section-mobile",
      icon: Search,
    },
    {
      id: "saved",
      label: "Saved",
      href: "/profile#saved_colleges_section",
      icon: Heart,
      hasNotification: savedCount > 0,
      requiresAuth: true,
    },
    {
      id: "profile",
      label: "Account",
      href: "/profile",
      icon: User,
      requiresAuth: true,
    },
  ];

  const getActiveIndex = () => {
    if (pathname === "/compare" || pathname.startsWith("/compare")) return 1;

    if (
      pathname === "/search" ||
      pathname.startsWith("/search") ||
      (pathname === "/" && currentHash === "#search-programs-section-mobile")
    ) {
      return 2;
    }

    if (
      (pathname.includes("/profile") || pathname.includes("/account")) &&
      currentHash === "#saved_colleges_section"
    ) {
      return 3;
    }

    if (pathname.includes("/profile") || pathname.includes("/account")) {
      return 4;
    }

    return 0; // default Home
  };

  const activeIndex = getActiveIndex();

  const handleItemClick = (e: React.MouseEvent, item: (typeof navItems)[0]) => {
    if (item.requiresAuth && !user) {
      e.preventDefault();
      if (onOpenAuthModal) {
        onOpenAuthModal("login");
      } else {
        router.push("/?login=1");
      }
      return;
    }

    if (item.id === "search") {
      e.preventDefault();
      if (pathname === "/") {
        window.history.pushState(null, "", "/#search-programs-section-mobile");
        setCurrentHash("#search-programs-section-mobile");
        document
          .getElementById("search-programs-section-mobile")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        router.push("/#search-programs-section-mobile");
      }
      return;
    }

    if (item.id === "saved") {
      if (pathname === "/profile") {
        e.preventDefault();
        window.history.pushState(null, "", "/profile#saved_colleges_section");
        // pushState fires no hashchange; let the section open itself.
        window.dispatchEvent(new HashChangeEvent("hashchange"));
        setCurrentHash("#saved_colleges_section");
        document
          .getElementById("saved_colleges_section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    if (item.id === "home") {
      if (pathname === "/") {
        e.preventDefault();
        window.history.pushState(null, "", "/");
        setCurrentHash("");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    if (item.id === "profile") {
      if (pathname === "/profile") {
        e.preventDefault();
        window.history.pushState(null, "", "/profile");
        setCurrentHash("");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
  };

  return (
    <div
      ref={wrapperRef}
      aria-hidden={!visible}
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      className={`fixed left-1/2 -translate-x-1/2 z-[90] w-[92%] max-w-[420px] lg:hidden select-none animate-fade-in transition-transform duration-300 ease-out ${
        visible
          ? "translate-y-0 pointer-events-auto"
          : "translate-y-[150%] pointer-events-none"
      }`}
    >
      {/* Top Slim Scroll Progress Bar */}
      <div className="w-full h-[3px] bg-slate-200/60 rounded-full mb-2 overflow-hidden backdrop-blur-md shadow-sm">
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 transition-all duration-150 ease-out rounded-full shadow-[0_0_10px_rgba(37,99,235,0.6)]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Floating Liquid Pill Dock */}
      <nav
        aria-label="Primary"
        className="relative flex items-center justify-between gap-1 bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_-8px_rgba(15,23,42,0.25)] rounded-full px-1.5 py-1.5"
      >
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeIndex === index;
          const isProfile = item.id === "profile";
          const showBadge =
            !isActive && item.badge !== undefined && item.badge > 0;
          const showDot = !isActive && item.hasNotification;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={(e) => handleItemClick(e, item)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              style={{
                transition:
                  "background-color 300ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 300ms cubic-bezier(0.34,1.56,0.64,1), padding 300ms cubic-bezier(0.34,1.56,0.64,1), transform 150ms ease-out",
              }}
              className={`relative flex h-11 flex-none items-center justify-center rounded-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-90 ${
                isActive
                  ? "bg-blue-600 px-3.5 shadow-[0_4px_16px_-2px_rgba(37,99,235,0.55)]"
                  : "w-11 px-0 hover:bg-slate-900/[0.04]"
              }`}
            >
              <div className="relative flex items-center justify-center shrink-0">
                {isProfile ? (
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full overflow-hidden ${
                      isActive ? "bg-white" : "bg-slate-200"
                    }`}
                  >
                    {user?.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.photoURL}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Icon
                        className={`w-3.5 h-3.5 ${isActive ? "text-blue-600" : "text-slate-400"}`}
                        strokeWidth={2.5}
                      />
                    )}
                  </span>
                ) : (
                  <Icon
                    className={`w-5 h-5 transition-all duration-200 ${
                      isActive
                        ? "text-white stroke-[2.5px]"
                        : "text-slate-400 stroke-[1.8px]"
                    }`}
                  />
                )}

                {/* Compare Count Badge — only when this tab isn't the active one */}
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[15px] h-[15px] px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold ring-2 ring-white leading-none">
                    {item.badge}
                  </span>
                )}

                {/* Red Notification Dot - only when this tab isn't the active one */}
                {showDot && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
                )}
              </div>

              {/* Label reveal — width driven by grid-template-columns so each
                  tab's expanded width tracks its own label length. */}
              <span
                className={`grid overflow-hidden transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  isActive ? "grid-cols-[1fr]" : "grid-cols-[0fr]"
                }`}
              >
                <span className="overflow-hidden whitespace-nowrap">
                  <span
                    className={`inline-block pl-1.5 text-[13px] font-semibold text-white transition-opacity duration-200 ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {item.label}
                  </span>
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
