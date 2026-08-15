import { Mail, MapPin, Phone } from "lucide-react";
import { getSettings } from "@/lib/api";
import { absoluteUrl, buildPageMetadata, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { Breadcrumbs, JsonLd } from "@/components/ui/primitives";
import { ContactForm } from "@/components/contact/ContactForm";
import type { Settings } from "@/lib/types";

// Contact details change rarely.
export const revalidate = 3600;

function value(settings: Settings, key: string): string | null {
  const raw = settings[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export async function generateMetadata() {
  return buildPageMetadata({
    title: "Contact",
    description:
      "Get in touch with the Radhakundah team — questions about the research, the archive, or contributing.",
    path: "/contact",
  });
}

export default async function ContactPage() {
  const settings = await getSettings();

  const email = value(settings, "contact.email");
  const phone = value(settings, "contact.phone");
  const address = value(settings, "contact.address");
  const mapEmbed = value(settings, "contact.mapEmbed");

  const trail = [
    { name: "Home", url: "/" },
    { name: "Contact", url: "/contact" },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "Contact",
      url: absoluteUrl("/contact"),
      about: {
        "@type": "Organization",
        name: (settings["site.title"] as string) || SITE_NAME,
        ...(email ? { email } : {}),
        ...(phone ? { telephone: phone } : {}),
        ...(address ? { address: { "@type": "PostalAddress", streetAddress: address } } : {}),
      },
    },
    breadcrumbJsonLd(trail),
  ];

  const details = [
    email ? { Icon: Mail, label: "Email", value: email, href: `mailto:${email}` } : null,
    phone
      ? { Icon: Phone, label: "Phone", value: phone, href: `tel:${phone.replace(/\s+/g, "")}` }
      : null,
    address ? { Icon: MapPin, label: "Office", value: address, href: null } : null,
  ].filter(Boolean) as { Icon: typeof Mail; label: string; value: string; href: string | null }[];

  return (
    <>
      <JsonLd data={jsonLd} />

      <header className="border-b border-line bg-surface-raised">
        <div className="container-page py-12 md:py-16">
          <Breadcrumbs trail={trail} />
          <span className="eyebrow">Say hello</span>
          <h1 className="mt-2 text-3xl md:text-5xl">Contact</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Questions about the research, requests to reuse material, or an offer to contribute —
            this reaches the editorial team directly.
          </p>
        </div>
      </header>

      <div className="container-page grid gap-12 py-12 md:py-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ContactForm />
        </div>

        <aside className="lg:col-span-5">
          {details.length ? (
            <ul className="space-y-5">
              {details.map(({ Icon, label, value: detail, href }) => (
                <li key={label} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-flame-50 text-flame-600 dark:bg-flame-900/30 dark:text-flame-300">
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-wider text-ink-muted uppercase">
                      {label}
                    </p>
                    {href ? (
                      <a
                        href={href}
                        className="mt-1 block break-words transition-colors hover:text-flame-600"
                      >
                        {detail}
                      </a>
                    ) : (
                      <p className="mt-1 break-words">{detail}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {mapEmbed ? (
            <div className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-line">
              <iframe
                src={mapEmbed}
                title="Office location"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="aspect-4/3 w-full"
              />
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
