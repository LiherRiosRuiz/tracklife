<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Had both failure modes at once, and this Resource is used by the exercise
 * list, so the damage was app-wide:
 *
 *  - it emitted `description`, a field Exercise has no such column for, so that
 *    key was always null;
 *  - it omitted `image_url`, `muscles_primary`, `muscles_secondary`, `force` and
 *    `level`, every one of which the UI renders. The image guards
 *    (`{e.image_url && <Image …>}`) simply never fired, so exercise thumbnails
 *    have never displayed anywhere in the app.
 *
 * `is_custom` is exposed so the client can offer editing only where the API
 * would actually allow it (ExerciseController@update requires is_custom AND
 * ownership). `user_id` stays out.
 */
class ExerciseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->_id,
            'name' => $this->name,
            'muscle_group' => $this->muscle_group,
            'equipment' => $this->equipment,
            'category' => $this->category,
            'instructions' => $this->instructions,
            'tips' => $this->tips,
            'image_url' => $this->image_url,
            'muscles_primary' => $this->muscles_primary,
            'muscles_secondary' => $this->muscles_secondary,
            'force' => $this->force,
            'level' => $this->level,
            'is_custom' => (bool) $this->is_custom,
        ];
    }
}
