import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { AdaptiveLayout } from '@/components/layouts/AdaptiveLayout';
import logo from '@/assets/logo.svg';

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  const handleClose = () => {
    // When opened in a new tab from the auth pages, closing makes sense.
    // window.close() is a no-op for tabs the script didn't open, so we fall
    // back to history navigation or the auth page.
    window.close();
    if (window.history.length > 1) {
      window.history.back();
    }
  };

  return (
    <AdaptiveLayout>
      <div className="min-h-screen bg-gradient-subtle">
        <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-3">
            <Link to="/auth" className="flex items-center gap-2">
              <img src={logo} alt="TalkSpree" className="h-5" />
            </Link>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-10">
          <div className="mb-6 rounded-md border border-yellow-400/50 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 text-sm text-yellow-900 dark:text-yellow-100">
            <strong>Draft notice:</strong> This is a placeholder pending review
            by legal counsel. It is provided in good faith but should not be
            relied upon as final terms.
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: {lastUpdated}
          </p>

          <article
            className="mt-8 space-y-6 text-[15px] leading-7 text-foreground/90
              [&_h2]:mt-10 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight
              [&_h3]:mt-6 [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-semibold
              [&_p]:my-3
              [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul_li]:my-1
              [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol_li]:my-1
              [&_a]:text-primary [&_a]:underline hover:[&_a]:text-primary-glow
              [&_table]:w-full [&_table]:my-4 [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:bg-muted/50 [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top"
          >
            {children}
          </article>

          <div className="mt-12 border-t border-border/50 pt-6">
            <Link
              to="/auth"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-smooth"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to sign in
            </Link>
          </div>
        </main>
      </div>
    </AdaptiveLayout>
  );
}
