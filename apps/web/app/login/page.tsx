import { redirect } from "next/navigation";

import { getSession } from "../../lib/auth/session";

interface LoginPageProperties {
  readonly searchParams: Promise<
    Readonly<Record<string, string | string[] | undefined>>
  >;
}

export default async function LoginPage({
  searchParams,
}: LoginPageProperties): Promise<React.JSX.Element> {
  if ((await getSession()) !== undefined) {
    redirect("/");
  }

  const parameters = await searchParams;
  const hasError = parameters.error !== undefined;

  return (
    <main className="login">
      <section className="login__panel">
        <span className="brand__mark" aria-hidden>
          A
        </span>
        <p className="eyebrow">Governed automation operations</p>
        <h1>Automation Control Plane</h1>
        <p className="login__intro">
          Sign in through the configured identity provider. Permissions are
          enforced again by the control-plane API for every protected action.
        </p>
        {hasError ? (
          <p className="login__error" role="alert">
            Authentication could not be completed. Start a new sign-in attempt.
          </p>
        ) : null}
        <a className="login__button" href="/api/auth/login">
          Sign in with Keycloak
        </a>
        <p className="login__boundary">
          Local accounts and records are synthetic demonstration data.
        </p>
      </section>
    </main>
  );
}
