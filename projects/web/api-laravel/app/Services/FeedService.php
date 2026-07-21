<?php

namespace App\Services;

use App\Models\SocialPost;
use App\Models\User;
use Illuminate\Support\Collection;

class FeedService
{
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
     * query to avoid an N+1 lookup (one query per post).
     */
    public function formatPosts(Collection $posts): array
    {
        $userIds = $posts->pluck('user_id')->filter()->unique()->values()->all();

        $users = User::whereIn('_id', $userIds)->get()
            ->keyBy(fn (User $user) => (string) $user->_id);

        return $posts
            ->map(fn (SocialPost $post) => $this->formatPost($post, $users->get($post->user_id)))
            ->values()
            ->all();
    }
}
