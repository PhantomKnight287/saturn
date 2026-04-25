import type { Metadata } from 'next'
import { createMetadata } from '@/lib/metadata'

export const metadata: Metadata = createMetadata({
  title: 'Terms & Conditions',
  description: 'The terms and conditions that govern your use of Saturn.',
})

const lastUpdated = 'April 25, 2026'

export default function TermsPage() {
  return (
    <main className='mx-auto max-w-3xl px-6 py-16'>
      <article className='prose prose-neutral dark:prose-invert max-w-none'>
        <h1>Terms &amp; Conditions</h1>
        <p className='text-muted-foreground text-sm'>
          Last updated: {lastUpdated}
        </p>

        <p>
          Welcome to Saturn (&quot;Saturn&quot;, &quot;we&quot;, &quot;us&quot;,
          or &quot;our&quot;). These Terms &amp; Conditions (&quot;Terms&quot;)
          govern your access to and use of the Saturn website, applications, and
          services (collectively, the &quot;Service&quot;). By creating an
          account or otherwise using the Service, you agree to be bound by these
          Terms. If you do not agree, do not use the Service.
        </p>

        <h2>1. Eligibility</h2>
        <p>
          You must be at least 18 years old, or the age of majority in your
          jurisdiction, to use the Service. By using the Service you represent
          that you meet this requirement and that you have the authority to
          enter into these Terms on behalf of yourself or any organization you
          represent.
        </p>

        <h2>2. Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your
          account credentials and for all activity under your account. Notify us
          immediately of any unauthorized access. We may suspend or terminate
          accounts that violate these Terms or that we reasonably believe pose a
          risk to the Service or other users.
        </p>

        <h2>3. Subscriptions and Payments</h2>
        <p>
          Paid plans are billed in advance on a recurring basis through our
          payment processor. Fees are non-refundable except where required by
          law. We may change pricing on prospective renewals with reasonable
          notice. You authorize us to charge your payment method for all fees
          incurred.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>
            Use the Service in violation of any applicable law or regulation.
          </li>
          <li>
            Upload, transmit, or store content that infringes intellectual
            property rights, is unlawful, harassing, or otherwise objectionable.
          </li>
          <li>
            Attempt to gain unauthorized access to the Service, other accounts,
            or related systems.
          </li>
          <li>
            Interfere with or disrupt the integrity or performance of the
            Service.
          </li>
          <li>
            Resell, sublicense, or otherwise commercially exploit the Service
            without our written consent.
          </li>
        </ul>

        <h2>5. Your Content</h2>
        <p>
          You retain ownership of the data, files, and content you submit to the
          Service (&quot;Your Content&quot;). You grant Saturn a worldwide,
          non-exclusive license to host, store, copy, transmit, and display Your
          Content solely as necessary to provide and improve the Service. You
          are solely responsible for Your Content and for ensuring you have all
          rights necessary to submit it.
        </p>

        <h2>6. Intellectual Property</h2>
        <p>
          The Service, including its software, design, and trademarks, is owned
          by Saturn and its licensors and is protected by intellectual property
          laws. Subject to these Terms, we grant you a limited, non-exclusive,
          non-transferable, revocable license to use the Service for its
          intended purpose.
        </p>

        <h2>7. Third-Party Services</h2>
        <p>
          The Service may integrate with or link to third-party services. We are
          not responsible for the availability, content, or practices of those
          services, and your use of them is governed by their own terms.
        </p>

        <h2>8. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
          WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
          WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
          UNINTERRUPTED, SECURE, OR ERROR-FREE.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, SATURN AND ITS AFFILIATES WILL
          NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
          PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING
          OUT OF OR RELATED TO YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR
          ANY CLAIM RELATED TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A)
          THE AMOUNTS YOU PAID US IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR
          (B) USD $100.
        </p>

        <h2>10. Indemnification</h2>
        <p>
          You agree to defend, indemnify, and hold Saturn harmless from any
          claims, liabilities, damages, and expenses (including reasonable legal
          fees) arising out of your use of the Service, Your Content, or your
          violation of these Terms.
        </p>

        <h2>11. Termination</h2>
        <p>
          You may stop using the Service at any time. We may suspend or
          terminate your access at any time, with or without cause or notice.
          Upon termination, your right to use the Service will cease, but
          provisions intended to survive will remain in effect.
        </p>

        <h2>12. Changes to the Terms</h2>
        <p>
          We may update these Terms from time to time. If we make material
          changes, we will provide reasonable notice (for example, by email or
          in-app notice). Your continued use of the Service after changes become
          effective constitutes acceptance of the revised Terms.
        </p>

        <h2>13. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the jurisdiction in which
          Saturn is established, without regard to conflict-of-law principles.
          Any dispute arising under these Terms will be resolved in the courts
          of that jurisdiction, unless otherwise required by applicable law.
        </p>

        <h2>14. Contact</h2>
        <p>
          For questions about these Terms, contact us at{' '}
          <a href='mailto:phantomknight287@proton.me'>
            phantomknight287@proton.me
          </a>
          .
        </p>
      </article>
    </main>
  )
}
