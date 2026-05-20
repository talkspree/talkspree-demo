import { Link } from 'react-router-dom';
import { LegalPage } from '@/components/legal/LegalPage';

export default function Cookies() {
  return (
    <LegalPage title="Cookie Policy" lastUpdated="2026-05-20">
      <p>
        This Cookie Policy explains how TalkSpree (operated by{' '}
        <strong>[TODO: legal entity]</strong>) uses cookies and similar
        technologies when you visit our website or use our mobile applications
        (the "Service"). It should be read together with our{' '}
        <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>1. What Are Cookies?</h2>
      <p>
        Cookies are small text files placed on your device by a website. They
        are widely used to make websites work, to make them work more
        efficiently, and to provide information to the operators of the site.
        Similar technologies include local storage, session storage, and
        pixel tags.
      </p>
      <p>
        Note: TalkSpree primarily stores its authentication session using your
        browser's <strong>local storage</strong> rather than HTTP cookies.
        Local storage is not technically a cookie, but it serves a similar
        purpose and is covered by this Policy for transparency.
      </p>

      <h2>2. Types of Cookies and Storage We Use</h2>
      <h3>2.1 Strictly necessary</h3>
      <p>
        These are required for the Service to function and cannot be turned
        off. They handle things like keeping you signed in, remembering
        whether you have accepted cookies, and maintaining the security of
        your session.
      </p>

      <h3>2.2 Functional</h3>
      <p>
        These remember choices you make to give you a better experience —
        for example, your preferred language or theme. Without them some
        features may not work correctly.
      </p>

      <h3>2.3 Analytics</h3>
      <p>
        These help us understand how the Service is being used so we can
        improve it. We use aggregated and pseudonymised data wherever
        possible. Analytics cookies are only set if you give your consent
        where required by law.
      </p>

      <h2>3. Specific Items We Use</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Purpose</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>sb-*-auth-token</code>
            </td>
            <td>Local storage (strictly necessary)</td>
            <td>
              Stores your Supabase authentication session so you stay signed
              in across page reloads.
            </td>
            <td>Until you sign out or it expires</td>
          </tr>
          <tr>
            <td>
              <code>talkspree-pending-affiliate</code>
            </td>
            <td>Local storage (strictly necessary)</td>
            <td>
              Remembers a personal invite link you clicked, so the
              referring user can be credited after you sign up.
            </td>
            <td>Up to 7 days, or until consumed at signup</td>
          </tr>
          <tr>
            <td>
              <code>theme</code>
            </td>
            <td>Local storage (functional)</td>
            <td>Remembers your selected light or dark theme.</td>
            <td>Until you change it</td>
          </tr>
          <tr>
            <td>
              <strong>[TODO: analytics]</strong>
            </td>
            <td>Cookie (analytics)</td>
            <td>
              Anonymous analytics about feature usage and performance, set
              only with your consent.
            </td>
            <td>Up to 13 months</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Third-Party Cookies</h2>
      <p>
        Some parts of the Service rely on third-party providers that may set
        their own cookies or use similar technologies:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — authentication and database
          (strictly necessary).
        </li>
        <li>
          <strong>Agora</strong> — real-time voice and video
          (strictly necessary during calls).
        </li>
        <li>
          <strong>Google</strong> — if you choose to sign in with Google,
          Google may set cookies on its own domain in accordance with its
          privacy policy.
        </li>
      </ul>
      <p>
        We do not control these third-party cookies. Please review the
        respective providers' privacy and cookie policies for details.
      </p>

      <h2>5. Managing Cookies</h2>
      <p>
        You can manage cookies in several ways:
      </p>
      <ul>
        <li>
          <strong>In your browser:</strong> most browsers let you view, block,
          and delete cookies from the settings menu. Note that blocking
          strictly necessary cookies will break the Service — for example, you
          will not be able to stay signed in.
        </li>
        <li>
          <strong>Clearing local storage:</strong> you can clear TalkSpree's
          local storage entries from your browser's developer tools or
          privacy settings.
        </li>
        <li>
          <strong>Do Not Track:</strong> some browsers send a "Do Not Track"
          signal. There is no consistent industry standard for how to respond
          to it; we currently do not change our behaviour based on this
          signal.
        </li>
      </ul>

      <h2>6. Changes to this Policy</h2>
      <p>
        We may update this Cookie Policy from time to time. The "Last
        updated" date at the top reflects the most recent version. If we
        make material changes we will notify you within the Service.
      </p>

      <h2>7. Contact</h2>
      <p>
        Questions about this Cookie Policy? Reach us at{' '}
        <strong>[TODO: privacy email]</strong>.
      </p>
    </LegalPage>
  );
}
