<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Same reasoning as ClubResource: a participant COUNT, not the participant list.
 *
 * `leaderboard` is deliberately omitted — it holds user identifiers, nothing in
 * the app reads it today, and a public ranking should be built from display
 * names rather than by shipping raw IDs to every viewer.
 */
class ChallengeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->_id,
            'title' => $this->title,
            'description' => $this->description,
            'type' => $this->type,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
            'is_active' => (bool) $this->is_active,
            'participants_count' => count($this->participant_ids ?? []),
            'is_participant' => in_array(
                (string) $request->user()?->_id,
                array_map('strval', $this->participant_ids ?? []),
                true,
            ),
        ];
    }
}
