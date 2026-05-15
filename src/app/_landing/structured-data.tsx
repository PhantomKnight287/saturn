import { baseUrl } from '@/lib/metadata'
import { faq } from './data'

const siteUrl = baseUrl.toString().replace(/\/$/, '')

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${siteUrl}/#organization`,
  name: 'Saturn',
  url: siteUrl,
  logo: `${siteUrl}/icon.svg`,
  sameAs: [
    'https://github.com/phantomknight287/saturn',
    'https://twitter.com/gurpalsingh287',
  ],
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${siteUrl}/#website`,
  url: siteUrl,
  name: 'Saturn',
  description:
    'Saturn brings projects, timesheets, invoices, and client management into one place — the operating system for your freelance business.',
  publisher: { '@id': `${siteUrl}/#organization` },
}

const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Saturn',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: siteUrl,
  description:
    'Projects, proposals, time, timesheets, expenses, and invoices — the operating system for freelancers, agencies, and solo builders.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Free',
      price: '0',
      priceCurrency: 'USD',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '3',
      priceCurrency: 'USD',
    },
  ],
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.a,
    },
  })),
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: siteUrl,
    },
  ],
}

const schemas = [
  organizationSchema,
  websiteSchema,
  softwareApplicationSchema,
  faqSchema,
  breadcrumbSchema,
]

export function LandingStructuredData() {
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw script content
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
      type='application/ld+json'
    />
  )
}
