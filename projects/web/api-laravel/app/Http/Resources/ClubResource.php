<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Exposes a member COUNT, never the member list.
 *
 * `member_ids` is a list of user ObjectIds. The clubs page only ever rendered
 * `member_ids.length`, so shipping the raw array let any viewer enumerate the
 * full membership of every club to render a single number. `owner_id` is hidden
 * for the same reason.
 */
class ClubResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->_id,
            'name' => $this->name,
            'description' => $this->description,
            'is_public' => (bool) $this->is_public,
            'cover_url' => $this->cover_url,
            'members_count' => count($this->member_ids ?? []),
            // Lets the UI show join state without exposing who else is a member.
            'is_member' => in_array(
                (string) $request->user()?->_id,
                array_map('strval', $this->member_ids ?? []),
                true,
            ),
        ];
    }
}
