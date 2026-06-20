<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => (string) $this->_id,
            'type'             => $this->type,
            'title'            => $this->title,
            'date'             => $this->date,
            'duration_minutes' => $this->duration_minutes,
            'distance_km'      => $this->distance_km,
            'calories'         => $this->calories,
            'notes'            => $this->notes,
            'source'           => $this->source,
            'shared_to_feed'   => $this->shared_to_feed ?? false,
        ];
    }
}
