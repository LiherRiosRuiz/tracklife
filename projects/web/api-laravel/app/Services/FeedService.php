<?php

namespace App\Services;

use App\Models\SocialPost;
use App\Models\User;
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
