import { Link } from "react-router";
import type { Route } from "./+types/glossary";
import { Breadcrumbs } from "~/components/layout/Breadcrumbs";
import { Page } from "~/components/layout/Page";
import { glossary } from "~/content/glossary";
import { getTopic, href } from "~/content/registry";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Glossary | IoT Simulator Lab" }];
}

export default function GlossaryPage() {
  const sorted = [...glossary].sort((a, b) => a.term.localeCompare(b.term));
  const groups = new Map<string, typeof sorted>();
  for (const term of sorted) {
    const letter = term.term[0].toUpperCase();
    groups.set(letter, [...(groups.get(letter) ?? []), term]);
  }
  const letters = [...groups.keys()];

  return (
    <Page>
      <Breadcrumbs items={[{ label: "Home", to: href.home() }, { label: "Glossary" }]} />
      <header className="mt-5 grid gap-2">
        <h1 className="text-h1 font-bold tracking-tight">Glossary</h1>
        <p className="max-w-[62ch] text-ink-2">
          Every technical word used in the lab, explained in one or two sentences. Underlined words
          in the theory pages show these definitions when you point at them.
        </p>
      </header>

      <nav aria-label="Jump to letter" className="mt-6">
        <ul className="flex flex-wrap gap-1">
          {letters.map((letter) => (
            <li key={letter}>
              <a
                href={`#letter-${letter}`}
                className="inline-flex size-9 items-center justify-center rounded-md border border-line font-bold hover:border-brand hover:text-brand"
              >
                {letter}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 grid gap-10">
        {letters.map((letter) => (
          <section key={letter} aria-labelledby={`letter-${letter}`}>
            <h2 id={`letter-${letter}`} className="scroll-mt-20 text-h2 font-bold text-ink-3">
              {letter}
            </h2>
            <dl className="mt-3 grid max-w-[70ch] gap-5">
              {groups.get(letter)!.map((term) => {
                const topic = term.topic ? getTopic(term.topic) : undefined;
                return (
                  <div key={term.id} id={term.id} className="scroll-mt-20">
                    <dt className="font-bold">{term.term}</dt>
                    <dd className="mt-1 text-ink-2">
                      {term.definition}
                      {topic && (
                        <>
                          {" "}
                          <Link to={href.topic(topic.slug)} className="text-brand underline-offset-2 hover:underline">
                            Learn more in {topic.code === "0.1" ? topic.title : `topic ${topic.code}`}
                          </Link>
                        </>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>
    </Page>
  );
}
