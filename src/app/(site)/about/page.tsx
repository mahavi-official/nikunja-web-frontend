import { Eye, Target } from "lucide-react";
import { getAboutPage } from "@/lib/api";
import { metadataFromSeo, breadcrumbJsonLd } from "@/lib/seo";
import { Breadcrumbs, ButtonLink, JsonLd, SectionHeading } from "@/components/ui/primitives";
import type { AboutSections } from "@/lib/types";

// The About page is edited rarely; an hour of staleness is fine.
export const revalidate = 3600;

export async function generateMetadata() {
  try {
    const { seo } = await getAboutPage();
    return metadataFromSeo(seo);
  } catch {
    return {
      title: "About",
      description: "About the Radhakundah project and the team behind it.",
    };
  }
}

/** The CMS stores free-form sections; anything missing is simply not rendered. */
function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export default async function AboutPage() {
  let page: { title: string; sections: AboutSections } | null = null;
  let jsonLd: Record<string, unknown>[] = [];

  try {
    const data = await getAboutPage();
    page = { title: data.page.title, sections: data.page.sections ?? {} };
    jsonLd = data.seo.jsonLd;
  } catch {
    page = { title: "About Us", sections: {} };
  }

  const sections = page.sections;
  const objectives = Array.isArray(sections.objectives) ? sections.objectives : [];
  const team = Array.isArray(sections.team) ? sections.team : [];
  const journey = Array.isArray(sections.journey) ? sections.journey : [];

  const trail = [
    { name: "Home", url: "/" },
    { name: "About", url: "/about" },
  ];

  const pillars = [
    { Icon: Target, label: "Mission", body: text(sections.mission) },
    { Icon: Eye, label: "Vision", body: text(sections.vision) },
  ].filter((pillar) => pillar.body);

  return (
    <>
      <JsonLd data={[...jsonLd, breadcrumbJsonLd(trail)]} />

      <header className="border-b border-line bg-surface-raised">
        <div className="container-page py-12 md:py-16">
          <Breadcrumbs trail={trail} />
          <span className="eyebrow">Who we are</span>
          <h1 className="mt-2 text-3xl md:text-5xl">{page.title}</h1>
          {text(sections.about) ? (
            <p className="mt-6 max-w-3xl text-lg leading-relaxed whitespace-pre-line text-ink-soft">
              {text(sections.about)}
            </p>
          ) : null}
        </div>
      </header>

      {pillars.length ? (
        <section className="container-page py-14 md:py-20">
          <div className="grid gap-6 md:grid-cols-2">
            {pillars.map(({ Icon, label, body }) => (
              <div key={label} className="card p-8">
                <span className="grid size-11 place-items-center rounded-xl bg-navy-50 text-navy-700 dark:bg-navy-800/60 dark:text-navy-100">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h2 className="mt-5 text-xl">{label}</h2>
                <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-soft">{body}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {objectives.length ? (
        <section className="border-y border-line bg-surface-raised py-14 md:py-20">
          <div className="container-page">
            <SectionHeading eyebrow="What we are for" title="Objectives" />
            <ol className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
              {objectives.map((objective, index) => (
                <li key={index} className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-flame-500 text-sm font-semibold text-white tabular-nums">
                    {index + 1}
                  </span>
                  <p className="pt-1 leading-relaxed text-ink-soft">{String(objective)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {journey.length ? (
        <section className="container-page py-14 md:py-20">
          <SectionHeading eyebrow="How we got here" title="Our journey" />
          <ol className="relative border-l border-line pl-8">
            {journey.map((entry, index) => (
              <li key={index} className="relative pb-10 last:pb-0">
                <span
                  className="absolute top-1.5 -left-[2.15rem] size-3 rounded-full border-2 border-flame-500 bg-surface"
                  aria-hidden
                />
                {entry?.year ? (
                  <p className="text-sm font-semibold text-flame-600 tabular-nums">{entry.year}</p>
                ) : null}
                {entry?.title ? <h3 className="mt-1 text-lg">{entry.title}</h3> : null}
                {entry?.description ? (
                  <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">{entry.description}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {team.length ? (
        <section className="border-t border-line bg-surface-raised py-14 md:py-20">
          <div className="container-page">
            <SectionHeading eyebrow="The people" title="Our team" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {team.map((member, index) => (
                <div key={index} className="text-center">
                  <div className="relative mx-auto size-28 overflow-hidden rounded-full bg-surface-sunken">
                    {member?.photoUrl ? (
                      // A free-form URL out of the CMS JSON, so it cannot go
                      // through next/image — that would need the host declared
                      // in remotePatterns ahead of time.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.photoUrl}
                        alt={member.name ?? "Team member"}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="grid size-full place-items-center font-serif text-2xl text-ink-muted">
                        {(member?.name ?? "?").charAt(0)}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-base">{member?.name}</h3>
                  {member?.role ? (
                    <p className="mt-0.5 text-sm text-flame-600">{member.role}</p>
                  ) : null}
                  {member?.bio ? (
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">{member.bio}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="container-page py-16 text-center">
        <h2 className="text-2xl">
          {text(sections.contact) ?? "Questions, corrections, or work to contribute?"}
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/contact" size="lg">
            Contact the team
          </ButtonLink>
          <ButtonLink href="/research" variant="secondary" size="lg">
            Read the research
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
