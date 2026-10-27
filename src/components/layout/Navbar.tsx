"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { useBilling } from "@/context/BillingContext";
import { useCompareCount } from "@/hooks/useCompareCount";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import { useLoginModal } from "@/hooks/useLoginModal";
import { useFitLoginRedirect } from "@/hooks/useFitLoginRedirect";
import { useSaveLoginRedirect } from "@/hooks/useSaveLoginRedirect";

import LoginModal from "../auth/LoginModal";
import MobileNavDock from "./MobileNavDock";
import NavbarBrand from "./navbar/NavbarBrand";
import DesktopNavLinks from "./navbar/DesktopNavLinks";
import AuthButtons from "./navbar/AuthButtons";
import UserMenu from "./navbar/UserMenu";
import MobileNavMenu from "./navbar/MobileNavMenu";
import HamburgerIcon from "./navbar/HamburgerIcon";
import EmailVerificationBanner from "./navbar/EmailVerificationBanner";
import { buildUserMenuItems } from "./navbar/userMenuItems";

const Navbar = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const isLoggedIn = !!user;
  const { isMember } = useBilling();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const compareCount = useCompareCount();
  const { resending, resent, resendError, handleResendEmail } =
    useEmailVerification();
  const {
    isOpen: isLoginModalOpen,
    mode: authMode,
    open: openAuthModal,
    close: closeLoginModal,
  } = useLoginModal(user);

  useFitLoginRedirect(user);
  useSaveLoginRedirect(user);

  const handleSignOut = async () => {
    await logout();
    setIsMobileMenuOpen(false);
    router.push("/");
  };

  const firstName =
    user?.displayName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "Account";
  const avatarInitial = (user?.displayName ?? user?.email ?? "U")
    .charAt(0)
    .toUpperCase();

  const userMenuItems = buildUserMenuItems(router, handleSignOut);

  const handleMobileSignIn = () => {
    openAuthModal("login");
    setIsMobileMenuOpen(false);
  };
  const handleMobileSignUp = () => {
    openAuthModal("signup");
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {isLoggedIn && !user?.emailVerified && (
        <EmailVerificationBanner
          resending={resending}
          resent={resent}
          resendError={resendError}
          onResend={handleResendEmail}
        />
      )}
      <nav className="h-[70px] bg-white sticky top-0 z-50 border-t-[4px] border-[#f0f2f5] shadow-sm flex justify-center w-full">
        <div className="w-full max-w-[2080px] px-6 sm:px-10 lg:px-[36px] h-full flex items-center justify-between">
          <div className="flex items-center gap-4 lg:gap-16">
            <NavbarBrand />
            <DesktopNavLinks
              isLoggedIn={isLoggedIn}
              compareCount={compareCount}
            />
          </div>
          <div className="flex items-center gap-4 sm:gap-8">
            {isLoggedIn ? (
              <UserMenu
                items={userMenuItems}
                avatarInitial={avatarInitial}
                firstName={firstName}
                isPro={isMember}
              />
            ) : (
              <AuthButtons
                onSignIn={() => openAuthModal("login")}
                onSignUp={() => openAuthModal("signup")}
              />
            )}

            <button
              className="lg:hidden text-[#4b5563] p-1 cursor-pointer"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <HamburgerIcon isOpen={isMobileMenuOpen} />
            </button>
          </div>
        </div>

        <MobileNavMenu
          isOpen={isMobileMenuOpen}
          isLoggedIn={isLoggedIn}
          compareCount={compareCount}
          firstName={firstName}
          onClose={() => setIsMobileMenuOpen(false)}
          onSignIn={handleMobileSignIn}
          onSignUp={handleMobileSignUp}
          onSignOut={handleSignOut}
        />
      </nav>

      <LoginModal
        isOpen={isLoginModalOpen}
        initialMode={authMode}
        onClose={closeLoginModal}
        onSuccess={closeLoginModal}
      />

      <MobileNavDock onOpenAuthModal={openAuthModal} />
    </>
  );
};

export default Navbar;
