"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type FeedPost } from "@/lib/api";
import { Button, Card, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonList } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

// TODO backend: implementar GET /api/users/search?q= para búsqueda real.
// Por ahora la búsqueda es client-side sobre los usuarios del feed.
// Solo encuentra usuarios que han posteado recientemente.

type FeedUser = NonNullable<FeedPost["user"]>;

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function UserCard({ user }: { user: FeedUser }) {
  const initials = getInitials(user.name);

  return (
    <Card className="flex items-center gap-4">
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.name}
          className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{user.name}</p>
        <p className="truncate text-sm text-muted">@{user.username}</p>
      </div>
      <Button href={`/app/comunidad/perfil/${user.id}`} variant="secondary" className="flex-shrink-0">
        Ver perfil
      </Button>
    </Card>
  );
}

function EmptyState({ query }: { query: string }) {
  if (query.length < 2) {
    return (
      <div className="py-12 text-center text-muted">
        <p className="text-4xl mb-3">&#128270;</p>
        <p className="text-sm">Escribe al menos 2 caracteres para buscar.</p>
      </div>
    );
  }
  return (
    <div className="py-12 text-center text-muted">
      <p className="text-4xl mb-3">&#128531;</p>
      <p className="font-medium">Sin resultados para &ldquo;{query}&rdquo;</p>
      <p className="mt-1 text-sm">Prueba con otro nombre o username.</p>
    </div>
  );
}

export default function BuscarPage() {
  const { data, loading, error, refetch } = useApiData(
    () => api.feed(),
    [],
  );

  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState("");

  // Debounce 300ms: actualiza `query` 300ms después del último keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(inputValue.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Usuarios únicos del feed (deduplicados por id)
  const allUsers = useMemo<FeedUser[]>(() => {
    const posts: FeedPost[] = data?.feed ?? [];
    const seen = new Set<string>();
    const users: FeedUser[] = [];
    for (const post of posts) {
      if (post.user && !seen.has(post.user.id)) {
        seen.add(post.user.id);
        users.push(post.user);
      }
    }
    return users;
  }, [data]);

  // Filtrado por nombre o username (solo si hay ≥2 caracteres)
  const results = useMemo<FeedUser[]>(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return allUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q),
    );
  }, [query, allUsers]);

  const showInitial = query.length < 2;
  const showResults = query.length >= 2;

  return (
    <div>
      <PageHeader title="Buscar" subtitle="Personas en la comunidad" />

      {/* Barra de búsqueda */}
      <div className="mb-6 relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          &#128270;
        </span>
        <input
          type="search"
          placeholder="Buscar por nombre o @username..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Estados de carga / error del feed */}
      {loading && <SkeletonList />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {/* Contenido principal */}
      {!loading && !error && (
        <>
          {showInitial && (
            <>
              {allUsers.length > 0 ? (
                <>
                  <p className="mb-3 text-sm text-muted">Activos recientemente</p>
                  <div className="flex flex-col gap-3">
                    {allUsers.map((user) => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-muted">
                  <p className="text-sm">No hay usuarios en el feed todavía.</p>
                </div>
              )}
            </>
          )}

          {showResults && (
            <>
              {results.length > 0 ? (
                <>
                  <p className="mb-3 text-sm text-muted">
                    {results.length} resultado{results.length !== 1 ? "s" : ""} para &ldquo;{query}&rdquo;
                  </p>
                  <div className="flex flex-col gap-3">
                    {results.map((user) => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState query={query} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
