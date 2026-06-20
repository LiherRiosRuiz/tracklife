<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MealResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => (string) $this->_id,
            'meal_type'      => $this->meal_type,
            'date'           => $this->date,
            'items'          => $this->items,
            'totals'         => $this->totals,
            'photo_url'      => $this->photo_url,
            'notes'          => $this->notes,
            'shared_to_feed' => $this->shared_to_feed ?? false,
            'created_at'     => $this->created_at?->toIso8601String(),
        ];
    }
}
