import type { Metadata } from 'next'
import { createMetadata } from '@/lib/metadata'

export const metadata: Metadata = createMetadata({
  title: 'Privacy Policy',
  description:
    'How Saturn collects, uses, and protects your personal information.',
})

const lastUpdated = 'April 25, 2026'

export default function PrivacyPage() {
  return (
    <main className='mx-auto max-w-3xl px-6 py-16'>
      <article className='prose prose-neutral dark:prose-invert max-w-none'>
        <h1>Privacy Policy</h1>
        <p className='text-muted-foreground text-sm'>
          Last updated: {lastUpdated}
        </p>

        <p>
          This Privacy Policy describes how Saturn (&quot;Saturn&quot;,
          &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses,
          and shares information about you when you use our website,
          applications, and services (collectively, the &quot;Service&quot;). By
          using the Service, you agree to the collection and use of information
          in accordance with this Policy.
        </p>

        <h2>1. Information We Collect</h2>
        <h3>Information you provide</h3>
        <ul>
          <li>
            <strong>Account information:</strong> name, email address, password,
            and profile picture when you sign up.
          </li>
          <li>
            <strong>Workspace and content data:</strong> projects, clients,
            invoices, expenses, time entries, files, and any other content you
            create or upload.
          </li>
          <li>
            <strong>Billing information:</strong> processed by our payment
            partner (Polar). We do not store full payment card numbers.
          </li>
          <li>
            <strong>Communications:</strong> messages you send to support or
            feedback you submit through integrated tools (such as Featurebase).
          </li>
        </ul>

        <h3>Information we collect automatically</h3>
        <ul>
          <li>
            <strong>Usage data:</strong> pages visited, features used, referring
            URLs, device and browser type, and approximate location derived from
            IP address.
          </li>
          <li>
            <strong>Cookies and similar technologies:</strong> used for
            authentication, preferences, and analytics.
          </li>
          <li>
            <strong>Log data:</strong> server logs containing IP address,
            timestamps, and request metadata.
          </li>
        </ul>

        <h3>Information from third parties</h3>
        <p>
          If you sign in with a third-party provider (e.g. GitHub), we receive
          basic profile information from that provider in accordance with your
          authorization.
        </p>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To provide, operate, and maintain the Service.</li>
          <li>To authenticate users and secure accounts.</li>
          <li>To process payments and manage subscriptions.</li>
          <li>To respond to support requests and feedback.</li>
          <li>
            To improve the Service, develop new features, and analyze usage.
          </li>
          <li>To send transactional emails and important account notices.</li>
          <li>
            To detect, prevent, and address fraud, abuse, or security issues.
          </li>
          <li>To comply with legal obligations.</li>
        </ul>

        <h2>3. Legal Bases for Processing (EEA/UK Users)</h2>
        <p>
          If you are in the European Economic Area or the United Kingdom, we
          process your personal data under the following legal bases:
          performance of a contract, our legitimate interests (such as improving
          and securing the Service), compliance with legal obligations, and your
          consent where required.
        </p>

        <h2>4. How We Share Information</h2>
        <p>
          We do not sell your personal information. We share information only as
          described below:
        </p>
        <ul>
          <li>
            <strong>Service providers:</strong> trusted vendors who help us
            operate the Service, including hosting (Railway), object storage
            (Railway), email delivery(AWS SES), payments (Polar), analytics
            (Databuddy), and feedback (Featurebase). These providers access
            information only as needed to perform their functions.
          </li>
          <li>
            <strong>Workspace members:</strong> content you submit to a
            workspace is visible to other members of that workspace based on
            their role and permissions.
          </li>
          <li>
            <strong>Legal and safety:</strong> when required by law, legal
            process, or to protect the rights, property, or safety of Saturn,
            our users, or the public.
          </li>
          <li>
            <strong>Business transfers:</strong> in connection with a merger,
            acquisition, or sale of assets, subject to standard confidentiality
            protections.
          </li>
        </ul>

        <h2>5. Data Retention</h2>
        <p>
          We retain personal data for as long as your account is active or as
          needed to provide the Service. We may retain certain information after
          account deletion to comply with legal obligations, resolve disputes,
          and enforce our agreements. Backups are purged on a rolling schedule.
        </p>

        <h2>6. Your Rights</h2>
        <p>
          Depending on your location, you may have the right to access, correct,
          delete, restrict, or port your personal data, and to object to certain
          processing. You may also withdraw consent where processing is based on
          consent. To exercise these rights, contact us at{' '}
          <a href='mailto:phantomknight287@proton.me'>
            phantomknight287@proton.me
          </a>
          . You may also have the right to lodge a complaint with a supervisory
          authority.
        </p>

        <h2>7. Security</h2>
        <p>
          We implement reasonable technical and organizational measures to
          protect your information, including encryption in transit, access
          controls, and audit logging. No method of transmission or storage is
          completely secure, and we cannot guarantee absolute security.
        </p>

        <h2>8. International Transfers</h2>
        <p>
          Your information may be processed in countries other than the one in
          which you reside. Where required, we use appropriate safeguards (such
          as standard contractual clauses) for cross-border transfers.
        </p>

        <h2>9. Children&apos;s Privacy</h2>
        <p>
          The Service is not directed to children under 16 (or the equivalent
          minimum age in your jurisdiction). We do not knowingly collect
          personal information from children. If you believe a child has
          provided us with personal information, contact us so we can delete it.
        </p>

        <h2>10. Cookies</h2>
        <p>
          We use cookies and similar technologies for essential functionality
          (such as keeping you signed in), preferences, and analytics. You can
          control cookies through your browser settings; disabling some cookies
          may affect functionality.
        </p>

        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. If we make
          material changes, we will provide reasonable notice. The &quot;Last
          updated&quot; date at the top reflects the most recent revision.
        </p>

        <h2>12. Contact</h2>
        <p>
          For questions about this Privacy Policy or our data practices, contact
          us at{' '}
          <a href='mailto:phantomknight287@proton.me'>
            phantomknight287@proton.me
          </a>
          .
        </p>
      </article>
    </main>
  )
}
