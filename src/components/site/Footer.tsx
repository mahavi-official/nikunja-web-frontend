import Link from "next/link";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Twitter, Youtube } from "lucide-react";
import { Logo } from "./Logo";
import { NewsletterForm } from "./NewsletterForm";
import { getSettings } from "@/lib/api";
import type { Settings } from "@/lib/types";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { href: "/research", label: "Research" },
      { href: "/articles", label: "Articles" },
      { href: "/blogs", label: "Blogs" },
      { href: "/authors", label: "Authors" },
    ],
  },
  {
    title: "Media",
    links: [
      { href: "/gallery", label: "Gallery" },
      { href: "/videos", label: "Videos" },
      { href: "/search", label: "Search" },
    ],
  },
  {
    title: "Organisation",
    links: [
      { href: "/about", label: "About us" },
      { href: "/contact", label: "Contact" },
      { href: "/sitemap.xml", label: "Sitemap" },
    ],
  },
];

const SOCIALS = [
  { key: "social.facebook", label: "Facebook", Icon: Facebook },
  { key: "social.twitter", label: "X / Twitter", Icon: Twitter },
  { key: "social.instagram", label: "Instagram", Icon: Instagram },
  { key: "social.youtube", label: "YouTube", Icon: Youtube },
  { key: "social.linkedin", label: "LinkedIn", Icon: Linkedin },
] as const;

function value(settings: Settings, key: string): string | null {
  const raw = settings[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export async function Footer() {
  const settings = await getSettings();
  const year = new Date().getUTCFullYear();

  const email = value(settings, "contact.email");
  const phone = value(settings, "contact.phone");
  const address = value(settings, "contact.address");
  const socials = SOCIALS.map((social) => ({ ...social, url: value(settings, social.key) })).filter(
    (social) => social.url
  );

  return (
    <footer className="mt-24 bg-navy-950 text-sand-200">
      {/* Newsletter band */}
      <div className="border-b border-white/10">
        <div className="container-page grid gap-8 py-14 md:grid-cols-2 md:items-center">
          <div>
            <span className="eyebrow text-flame-400">Stay close</span>
            <h2 className="mt-2 text-2xl text-white md:text-3xl">
              New research and writing, as it is published
            </h2>
            <p className="mt-3 max-w-md text-sm text-sand-300/80">
              An occasional letter. No campaigns, no resale of your address, one click to leave.
            </p>
          </div>
          <div className="md:justify-self-end md:w-full md:max-w-md">
            <NewsletterForm />
          </div>
        </div>
      </div>

      {/* Link columns */}
      <div className="container-page grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <Link href="/" aria-label="Radhakundah — home">
            <Logo tone="inverse" />
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-sand-300/75">
            A publishing home for scholarship, writing, and media on Radha Kunda and the tradition
            around it.
          </p>

          {socials.length ? (
            <ul className="mt-6 flex items-center gap-2">
              {socials.map(({ key, label, Icon, url }) => (
                <li key={key}>
                  <a
                    href={url!}
                    target="_blank"
                    rel="noopener noreferrer me"
                    aria-label={label}
                    className="grid size-9 place-items-center rounded-full border border-white/15 text-sand-200 transition-colors hover:border-flame-400 hover:bg-flame-500 hover:text-white"
                  >
                    <Icon className="size-4" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title} className="md:col-span-2">
            <h3 className="text-[0.6875rem] font-semibold tracking-[0.16em] text-flame-400 uppercase">
              {column.title}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-sand-300/80 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        {(email || phone || address) && (
          <div className="md:col-span-2">
            <h3 className="text-[0.6875rem] font-semibold tracking-[0.16em] text-flame-400 uppercase">
              Contact
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-sand-300/80">
              {email ? (
                <li className="flex items-start gap-2">
                  <Mail className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <a href={`mailto:${email}`} className="break-all transition-colors hover:text-white">
                    {email}
                  </a>
                </li>
              ) : null}
              {phone ? (
                <li className="flex items-start gap-2">
                  <Phone className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <a href={`tel:${phone.replace(/\s+/g, "")}`} className="transition-colors hover:text-white">
                    {phone}
                  </a>
                </li>
              ) : null}
              {address ? (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <span>{address}</span>
                </li>
              ) : null}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-sand-300/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {value(settings, "site.title") ?? "Radhakundah"}. All rights reserved.
          </p>
          <p>
            Built by{" "}
            <span className="text-sand-200/80">Mahavi Pvt Ltd</span> for Nikunja Seva Pty Ltd
          </p>
        </div>
      </div>
    </footer>
  );
}
