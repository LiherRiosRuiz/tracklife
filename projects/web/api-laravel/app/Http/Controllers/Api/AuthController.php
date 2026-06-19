<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:255',
            'password' => 'required|string|min:8',
            'username' => 'nullable|string|max:60',
        ]);

        if (User::where('email', $data['email'])->exists()) {
            throw ValidationException::withMessages(['email' => ['El email ya está registrado.']]);
        }

        $username = $data['username'] ?? Str::slug(Str::before($data['email'], '@'));

        if (User::where('username', $username)->exists()) {
            $username .= '-'.Str::lower(Str::random(4));
        }

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'username' => $username,
            'password' => $data['password'],
            'macro_targets' => User::defaultMacroTargets(),
            'privacy_settings' => User::defaultPrivacySettings(),
            'streak_days' => 0,
        ]);

        $token = $user->createToken('tracklife')->plainTextToken;

        return response()->json([
            'user' => $this->formatUser($user),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => ['Credenciales incorrectas.']]);
        }

        $token = $user->createToken('tracklife')->plainTextToken;

        return response()->json([
            'user' => $this->formatUser($user),
            'token' => $token,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->formatUser($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Sesión cerrada']);
    }

    private function formatUser(User $user): array
    {
        return [
            'id' => (string) $user->_id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'bio' => $user->bio,
            'avatar_url' => $user->avatar_url,
            'streak_days' => $user->streak_days ?? 0,
            'macro_targets' => $user->macro_targets ?? User::defaultMacroTargets(),
            'transformation_goal' => $user->transformation_goal,
            'privacy_settings' => $user->privacy_settings ?? User::defaultPrivacySettings(),
        ];
    }
}
