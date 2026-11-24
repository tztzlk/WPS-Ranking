import { usePageMetadata } from '../hooks/usePageMetadata';
import { useDataDate } from '../hooks/useDataDate';
import { Trans, useTranslation } from 'react-i18next';
import { useFormat } from '../i18n/format';

// TODO: placeholder address. Replace with the project's real contact email.
export const CONTACT_EMAIL = 'contact@example.com';

/** ISO date; shown in the reader's language. */
const LAST_UPDATED = '2026-11-20';
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

/** Link to an external site. `children` is optional so it can be a <Trans> component, which fills it in. */
function External({ href, children }: { href: string; children?: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
    </a>
  );
}

export function LegalPage() {
  const { t } = useTranslation('legal');
  const fmt = useFormat();
  const dataIso = useDataDate();
  const dataDate = dataIso ? fmt.date(dataIso, 'long') : null;
  const translationNote = t('translationNote');

  usePageMetadata({
    title: t('meta.title'),
    description: t('meta.description'),
    canonicalPath: '/legal',
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
        <p className="mt-2 text-sm text-gray-400">{t('lastUpdated', { date: fmt.date(LAST_UPDATED, 'long') })}</p>
        {translationNote && <p className="mt-2 text-sm italic text-gray-400">{translationNote}</p>}
      </header>

      <Section id="data" title={t('data.title')}>
        <p>
          <Trans
            t={t}
            i18nKey="data.intro"
            components={{ link: <External href="https://www.worldcubeassociation.org/export/results" /> }}
          />
        </p>
        <blockquote className="border-l-2 border-green-500 pl-4 text-sm text-gray-400">
          <Trans
            t={t}
            i18nKey={dataDate ? 'data.noticeDated' : 'data.notice'}
            values={{ date: dataDate }}
            components={{ link: <External href="https://www.worldcubeassociation.org/results/rankings/333/single" /> }}
          />
        </blockquote>
        <p>{t('data.calculated')}</p>
      </Section>

      <Section id="disclaimer" title={t('disclaimer.title')}>
        <p>{t('disclaimer.independent')}</p>
        <p>
          <Trans
            t={t}
            i18nKey="disclaimer.asIs"
            components={{ link: <External href="https://www.worldcubeassociation.org/results/rankings/333/single" /> }}
          />
        </p>
      </Section>

      <Section id="privacy" title={t('privacy.title')}>
        <h3 className="font-semibold text-white">{t('privacy.peopleTitle')}</h3>
        <p>{t('privacy.people1')}</p>
        <p>{t('privacy.people2')}</p>

        <h3 className="pt-2 font-semibold text-white">{t('privacy.visitorsTitle')}</h3>
        <p>{t('privacy.visitors1')}</p>
        <p>{t('privacy.visitors2')}</p>
        <p>{t('privacy.visitors3')}</p>
        <p>{t('privacy.visitors4')}</p>
      </Section>

      <Section id="contact" title={t('contact.title')}>
        <p>
          <Trans
            t={t}
            i18nKey="contact.requests"
            values={{ email: CONTACT_EMAIL }}
            components={{ mail: <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass} /> }}
          />
        </p>
        <p>
          <Trans t={t} i18nKey="contact.github" components={{ link: <External href={`${GITHUB_REPO_URL}/issues`} /> }} />
        </p>
      </Section>

      <Section id="changes" title={t('changes.title')}>
        <p>{t('changes.text')}</p>
      </Section>
    </div>
  );
}
