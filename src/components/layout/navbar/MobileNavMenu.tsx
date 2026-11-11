"use client";

import Link from "next/link";
import {
  Home,
  Scale,
  User,
  Heart,
  FileText,
  LogOut,
  LogIn,
  Sparkles,
  ChevronRight,
} from "lucide-react";

import CompareBadge from "./CompareBadge";

interface MobileNavMenuProps {
  isOpen: boolean;
  isLoggedIn: boolean;
  compareCount: number;
  firstName: string;
  onClose: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onSignOut: () => void;
}

export default function MobileNavMenu({
  isOpen,
  isLoggedIn,
  compareCount,
  firstName,
  onClose,
  onSignIn,
  onSignUp,
  onSignOut,
}: MobileNavMenuProps) {
  return (
    <div
      className={`fixed inset-0 top-[70px] z-40 lg:hidden transition-all duration-300 ease-in-out ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile Drawer Sheet */}
      <div
        className={`relative w-full z-50 transition-all duration-300 ease-in-out ${
          isOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
        }`}
      >
        <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xl rounded-b-2xl overflow-hidden max-h-[82vh] overflow-y-auto">
          <div className="p-3.5 sm:p-4 flex flex-col gap-3">
            {/* Header Row: Section Label + User Profile Badge on Opposite Side */}
            {/* <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Explore & Tools
              </span>

              {isLoggedIn && (
                <div className="flex items-center gap-1.5 py-0.5 px-2 rounded-full bg-blue-50/80 border border-blue-100/80">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 select-none">
                    {firstName ? firstName.charAt(0).toUpperCase() : "U"}
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 truncate max-w-[100px]">
                    {firstName || "Student"}
                  </span>
                </div>
              )}
            </div> */}

            {/* Grid of Compact Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {/* Home Tile */}
              <Link
                href="/"
                onClick={onClose}
                className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-slate-50/80 hover:bg-blue-50/60 border border-slate-100 hover:border-blue-200/80 transition-all duration-150 group active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-150">
                    <Home className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-800 text-xs leading-tight truncate group-hover:text-blue-600 transition-colors">
                      Home
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium leading-tight truncate group-hover:text-blue-500/80 transition-colors">
                      Main Portal
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 shrink-0 transition-all" />
              </Link>

              {/* Compare Colleges Tile */}
              <Link
                href="/compare"
                onClick={onClose}
                className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-slate-50/80 hover:bg-indigo-50/60 border border-slate-100 hover:border-indigo-200/80 transition-all duration-150 group active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-150">
                    <Scale className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-800 text-xs leading-tight truncate group-hover:text-indigo-600 transition-colors">
                      Compare
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium leading-tight truncate group-hover:text-indigo-500/80 transition-colors">
                      Side-by-Side
                    </span>
                  </div>
                </div>
                {isLoggedIn && compareCount > 0 ? (
                  <CompareBadge count={compareCount} />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0 transition-all" />
                )}
              </Link>

              {/* Logged-In User Specific Tiles */}
              {isLoggedIn && (
                <>
                  {/* My Profile Tile */}
                  <Link
                    href="/profile"
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-slate-50/80 hover:bg-sky-50/60 border border-slate-100 hover:border-sky-200/80 transition-all duration-150 group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-150">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-800 text-xs leading-tight truncate group-hover:text-sky-600 transition-colors">
                          My Profile
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium leading-tight truncate group-hover:text-sky-500/80 transition-colors">
                          Account & Info
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-sky-500 shrink-0 transition-all" />
                  </Link>

                  {/* Saved Colleges Tile */}
                  <Link
                    href="/profile#saved_colleges_section"
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-slate-50/80 hover:bg-rose-50/60 border border-slate-100 hover:border-rose-200/80 transition-all duration-150 group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-150">
                        <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-800 text-xs leading-tight truncate group-hover:text-rose-600 transition-colors">
                          Saved
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium leading-tight truncate group-hover:text-rose-500/80 transition-colors">
                          Shortlisted List
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-rose-500 shrink-0 transition-all" />
                  </Link>

                  {/* My Reports Tile */}
                  <Link
                    href="/profile#reports_section"
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-slate-50/80 hover:bg-amber-50/60 border border-slate-100 hover:border-amber-200/80 transition-all duration-150 group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-150">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-800 text-xs leading-tight truncate group-hover:text-amber-600 transition-colors">
                          My Reports
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium leading-tight truncate group-hover:text-amber-500/80 transition-colors">
                          Saved Reports
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-500 shrink-0 transition-all" />
                  </Link>
                </>
              )}
            </div>

            {/* Bottom Actions Area */}
            <div className="border-t border-slate-100 pt-2 flex items-center justify-end">
              {isLoggedIn ? (
                <button
                  onClick={onSignOut}
                  className="flex items-center gap-1.5 py-1 px-3 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-100 hover:border-rose-200 transition-all font-semibold text-xs cursor-pointer active:scale-[0.98] group"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2 w-full">
                  <button
                    onClick={onSignIn}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5 text-slate-600" />
                    <span>Sign In</span>
                  </button>
                  <button
                    onClick={onSignUp}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs active:scale-[0.98] cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                    <span>Get Started</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



