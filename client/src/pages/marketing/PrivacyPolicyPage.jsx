/**
 * Privacy Policy — public, standalone marketing-shell page (/privacy).
 * Content tailored to RankRush's current functionality: accounts, tokens &
 * plans, live leaderboards, streaks, referrals, and quiz proctoring.
 */
import { ShieldAlert } from 'lucide-react'
import LegalLayout from './LegalLayout'

const UPDATED = 'June 5, 2026'

const sections = [
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    content: (
      <>
        <p>
          We collect only what we need to run RankRush — to create your account,
          run quizzes fairly, settle payments, and keep the leaderboard honest.
          The categories below describe everything we gather.
        </p>

        <h3>Account &amp; profile information</h3>
        <ul className="legal-list">
          <li>Your <b>name, email address, and mobile number</b>, supplied at signup.</li>
          <li>Your <b>class, board, target exam (NEET / JEE / other), and school or coaching centre</b>, used to place you on the right leaderboards and recommend relevant quizzes.</li>
          <li>An optional <b>profile photograph</b> and display name, if you choose to add one.</li>
          <li>Your <b>password</b>, stored only as a salted one-way hash — we never see or store it in plain text.</li>
        </ul>

        <h3>Activity &amp; performance data</h3>
        <ul className="legal-list">
          <li>Quizzes attempted, answers submitted, scores, time-per-question, ranks, and streak history.</li>
          <li>Token balance and transactions, plan tier, and referral activity.</li>
        </ul>

        <h3>Payment information</h3>
        <p>
          Token top-ups and subscriptions are processed by third-party payment
          gateways. We receive a transaction reference and status from the
          gateway — we do <b>not</b> collect or store your full card number, CVV,
          or banking credentials on our servers.
        </p>

        <h3>Proctoring data (camera &amp; microphone)</h3>
        <p>
          Where a quiz is proctored, we capture camera and microphone input and
          related integrity signals during the attempt. See{' '}
          <a href="#proctoring-and-integrity">Proctoring &amp; Exam Integrity</a> for
          exactly what is captured, why, and how long it is kept.
        </p>

        <h3>Device &amp; usage data</h3>
        <ul className="legal-list">
          <li>IP address, approximate region, browser and device type, and operating system.</li>
          <li>Login timestamps, session activity, and diagnostic logs used to keep the service secure and reliable.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-we-use-it',
    title: 'How We Use Your Information',
    content: (
      <>
        <p>We use the information we collect to:</p>
        <ul className="legal-list">
          <li>Create and manage your account and deliver the quiz experience.</li>
          <li>Run the token economy — issue, deduct, and reconcile tokens for quiz attempts and rewards.</li>
          <li>Calculate ranks, streaks, and leaderboard standings, and surface performance analytics.</li>
          <li>Maintain exam integrity and detect cheating, malpractice, or fraudulent activity.</li>
          <li>Process payments, subscriptions, and referral rewards.</li>
          <li>Send service notifications — results, streak reminders, billing receipts, and security alerts.</li>
          <li>Improve performance, security, and reliability of the platform.</li>
        </ul>
        <p>
          We do not use your proctoring data for advertising, and we do not sell
          your personal information to anyone.
        </p>
      </>
    ),
  },
  {
    id: 'proctoring-and-integrity',
    title: 'Proctoring & Exam Integrity',
    content: (
      <>
        <p>
          A live leaderboard is only meaningful if every rank is earned. To
          protect that, certain quizzes require camera and microphone access for
          the duration of the attempt.
        </p>
        <div className="legal-callout">
          <ShieldAlert size={18} />
          <p>
            When a quiz is proctored, camera and microphone access are
            <b> mandatory for that attempt</b>. If you decline or revoke access
            during a proctored quiz, the attempt may be paused or ended and the
            result may be voided. You are always told before a proctored quiz
            begins.
          </p>
        </div>
        <p>Proctoring data is used <b>solely</b> for:</p>
        <ul className="legal-list">
          <li>Verifying that the person attempting the quiz is the account holder.</li>
          <li>Detecting cheating, impersonation, or other malpractice.</li>
          <li>Reviewing flagged attempts and resolving integrity disputes.</li>
        </ul>
        <p>
          Access to proctoring recordings is restricted to authorised integrity
          reviewers, and recordings are retained only for the period described in{' '}
          <a href="#storage-security-retention">Data Storage, Security &amp; Retention</a>.
          Proctoring data is never used for marketing or shared for any unrelated purpose.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Sharing & Disclosure',
    content: (
      <>
        <p>We share personal information only in these limited situations:</p>
        <ul className="legal-list">
          <li><b>Service providers</b> — payment gateways, cloud hosting, and analytics partners who process data on our behalf under contract.</li>
          <li><b>Public leaderboards</b> — your display name, avatar, and rank are visible to other users on leaderboards you participate in. Your email, phone, and contact details are never shown.</li>
          <li><b>Legal &amp; safety</b> — where required by law, or to investigate fraud, abuse, or violations of our Terms.</li>
          <li><b>Business transfers</b> — if RankRush is involved in a merger or acquisition, data may transfer subject to this Policy.</li>
        </ul>
        <p><b>We never sell your personal information.</b></p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies & Tracking',
    content: (
      <>
        <p>We use cookies and similar technologies to:</p>
        <ul className="legal-list">
          <li>Keep you signed in and maintain your session.</li>
          <li>Remember preferences such as your light/dark theme.</li>
          <li>Understand usage patterns so we can improve the product.</li>
        </ul>
        <p>
          You can disable cookies in your browser settings, but some features —
          including staying logged in — may not work correctly.
        </p>
      </>
    ),
  },
  {
    id: 'storage-security-retention',
    title: 'Data Storage, Security & Retention',
    content: (
      <>
        <p>
          We apply reasonable technical and organisational measures —
          encryption in transit, hashed passwords, access controls, and
          monitored infrastructure — to protect your data against unauthorised
          access, disclosure, or misuse. No online platform can guarantee
          absolute security, but we work continuously to reduce risk.
        </p>
        <h3>How long we keep data</h3>
        <ul className="legal-list">
          <li><b>Account &amp; performance records</b> — kept while your account is active and for a reasonable period afterward for legal and academic-integrity purposes.</li>
          <li><b>Payment records</b> — retained as long as required by tax and accounting law.</li>
          <li><b>Proctoring recordings</b> — retained only as long as needed to resolve integrity reviews and disputes, then deleted or anonymised.</li>
        </ul>
        <p>
          When data is no longer needed, we delete or anonymise it.
        </p>
      </>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your Rights & Choices',
    content: (
      <>
        <p>Subject to applicable law, you can:</p>
        <ul className="legal-list">
          <li>Access and review the personal information we hold about you.</li>
          <li>Correct inaccurate account or profile details — most fields are editable from your profile settings.</li>
          <li>Request deletion of your account and associated personal data.</li>
          <li>Opt out of non-essential notifications.</li>
        </ul>
        <p>
          To make a request, contact us using the details below. We may need to
          verify your identity before acting, and some data may be retained where
          law or integrity obligations require it.
        </p>
      </>
    ),
  },
  {
    id: 'student-privacy',
    title: 'Students & Younger Users',
    content: (
      <p>
        RankRush is built for students preparing for competitive examinations.
        If you are under 18, you should use the platform under the supervision of
        a parent or guardian, who is responsible for consenting to this Policy on
        your behalf. If we learn that we have collected data from a child without
        appropriate consent, we will take steps to delete it.
      </p>
    ),
  },
  {
    id: 'third-party',
    title: 'Third-Party Services',
    content: (
      <p>
        RankRush integrates with third-party services such as payment providers
        and analytics tools, and may link to external sites. Their handling of
        your data is governed by their own privacy policies, which we encourage
        you to review. We are not responsible for the independent practices of
        third parties.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    content: (
      <p>
        We may update this Privacy Policy from time to time. When we make
        material changes, we will update the "Last updated" date above and, where
        appropriate, notify you in the app. Continuing to use RankRush after an
        update means you accept the revised Policy.
      </p>
    ),
  },
]

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      eyebrow="Legal · Privacy"
      title="Privacy Policy"
      updated={UPDATED}
      intro="RankRush is a quiz-and-rank platform for NEET, JEE, and other competitive-exam aspirants. This policy explains what we collect, why, and the choices you have. By using RankRush, you agree to the practices described here."
      sections={sections}
      crosslink={{ label: 'Looking for the rules of using the platform? Read our', to: '/terms', linkText: 'Terms & Conditions' }}
    />
  )
}
