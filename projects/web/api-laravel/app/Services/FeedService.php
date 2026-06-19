<?php

namespace App\Services;

use App\Models\SocialPost;
use App\Models\User;

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

    public function formatPost(SocialPost $post): array
    {
        $user = User::find($post->user_id);

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
}
