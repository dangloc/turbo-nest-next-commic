"use client";

import Link from "next/link";
import { useContext } from "react";
import { AppContext } from "../providers/app-provider";
import { Mail, MessageCircle, Share2 } from "lucide-react";
import Image from "next/image";

export function Footer() {
  const { locale } = useContext(AppContext);

  const copy =
    locale === "vi"
      ? {
          brandName: "",
          copyright: "© 2026 Tử sắc hiệp. Bảo lưu mọi quyền.",
          stories: "Truyện",
          faq: "Câu hỏi thường gặp",
          guidelines: "Thông báo hướng dẫn",
          contact: "Liên hệ",
          privacy: "Chính sách bảo mật",
          terms: "Điều khoản sử dụng",
        }
      : {
          brandName: "",
          copyright: "© 2026 Tử sắc hiệp. All rights reserved.",
          stories: "Stories",
          faq: "FAQ",
          guidelines: "Guidelines",
          contact: "Contact",
          privacy: "Privacy Policy",
          terms: "Terms of Use",
        };

  return (
    <footer className="footer-container">
      <div className="footer-content">
        {/* Left Section - Branding */}
        <div className="footer-section footer-brand">
          <div className="footer-brand-logo">
             <Link href="/" className="tsh3-logo" aria-label="Tusachiep home">
                <Image
                    src="/tusachiep/logo.svg"
                    alt="Tủ Sách Hiệp"
                    width={118}
                    height={36}
                    priority
                />
            </Link>
          </div>
          <p className="footer-copyright">{copy.copyright}</p>
        </div>

        {/* Middle Section - Navigation */}
        <div className="footer-section footer-nav">
          <nav className="footer-nav-links">
            <Link href="/novels" className="footer-link">
              {copy.stories}
            </Link>
            <Link href="/faq" className="footer-link">
              {copy.faq}
            </Link>
            <Link href="/guidelines" className="footer-link">
              {copy.guidelines}
            </Link>
          </nav>
        </div>

        {/* Right Section - Social & Contact */}
        <div className="footer-section footer-social">
          <div className="footer-social-links">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-icon"
              aria-label="Facebook"
            >
              <Share2 size={20} />
            </a>
            <a
              href="mailto:contact@mimieuuyen.com"
              className="footer-social-icon"
              aria-label="Email"
            >
              <Mail size={20} />
            </a>
            <a
            //   href="https://m.me/mimieuuyen"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-icon"
              aria-label="Messenger"
            >
              <MessageCircle size={20} />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <div className="footer-bottom-links">
            <Link href="/privacy" className="footer-bottom-link">
              {copy.privacy}
            </Link>
            <span className="footer-bottom-divider">•</span>
            <Link href="/novels" className="footer-bottom-link">
              {copy.terms}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
