<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkoutResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => (string) $this->_id,
            'name'             => $this->name,
            'date'             => $this->date,
            'sets'             => $this->sets,
            'total_volume'     => $this->total_volume,
            'duration_minutes' => $this->duration_minutes,
            'notes'            => $this->notes,
            'shared_to_feed'   => $this->shared_to_feed ?? false,
            'created_at'       => $this->created_at?->toIso8601String(),
        ];
    }
}
