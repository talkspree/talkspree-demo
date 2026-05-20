import { Link } from 'react-router-dom';
import { LegalPage } from '@/components/legal/LegalPage';

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="2026-05-20">
      <p>
        This Privacy Policy explains how <strong>[TODO: legal entity]</strong>{' '}
        ("TalkSpree", "we", "our", or "us") collects, uses, shares, and
        protects information about you when you use the TalkSpree website,
        mobile applications, and related services (the "Service").
      </p>
      <p>
        We are the data controller for personal data processed in connection
        with your TalkSpree account. You can reach our Data Protection
        contact at <strong>[TODO: privacy email]</strong>.
      </p>

      <h2>1. Scope</h2>
      <p>
        This Policy applies to personal data we collect about you when you
        create an account, set up your profile, take part in calls and
        circles, send messages, or otherwise interact with the Service. It
        does not apply to third-party websites or services that are linked
        from the Service.
      </p>

      <h2>2. Information We Collect</h2>
      <h3>2.1 Information you provide</h3>
      <ul>
        <li>
          <strong>Account information:</strong> email address, password
          (stored hashed), and authentication provider (e.g. Google).
        </li>
        <li>
          <strong>Profile information:</strong> first and last name, date of
          birth, gender, location, occupation, biography, phone number (if
          provided), profile picture, role (mentor, mentee, alumni), and
          related details you choose to add.
        </li>
        <li>
          <strong>Content you share:</strong> messages, posts in circles,
          social links, interests, and any other content you create within
          the Service.
        </li>
      </ul>

      <h3>2.2 Information we collect automatically</h3>
      <ul>
        <li>
          <strong>Device and log data:</strong> IP address, browser type and
          version, device identifiers, operating system, language settings,
          and the pages or features you interact with.
        </li>
        <li>
          <strong>Usage data:</strong> session duration, number of calls,
          call participants, time and date stamps, online status, and similar
          telemetry needed to operate the Service.
        </li>
        <li>
          <strong>Cookies and similar technologies:</strong> see our{' '}
          <Link to="/cookies">Cookie Policy</Link>.
        </li>
      </ul>

      <h3>2.3 Calls and recordings</h3>
      <p>
        TalkSpree facilitates real-time voice and video conversations. We
        process call signalling data (who is calling whom, when, and for how
        long) so that calls can be set up and quality monitored. We do
        <strong> not </strong> record the audio or video content of your
        calls unless a feature explicitly states otherwise and you give your
        consent on a per-call basis.
      </p>

      <h2>3. How We Use Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>provide, maintain, and improve the Service;</li>
        <li>create and manage your account and authenticate you;</li>
        <li>
          match you with other users, route calls, and deliver messages and
          notifications;
        </li>
        <li>
          enforce our <Link to="/terms">Terms of Use</Link>, prevent abuse,
          and protect the security of the Service and our users;
        </li>
        <li>
          analyse how the Service is used so we can improve features and
          performance;
        </li>
        <li>
          communicate with you about your account, important changes, and
          (with your consent where required) product updates.
        </li>
      </ul>

      <h2>4. Legal Bases (EEA / UK)</h2>
      <p>
        Where the GDPR or UK GDPR applies, we rely on the following legal
        bases to process your personal data:
      </p>
      <ul>
        <li>
          <strong>Performance of a contract</strong> — to provide the Service
          you have signed up for.
        </li>
        <li>
          <strong>Legitimate interests</strong> — to keep the Service secure,
          prevent fraud and abuse, and improve our product. We balance these
          interests against your rights and freedoms.
        </li>
        <li>
          <strong>Consent</strong> — for optional cookies, marketing
          communications, and any processing that the law requires consent
          for. You can withdraw consent at any time.
        </li>
        <li>
          <strong>Legal obligation</strong> — to comply with applicable laws
          and respond to lawful requests from authorities.
        </li>
      </ul>

      <h2>5. Sharing and Disclosure</h2>
      <p>We share personal data only as described below.</p>
      <ul>
        <li>
          <strong>With other users:</strong> your profile information and the
          content you share within the Service is visible to other users
          according to your privacy settings.
        </li>
        <li>
          <strong>Service providers:</strong> we use trusted vendors to
          operate the Service, including cloud hosting (Supabase),
          real-time communications (Agora), and analytics. They process data
          on our behalf under written agreements.
        </li>
        <li>
          <strong>Legal and safety:</strong> we may disclose information if
          required by law, legal process, or governmental request, or where
          we believe disclosure is necessary to protect our rights, your
          safety, or the safety of others.
        </li>
        <li>
          <strong>Business transfers:</strong> in connection with a merger,
          acquisition, financing, or sale of assets, personal data may be
          transferred subject to standard confidentiality terms.
        </li>
      </ul>
      <p>
        We do not sell your personal data, and we do not share it with third
        parties for their own direct marketing purposes.
      </p>

      <h2>6. International Transfers</h2>
      <p>
        TalkSpree may transfer, store, and process your information in
        countries other than the one in which you live. Where we transfer
        personal data outside the European Economic Area, the United Kingdom,
        or other regulated jurisdictions, we use appropriate safeguards such
        as Standard Contractual Clauses approved by the European Commission.
      </p>

      <h2>7. Data Retention</h2>
      <p>
        We keep your personal data only for as long as necessary for the
        purposes described in this Policy. Account data is retained while
        your account is active. Call signalling and chat metadata are kept
        for a limited period to enable troubleshooting and safety
        investigations, and then deleted or anonymised. If you delete your
        account, we will delete or anonymise your personal data within a
        reasonable period, except where retention is required by law.
      </p>

      <h2>8. Your Rights</h2>
      <p>
        Depending on where you live, you may have the following rights
        regarding your personal data:
      </p>
      <ul>
        <li>access the personal data we hold about you;</li>
        <li>correct inaccurate or incomplete data;</li>
        <li>
          delete your data (the "right to be forgotten"), subject to legal
          exceptions;
        </li>
        <li>restrict or object to certain processing;</li>
        <li>
          receive your data in a portable format, where technically
          feasible;
        </li>
        <li>withdraw consent where processing is based on consent.</li>
      </ul>
      <p>
        You can exercise most of these rights from your account settings.
        For other requests, contact us at{' '}
        <strong>[TODO: privacy email]</strong>. You also have the right to
        lodge a complaint with your local data protection authority.
      </p>

      <h2>9. Children's Privacy</h2>
      <p>
        The Service is not directed to children under 16, and we do not
        knowingly collect personal data from anyone under that age. If you
        believe a child has provided personal data to us, please contact us
        and we will take appropriate steps to delete it.
      </p>

      <h2>10. Security</h2>
      <p>
        We implement technical and organisational measures designed to
        protect your personal data, including encryption in transit,
        password hashing, access controls, and regular security reviews. No
        method of transmission or storage is perfectly secure, however, and
        we cannot guarantee absolute security.
      </p>

      <h2>11. Changes to this Policy</h2>
      <p>
        We may update this Policy from time to time. If we make material
        changes, we will notify you by email or by a prominent notice
        within the Service before the changes take effect.
      </p>

      <h2>12. Contact</h2>
      <p>
        If you have questions about this Privacy Policy or our practices,
        contact us at <strong>[TODO: privacy email]</strong>.
      </p>
    </LegalPage>
  );
}
