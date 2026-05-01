"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export function PublicNav() {
  const pathname = usePathname();
  const dialogId = useId();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasMobileOpenRef = useRef(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      closeButtonRef.current?.focus();
    } else {
      document.body.style.overflow = "";
      if (wasMobileOpenRef.current) {
        triggerButtonRef.current?.focus();
      }
    }
    wasMobileOpenRef.current = mobileOpen;
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  const navLinks = [
    { href: "/features", label: "Features" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ] as const;

  return (
    <>
      <nav
        className="pub-nav"
        aria-label="Main navigation"
        data-scrolled={scrolled || undefined}
      >
        <div className="pub-nav-inner">
          <Link href="/" className="pub-nav-logo" aria-label="Agrodomain — The Super-Platform for African Agriculture">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <circle cx="18" cy="18" r="16" fill="#2d5a3d" opacity="0.12" />
              <path d="M18 28V16c0-6 3.5-10.5 10-13-6.5 2.5-8.5 7-10 13z" fill="#2d5a3d" />
              <path d="M18 28V16c0-6-3.5-10.5-10-13 6.5 2.5 8.5 7 10 13z" fill="#4a8c5e" opacity="0.7" />
              <circle cx="18" cy="30" r="2" fill="#c17b2a" />
            </svg>
            <span className="pub-nav-wordmark">agrodomain</span>
          </Link>

          <div className="pub-nav-links">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="pub-nav-link"
                aria-current={pathname === link.href ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pub-nav-actions">
            <Link
              href="/signin"
              className="pub-nav-signin"
              aria-current={pathname === "/signin" ? "page" : undefined}
            >
              Sign In
            </Link>
            <Link href="/signup" className="pub-nav-cta">
              Get Started
            </Link>
          </div>

          <button
            className="pub-nav-hamburger"
            aria-controls={dialogId}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            ref={triggerButtonRef}
            onClick={() => setMobileOpen(true)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div
          className="pub-mobile-overlay"
          id={dialogId}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="pub-mobile-header">
            <Link href="/" className="pub-nav-logo" onClick={() => setMobileOpen(false)} aria-label="Agrodomain home">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                <circle cx="18" cy="18" r="16" fill="#2d5a3d" opacity="0.12" />
                <path d="M18 28V16c0-6 3.5-10.5 10-13-6.5 2.5-8.5 7-10 13z" fill="#2d5a3d" />
                <path d="M18 28V16c0-6-3.5-10.5-10-13 6.5 2.5 8.5 7 10 13z" fill="#4a8c5e" opacity="0.7" />
                <circle cx="18" cy="30" r="2" fill="#c17b2a" />
              </svg>
              <span className="pub-nav-wordmark">agrodomain</span>
            </Link>
            <button
              className="pub-mobile-close"
              aria-label="Close menu"
              ref={closeButtonRef}
              onClick={() => setMobileOpen(false)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="pub-mobile-links">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="pub-mobile-link"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/signin" className="pub-mobile-link" onClick={() => setMobileOpen(false)}>
              Sign In
            </Link>
          </div>
          <div className="pub-mobile-bottom">
            <Link href="/signup" className="pub-mobile-cta" onClick={() => setMobileOpen(false)}>
              Get Started
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
