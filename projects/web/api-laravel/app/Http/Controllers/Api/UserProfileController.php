<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserProfileController extends Controller
{
    public function show(string $id): JsonResponse
    {
        $user = User::findOrFail($id);

        return response()->json([
            'user' => [
                'id' => (string) $user->_id,
                'name' => $user->name,
                'username' => $user->username,
                'bio' => $user->bio,
                'avatar_url' => $user->avatar_url,
                'streak_days' => $user->streak_days ?? 0,
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'bio' => 'nullable|string|max:500',
            'avatar_url' => 'nullable|string',
            'transformation_goal' => 'nullable|array',
            'privacy_settings' => 'nullable|array',
        ]);

        $user = $request->user();
        $user->update($data);

        return response()->json(['user' => $user->fresh()]);
    }
}
