# Auth — Better Auth

Better Auth gère tout : inscription, connexion, session, refresh token.

## Setup

`.env.local` :
```
BETTER_AUTH_URL=https://localhost:3443
BETTER_AUTH_SECRET=une-cle-de-32-caracteres-minimum
```

## Client

```ts
import { authClient } from '@/lib/auth-client';

// Inscription
await authClient.signUp.email({ email, password, name });

// Connexion
await authClient.signIn.email({ email, password });

// Déconnexion
await authClient.signOut();

// Session
const { data } = await authClient.getSession();
if (data?.user) setUser(data.user.name);
```

## Serveur (API routes)

```ts
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
```

## Admin check

Le badge ADMIN est stocké dans `User.badges` (`String[]`). Vérification :

```ts
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { badges: true },
});
if (!user?.badges.includes("ADMIN")) {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Middleware

Next.js middleware dans `frontend/middleware.ts` pour protéger les routes. Les pages `/home`, `/game`, `/characters`, `/social` nécessitent une session valide.
