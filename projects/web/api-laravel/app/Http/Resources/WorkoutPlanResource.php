<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkoutPlanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => (string) $this->_id,
            'name'         => $this->name,
            'description'  => $this->description,
            'days_per_week' => $this->days_per_week,
            'exercises'    => $this->exercises,
        ];
    }
}
