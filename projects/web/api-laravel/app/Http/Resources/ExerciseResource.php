<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExerciseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => (string) $this->_id,
            'name'         => $this->name,
            'muscle_group' => $this->muscle_group,
            'category'     => $this->category,
            'description'  => $this->description,
            'instructions' => $this->instructions,
            'equipment'    => $this->equipment,
        ];
    }
}
