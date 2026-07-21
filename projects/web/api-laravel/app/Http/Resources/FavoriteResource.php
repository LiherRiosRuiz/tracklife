<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FavoriteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => (string) $this->_id,
            'type'       => $this->type,
            'ref'        => $this->ref,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
