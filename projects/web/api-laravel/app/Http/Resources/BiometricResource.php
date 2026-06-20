<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BiometricResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'        => (string) $this->_id,
            'type'      => $this->type,
            'value'     => $this->value,
            'unit'      => $this->unit,
            'timestamp' => $this->timestamp instanceof \Carbon\Carbon
                ? $this->timestamp->toIso8601String()
                : $this->timestamp,
            'source'    => $this->source,
        ];
    }
}
