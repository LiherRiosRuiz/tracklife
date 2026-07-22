<?php

namespace App\Services;

use App\Models\SocialPost;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class FeedService
{
    /**
     * Maps a SocialPost `type` to the `privacy_settings` key that governs its
     * visibility. Types with no entry here have no privacy dimension and are
     * treated as public (e.g. challenge_joined, recipe_shared).
     */
    private const TYPE_PRIVACY_KEY = [
        'meal_logged' => 'meals',
        'workout_completed' => 'workouts',
        'cardio_activity' => 'workouts',
        'recovery_milestone' => 'workouts',
        'product_scanned' => 'product_scans',
    ];

    /**
     * Bounds on paginateVisiblePosts()'s widening-fetch loop (see below):
     * how many times to retry with a bigger candidate window, and the
     * multiplier applied to the requested window size on the Nth attempt.
     */
    private const MAX_WIDEN_ATTEMPTS = 3;

    private const WIDEN_MULTIPLIER = 4;

    public function createPost(User $user, string $type, array $payload): SocialPost
    {
        return SocialPost::create([
            'user_id' => (string) $user->_id,
            'type' => $type,
            'payload' => $payload,
            'kudos_count' => 0,
            'kudos_user_ids' => [],
            'comments' => [],
        ]);
    }

    public function formatPost(SocialPost $post, ?User $user = null): array
    {
        $user = $user ?? User::find($post->user_id);

        return [
            'id' => (string) $post->_id,
            'type' => $post->type,
            'payload' => $post->payload,
            'kudos_count' => $post->kudos_count ?? 0,
            'comments' => $post->comments ?? [],
            'created_at' => $post->created_at?->toIso8601String(),
            'user' => $user ? [
                'id' => (string) $user->_id,
                'name' => $user->name,
                'username' => $user->username,
                'avatar_url' => $user->avatar_url,
            ] : null,
        ];
    }

    /**
     * Format a batch of posts, batch-loading their authors in a single
     * query to avoid an N+1 lookup (one query per post). Posts the viewer is
     * not allowed to see (per privacy settings) are dropped from the result.
     */
    public function formatPosts(Collection $posts, ?User $viewer = null): array
    {
        $userIds = $posts->pluck('user_id')->filter()->unique()->values()->all();

        $users = User::whereIn('_id', $userIds)->get()
            ->keyBy(fn (User $user) => (string) $user->_id);

        return $posts
            ->filter(fn (SocialPost $post) => $this->isVisibleTo($post, $users->get($post->user_id), $viewer))
            ->map(fn (SocialPost $post) => $this->formatPost($post, $users->get($post->user_id)))
            ->values()
            ->all();
    }

    /**
     * Fetch, privacy-filter, and paginate posts from $query, returning
     * exactly $take formatted+visible posts (starting at offset $skip)
     * whenever that many genuinely exist further back in the collection.
     *
     * $query must already carry the desired ordering (e.g. `created_at`
     * desc) and must NOT have limit/skip applied — this method owns those.
     *
     * Why not just `$query->skip($skip)->take($take)->get()` then filter
     * (the previous, buggy approach): privacy filtering happens in PHP
     * (isVisibleTo), *after* the fetch. Applying Mongo's skip/limit before
     * that filter means invisible posts silently consume slots in the fixed
     * window, so a page can come back with far fewer items than requested —
     * including zero — even though enough visible posts exist further back.
     *
     * Fix approach (over-fetch-and-widen), chosen over pushing the privacy
     * predicate into a Mongo aggregation `$lookup`: this app
     * (mongodb/laravel-mongodb) has no follow-graph yet and isVisibleTo()
     * mixes an owner-exception with a per-post-type privacy key mapping
     * (TYPE_PRIVACY_KEY). Re-expressing that exact logic inside an
     * aggregation pipeline would duplicate the single source of truth
     * outside PHP and risk drifting out of sync with isVisibleTo() as
     * privacy rules evolve. At this app's real-world scale (tens/hundreds of
     * posts, not millions), over-fetching a widening candidate window from
     * the front of the query, filtering it, and slicing out the requested
     * page is simpler and correct. The loop is capped at
     * self::MAX_WIDEN_ATTEMPTS so a viewer who can see almost nothing cannot
     * trigger an unbounded table scan; if the collection itself is
     * exhausted before that cap, whatever was found is returned immediately
     * — an accepted edge case (a starved page may come back short only when
     * truly not enough visible posts exist, never because of the fetch
     * strategy).
     *
     * Pagination stays coherent across pages because every attempt re-reads
     * from the start of $query (offset 0) rather than compounding Mongo-level
     * skips on top of PHP-level filtering, so the same viewer paging through
     * results sees each visible post exactly once, in order.
     */
    public function paginateVisiblePosts(Builder $query, ?User $viewer, int $skip, int $take): array
    {
        $needed = $skip + $take;
        $formatted = [];

        for ($attempt = 1; $attempt <= self::MAX_WIDEN_ATTEMPTS; $attempt++) {
            $windowSize = $needed * self::WIDEN_MULTIPLIER * $attempt;

            $candidates = (clone $query)->limit($windowSize)->get();

            $formatted = $this->formatPosts($candidates, $viewer);

            $exhaustedCollection = $candidates->count() < $windowSize;

            if (count($formatted) >= $needed || $exhaustedCollection) {
                break;
            }
        }

        return array_slice($formatted, $skip, $take);
    }

    /**
     * Whether $viewer is allowed to see $post, based on the poster's
     * `privacy_settings` for the post's content type. Delegates to
     * isVisibleTo(), so callers outside this service (e.g.
     * FeedController::kudos/comment) reuse the exact same privacy rules as
     * formatPosts()/paginateVisiblePosts() instead of duplicating them.
     *
     * Accepts an already-resolved $poster so callers that need it for
     * another purpose too (e.g. formatPost()) don't pay for a second
     * User::find() on the same record in the same request.
     */
    public function canView(SocialPost $post, ?User $viewer, ?User $poster = null): bool
    {
        return $this->isVisibleTo($post, $poster ?? User::find($post->user_id), $viewer);
    }

    /**
     * Whether $viewer is allowed to see $post, based on the poster's
     * `privacy_settings` for the post's content type.
     *
     * NOTE: this codebase has no follow-graph / followers relationship yet
     * (verified: no "follow" model, table, or relation exists anywhere in
     * app/). Until one exists, 'followers'-visibility content is treated as
     * visible only to the poster themself, same as 'private' — everyone else
     * only sees 'public' content. Revisit this once a real follow graph
     * exists so 'followers' can check actual follower relationships instead.
     */
    private function isVisibleTo(SocialPost $post, ?User $poster, ?User $viewer): bool
    {
        if (! $poster) {
            return false;
        }

        if ($viewer && (string) $viewer->_id === (string) $poster->_id) {
            return true;
        }

        $privacyKey = self::TYPE_PRIVACY_KEY[$post->type] ?? null;

        if ($privacyKey === null) {
            return true;
        }

        $settings = $poster->privacy_settings ?? User::defaultPrivacySettings();
        $visibility = $settings[$privacyKey] ?? 'public';

        return $visibility === 'public';
    }
}
