/**
 * Terms & Conditions — public, standalone marketing-shell page (/terms).
 * Tailored to RankRush: tokens & plans, payments, proctored quizzes, fair
 * play, and the live leaderboard.
 */
import { ShieldAlert } from 'lucide-react'
import LegalLayout from './LegalLayout'

const UPDATED = 'June 5, 2026'

const sections = [
  {
    id: 'acceptance',
    title: 'Acceptance & Overview',
    content: (
      <>
        <p>
          RankRush ("we", "our", "us") is a quiz-based learning and rank-boosting
          platform for students preparing for NEET, JEE, and other competitive
          examinations. You attempt quizzes using tokens, climb live
          leaderboards, and build daily streaks.
        </p>
        <p>
          By creating an account or using RankRush, you agree to these Terms &amp;
          Conditions and to our{' '}
          <a href="/privacy">Privacy Policy</a>. If you do not agree, please do
          not use the platform.
        </p>
      </>
    ),
  },
  {
    id: 'eligibility-accounts',
    title: 'Eligibility & Accounts',
    content: (
      <>
        <p>
          To use RankRush you must be able to form a binding agreement, or use
          the platform under the supervision of a parent or guardian who accepts
          these Terms on your behalf.
        </p>
        <p>You are responsible for:</p>
        <ul className="legal-list">
          <li>Providing accurate, current registration details.</li>
          <li>Keeping your login credentials confidential.</li>
          <li>All activity that occurs under your account.</li>
        </ul>
        <p>
          One person may hold only one account. Creating multiple accounts to
          manipulate ranks, tokens, or referral rewards is prohibited.
        </p>
      </>
    ),
  },
  {
    id: 'tokens-plans',
    title: 'Tokens, Plans & Subscriptions',
    content: (
      <>
        <p>
          The platform runs on a simple economy: <b>one token equals one quiz
          attempt</b>. Tokens can be earned through your plan allowance, streaks,
          and referrals, or purchased as top-ups.
        </p>
        <ul className="legal-list">
          <li>Plans (such as Free and Pro) grant a recurring token allowance and feature access as described on the pricing page.</li>
          <li>Subscriptions renew according to the billing cycle shown at checkout until cancelled.</li>
          <li>Token and plan pricing may change; changes apply to future purchases and renewals, not to tokens you already hold.</li>
          <li>Tokens have no cash value, are non-transferable, and are non-refundable except where required by law.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'payments-refunds',
    title: 'Payments, Billing & Refunds',
    content: (
      <>
        <p>
          Payments are handled by third-party payment gateways. By purchasing,
          you authorise the applicable charge, including recurring charges for
          active subscriptions.
        </p>
        <ul className="legal-list">
          <li>All purchases are final unless otherwise stated or required by law.</li>
          <li>You can cancel a subscription at any time; cancellation stops future renewals and takes effect at the end of the current billing period.</li>
          <li>We may refuse, cancel, or reverse transactions that appear fraudulent or that violate these Terms.</li>
          <li>Any eligible refunds are processed in line with our refund practices and applicable law.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'proctoring',
    title: 'Proctored Quizzes (Camera & Microphone)',
    content: (
      <>
        <p>
          To keep ranks fair, some quizzes are proctored and require camera and
          microphone access for the duration of the attempt.
        </p>
        <div className="legal-callout">
          <ShieldAlert size={18} />
          <p>
            For a proctored quiz, granting camera and microphone access is
            <b> mandatory</b>. Disabling them, attempting malpractice, or using
            unfair means during an attempt may result in the attempt being ended,
            the result being voided, ranks being cancelled, and — for repeated or
            serious violations — account suspension.
          </p>
        </div>
        <p>
          What proctoring captures and how it is stored is explained in our{' '}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use & Fair Play',
    content: (
      <>
        <p>When using RankRush, you agree not to:</p>
        <ul className="legal-list">
          <li>Cheat, impersonate others, or otherwise manipulate quiz results, ranks, streaks, or referral rewards.</li>
          <li>Use bots, scripts, automation, or any tool to gain an unfair advantage.</li>
          <li>Copy, redistribute, or publicly share quiz questions, solutions, or other platform content.</li>
          <li>Attempt to access, probe, or disrupt our systems, accounts, or infrastructure.</li>
          <li>Use the platform for any unlawful purpose.</li>
        </ul>
        <p>
          Violations may lead to voided results, removed rankings, forfeited
          tokens, and account suspension or termination.
        </p>
      </>
    ),
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    content: (
      <p>
        All content on RankRush — including questions, solutions, branding,
        graphics, software, and analytics — is owned by RankRush or its licensors
        and is protected under applicable intellectual property laws. You are
        granted a limited, personal, non-transferable licence to use the platform
        for your own exam preparation. Any other reproduction, distribution, or
        commercial use without our written permission is prohibited.
      </p>
    ),
  },
  {
    id: 'suspension-termination',
    title: 'Suspension & Termination',
    content: (
      <>
        <p>
          We may suspend, restrict, remove rankings for, or terminate any account
          that violates these Terms or that we reasonably believe is engaged in
          fraud, malpractice, or abuse.
        </p>
        <p>
          You may stop using RankRush and request account deletion at any time.
          Some provisions — including intellectual property, disclaimers, and
          limitation of liability — survive termination.
        </p>
      </>
    ),
  },
  {
    id: 'disclaimer',
    title: 'Disclaimer',
    content: (
      <p>
        RankRush is an educational-assistance platform. It does not guarantee
        examination success, rank improvement, or admission outcomes — results
        depend on your own effort and preparation. The platform is provided on an
        "as is" and "as available" basis without warranties of any kind, to the
        fullest extent permitted by law.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    content: (
      <p>
        To the maximum extent permitted by law, RankRush is not liable for
        technical interruptions, connectivity issues, data loss, examination
        performance outcomes, or unauthorised third-party access beyond our
        reasonable control. Where liability cannot be excluded, it is limited to
        the amount you paid to us in the three months preceding the event giving
        rise to the claim.
      </p>
    ),
  },
  {
    id: 'changes-to-service',
    title: 'Changes to the Service & Terms',
    content: (
      <p>
        We may modify quizzes, adjust pricing, add or remove features, or
        discontinue parts of the service. We may also update these Terms; when we
        make material changes we will update the "Last updated" date above and,
        where appropriate, notify you in the app. Continuing to use RankRush after
        changes means you accept the updated Terms.
      </p>
    ),
  },
  {
    id: 'governing-law',
    title: 'Governing Law & Disputes',
    content: (
      <p>
        These Terms are governed by and interpreted under the laws of India. Any
        disputes arising from your use of RankRush are subject to the exclusive
        jurisdiction of the competent courts in India.
      </p>
    ),
  },
]

export default function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Legal · Terms"
      title="Terms & Conditions"
      updated={UPDATED}
      intro="These terms govern your use of RankRush — how accounts, tokens, plans, payments, and proctored quizzes work, and the fair-play rules that keep the leaderboard honest. Please read them carefully."
      sections={sections}
      crosslink={{ label: 'For how we handle your data, see our', to: '/privacy', linkText: 'Privacy Policy' }}
    />
  )
}
