<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use MongoDB\BSON\Regex;

class UserSearchController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $q = $request->validate(['q' => 'required|string|min:2'])['q'];

        $pattern = new Regex(preg_quote($q, '/'), 'i');

        $users = User::where(function ($query) use ($pattern) {
            $query->where('name', $pattern)
                ->orWhere('username', $pattern)
                ->orWhere('email', $pattern);
        })
            ->whereKeyNot($request->user()->getKey())
            ->limit(20)
            ->get();

        return response()->json([
            'users' => $users->map(fn (User $u) => [
                'id' => (string) $u->_id,
                'name' => $u->name,
                'username' => $u->username,
                'bio' => $u->bio,
                'avatar_url' => $u->avatar_url,
                'streak_days' => $u->streak_days ?? 0,
            ])->values(),
        ]);
    }
}
