<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RecipeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => (string) $this->_id,
            'title'              => $this->title,
            'ingredients'        => $this->ingredients,
            'instructions'       => $this->instructions,
            'servings'           => $this->servings,
            'totals_per_serving' => $this->totals_per_serving,
        ];
    }
}
