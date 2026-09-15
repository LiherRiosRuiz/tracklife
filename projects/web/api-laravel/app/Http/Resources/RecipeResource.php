<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Two bugs fixed here before this was ever wired into a controller:
 *  - it emitted `instructions`, which Recipe has no such field for (it is
 *    `steps`), so that key was always null;
 *  - it omitted `description`, which the recipes page actually renders.
 *
 * `user_id`, `is_premium` and `price` stay out: ownership is not the client's
 * business, and no monetization ships pre-launch.
 */
class RecipeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->_id,
            'title' => $this->title,
            'description' => $this->description,
            'ingredients' => $this->ingredients,
            'steps' => $this->steps,
            'servings' => $this->servings,
            'is_public' => (bool) $this->is_public,
            'totals_per_serving' => $this->totals_per_serving,
        ];
    }
}
