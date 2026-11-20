import { usePageMetadata } from '../hooks/usePageMetadata';
import { useDataDate } from '../hooks/useDataDate';

// TODO: placeholder address. Replace with the project's real contact email.
export const CONTACT_EMAIL = 'contact@example.com';

const LAST_UPDATED = 'November 20, 2026';
const GITHUB_REPO_URL = 'https://github.com/tztzlk/WPS-Ranking';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-24">
      <h2 className="mb-4 text-xl font-bold text-white sm:text-2xl">{title}</h2>
      <div className="space-y-3 text-gray-300">{children}</div>
    </section>
  );
}

const linkClass = 'text-green-400 underline underline-offset-2 hover:text-green-300';

function External({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
    </a>
  );
}

export function LegalPage() {
  const dataDate = useDataDate();

  usePageMetadata({
    title: 'Legal, privacy and data | WPS Ranking',
    description:
      'Where the WPS Ranking data comes from, the WCA attribution, what personal data the site shows and stores, and how to ask for a change.',
    canonicalPath: '/legal',
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Legal, privacy and data</h1>
        <p className="mt-2 text-sm text-gray-400">Last updated {LAST_UPDATED}.</p>
      </header>

      <Section id="data" title="Data source">
        <p>
          All competition results on this site come from the public{' '}
          <External href="https://www.worldcubeassociation.org/export/results">WCA results export</External>. The WCA
          allows anyone to republish this data if they show the following notice:
        </p>
        <blockquote className="border-l-2 border-green-500 pl-4 text-sm text-gray-400">
          This information is based on competition results owned and maintained by the World Cube Association,
          published at <External href="https://www.worldcubeassociation.org/results/rankings/333/single">worldcubeassociation.org/results</External>
          {dataDate ? ` as of ${dataDate}` : ''}.
        </blockquote>
        <p>
          WPS scores, WPS ranks and the country ranking are calculated by this site. They are not official WCA
          rankings.
        </p>
      </Section>

      <Section id="disclaimer" title="Disclaimer">
        <p>
          WPS Ranking is an independent, non-commercial project. It is not affiliated with, endorsed by or
          sponsored by the World Cube Association.
        </p>
        <p>
          The site is provided as is, without any warranty. The data can be out of date or contain errors, and the
          site can be unavailable at any time. Do not use it as the official source of any result or record. For
          official results, use the{' '}
          <External href="https://www.worldcubeassociation.org/results/rankings/333/single">WCA website</External>.
        </p>
      </Section>

      <Section id="privacy" title="Privacy">
        <h3 className="font-semibold text-white">People in the rankings</h3>
        <p>
          For every person in the WCA results export, the site shows their name, WCA ID, country, WCA world ranks
          and the scores calculated from them. All of this is already public on the WCA website. Profile photos
          are the photos people uploaded to their WCA account; the site stores only the link to the photo and
          loads the image from WCA servers.
        </p>
        <p>
          The data is refreshed every day from the WCA. If you change or remove your photo on the WCA website, or
          the WCA changes or removes your data, this site shows the change after its next daily update.
        </p>

        <h3 className="pt-2 font-semibold text-white">Visitors</h3>
        <p>
          The site has no user accounts and no advertising, and it does not set cookies. The browser keeps one
          technical flag in session storage to recover from a failed page load.
        </p>
        <p>
          To count visits, the site uses Vercel Web Analytics. It records the page, the referring site, the
          country and the browser and device type. It does not use cookies, and it does not store IP addresses or
          recognise the same visitor on a later day.
        </p>
        <p>
          The site is hosted on Vercel, and its database runs on Supabase. Like any web host, Vercel records
          standard request logs, including IP addresses, to run and protect the service. Profile photos load from
          WCA servers, so your browser also connects to the WCA when a page shows a photo.
        </p>
        <p>
          Donations go through Ko-fi. This site does not receive or store payment details; Ko-fi&apos;s own privacy
          policy applies there.
        </p>
      </Section>

      <Section id="contact" title="Requests and contact">
        <p>
          To ask about your data, request a correction or removal, or report a problem with this page, email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
            {CONTACT_EMAIL}
          </a>
          . We reply within 30 days. Errors in competition results themselves can only be fixed by the WCA.
        </p>
        <p>
          Bugs and ideas for the site are welcome on{' '}
          <External href={`${GITHUB_REPO_URL}/issues`}>GitHub</External>. GitHub issues are public, so do not post
          personal requests there.
        </p>
      </Section>

      <Section id="changes" title="Changes to this page">
        <p>When this page changes, the date at the top changes with it.</p>
      </Section>
    </div>
  );
}
