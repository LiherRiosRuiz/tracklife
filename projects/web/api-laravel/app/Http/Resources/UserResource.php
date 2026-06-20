<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => (string) $this->_id,
            'name'                => $this->name,
            'username'            => $this->username,
            'email'               => $this->email,
            'bio'                 => $this->bio,
            'avatar_url'          => $this->avatar_url,
            'streak_days'         => $this->streak_days ?? 0,
            'macro_targets'       => $this->macro_targets ?? User::defaultMacroTargets(),
            'transformation_goal' => $this->transformation_goal,
            'privacy_settings'    => $this->privacy_settings ?? User::defaultPrivacySettings(),
        ];
    }
}
